/*
  Cameras: turning the URL someone typed into something a browser can show.

    rtsp      Browsers cannot decode RTSP. The server registers the camera
              with MediaMTX (docker-compose.yml), which re-publishes it as
              WebRTC, and the browser shows MediaMTX's player page.
    mjpeg     Relayed through this server. The browser gets a short-lived
    snapshot  token URL, never the camera's address or password, and an
              http camera still works on an https dashboard.
    hls       Played by the browser straight from the camera or NVR.
    video
    page      The camera's own web viewer, shown in a frame.

  Camera passwords in a URL (rtsp://user:pass@host/...) are only ever shown
  to people who manage the facility.
*/
const jwt = require("jsonwebtoken");
const { Readable } = require("stream");
const { jwtSecret, mediamtx } = require("../config/env");
const { CAMERA_FORMATS, CAMERA_ROLES } = require("../models/Polyhouse");

const ROLE_LABELS = {
  room: "Room camera",
  rgb: "RGB camera",
  thermal: "Thermal camera",
  multispectral: "Multispectral camera",
};

const ALL_ROLES = Object.keys(ROLE_LABELS);
const FEED_TOKEN_TTL = "15m";
const CONNECT_TIMEOUT_MS = 8000;
const MAX_FRAME_BYTES = 15 * 1024 * 1024;

// ---------------------------------------------------------------- formats

function detectFormat(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return null;
  if (/^rtsps?:\/\//.test(u)) return "rtsp";
  const path = u.split(/[?#]/)[0];
  if (path.endsWith(".m3u8")) return "hls";
  if (/\.(mp4|webm|ogg|ogv|mov)$/.test(path)) return "video";
  if (/(mjpe?g|video\.cgi|videostream\.cgi|faststream|action=stream|\/stream$)/.test(u)) return "mjpeg";
  if (/\.(jpe?g|png|bmp)$/.test(path) || /(snapshot|snap\.cgi|image\.cgi|still|picture|action=snapshot)/.test(u)) {
    return "snapshot";
  }
  return "page";
}

const formatOf = (camera) =>
  camera?.format && camera.format !== "auto" ? camera.format : detectFormat(camera?.url);

const PROTOCOLS = {
  rtsp: ["rtsp:", "rtsps:"],
  default: ["http:", "https:"],
};

// Checks one camera from a form. Returns { value } or { error }.
// An empty URL clears the slot.
function cleanCamera(input, roleLabel) {
  if (!input || typeof input !== "object") return { value: undefined };
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const snapshotUrl = typeof input.snapshotUrl === "string" ? input.snapshotUrl.trim() : "";
  const format = CAMERA_FORMATS.includes(input.format) ? input.format : "auto";
  if (!url) return { value: null };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: `${roleLabel}: "${url}" is not a valid URL` };
  }
  const resolved = format === "auto" ? detectFormat(url) : format;
  const allowed = resolved === "rtsp" ? PROTOCOLS.rtsp : PROTOCOLS.default;
  if (!allowed.includes(parsed.protocol)) {
    return {
      error:
        resolved === "rtsp"
          ? `${roleLabel}: an RTSP camera needs an rtsp:// URL`
          : `${roleLabel}: use an http:// or https:// URL, or choose RTSP for an rtsp:// stream`,
    };
  }
  if (snapshotUrl) {
    try {
      if (!PROTOCOLS.default.includes(new URL(snapshotUrl).protocol)) throw new Error();
    } catch {
      return { error: `${roleLabel}: the snapshot URL must be an http:// or https:// image URL` };
    }
  }
  return { value: { url, format, snapshotUrl } };
}

// The camera slots this facility actually has filled in.
function configured(facility) {
  const roles = CAMERA_ROLES[facility?.type] || [];
  return roles.filter((role) => facility?.cameras?.[role]?.url);
}

// What people with view access may see of a facility's cameras: never the
// URL itself, which can carry the camera's password.
function redact(facility) {
  if (!facility?.cameras) return facility;
  const cameras = {};
  for (const [role, cam] of Object.entries(facility.cameras)) {
    if (cam?.url) cameras[role] = { format: formatOf(cam), hasSnapshot: Boolean(cam.snapshotUrl) };
  }
  return { ...facility, cameras };
}

// ---------------------------------------------------------------- MediaMTX

const pathName = (facilityId, role) => `polyhouse-${facilityId}-${role}`;

async function mtx(method, path, body) {
  if (!mediamtx.api) throw new Error("MEDIAMTX_API is not set");
  const headers = { "Content-Type": "application/json" };
  if (mediamtx.user) {
    headers.Authorization = `Basic ${Buffer.from(`${mediamtx.user}:${mediamtx.pass}`).toString("base64")}`;
  }
  const res = await fetch(`${mediamtx.api}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(`MediaMTX ${method} ${path} -> ${res.status} ${text}`.trim());
    error.status = res.status;
    throw error;
  }
  return res.status === 200 ? res.json().catch(() => null) : null;
}

// Adds the path, or updates it when it already exists.
async function upsertPath(name, source) {
  // sourceOnDemand: MediaMTX only pulls from the camera while someone watches.
  const conf = { source, sourceOnDemand: true, rtspTransport: "tcp" };
  try {
    await mtx("POST", `/v3/config/paths/add/${name}`, conf);
  } catch (error) {
    if (error.status !== 400) throw error; // 400 = already exists
    await mtx("PATCH", `/v3/config/paths/patch/${name}`, conf);
  }
}

async function deletePath(name) {
  try {
    await mtx("DELETE", `/v3/config/paths/delete/${name}`);
  } catch (error) {
    if (error.status !== 404 && error.status !== 400) throw error;
  }
}

// Brings MediaMTX in line with one facility. Never throws: a gateway that
// is down must not stop a facility being saved.
async function syncFacility(facility, { removed = false } = {}) {
  if (!mediamtx.api || !facility) return { ok: true, skipped: true };
  const id = String(facility._id);
  try {
    for (const role of ALL_ROLES) {
      const cam = facility.cameras?.[role];
      const wanted = !removed && (CAMERA_ROLES[facility.type] || []).includes(role) && cam?.url && formatOf(cam) === "rtsp";
      if (wanted) await upsertPath(pathName(id, role), cam.url);
      else await deletePath(pathName(id, role));
    }
    return { ok: true };
  } catch (error) {
    console.warn(`[cameras] could not update the RTSP gateway: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

// Every RTSP camera, re-registered. MediaMTX keeps API changes in memory
// only, so this runs at start-up and every few minutes to cover a gateway
// restart. Paths for deleted cameras are removed.
async function syncAll(Polyhouse) {
  if (!mediamtx.api) return;
  try {
    const facilities = await Polyhouse.find({ cameras: { $exists: true } }).select("type cameras").lean();
    const wanted = new Map();
    for (const f of facilities) {
      for (const role of configured(f)) {
        if (formatOf(f.cameras[role]) === "rtsp") wanted.set(pathName(f._id, role), f.cameras[role].url);
      }
    }
    const list = await mtx("GET", "/v3/config/paths/list?itemsPerPage=1000");
    const existing = new Map((list?.items || []).map((p) => [p.name, p.source]));
    for (const [name, source] of wanted) {
      if (existing.get(name) !== source) await upsertPath(name, source);
    }
    for (const name of existing.keys()) {
      if (name.startsWith("polyhouse-") && !wanted.has(name)) await deletePath(name);
    }
    if (syncAll.failing) console.log("[cameras] RTSP gateway reachable again");
    syncAll.failing = false;
    return { ok: true, cameras: wanted.size };
  } catch (error) {
    // Logged once per failure streak, not every few minutes.
    if (!syncAll.failing) console.warn(`[cameras] RTSP gateway not reachable (${error.message}). RTSP cameras will not play until it is.`);
    syncAll.failing = true;
    return { ok: false, error: error.message };
  }
}

// ---------------------------------------------------------------- playing

const feedToken = (facilityId, role) =>
  jwt.sign({ typ: "cam", f: String(facilityId), r: role }, jwtSecret, { expiresIn: FEED_TOKEN_TTL });

function readFeedToken(token) {
  const payload = jwt.verify(token, jwtSecret);
  if (payload.typ !== "cam") throw new Error("not a camera token");
  return payload;
}

// The public address of MediaMTX's WebRTC player. Defaults to the host the
// browser used to reach this API, on MediaMTX's port 8889.
function webrtcBase(req) {
  if (mediamtx.webrtc) return mediamtx.webrtc;
  return `${req.protocol}://${req.hostname}:8889`;
}

// What the browser needs to show one camera.
function playInfo(facility, role, req) {
  const cam = facility.cameras[role];
  const format = formatOf(cam);
  const base = { role, label: ROLE_LABELS[role], format, canAnalyse: Boolean(cam.snapshotUrl) || ["mjpeg", "snapshot"].includes(format) };

  switch (format) {
    case "rtsp":
      if (!mediamtx.api) {
        return { ...base, kind: "unavailable", message: "RTSP needs the MediaMTX gateway. Start it with docker compose and set MEDIAMTX_API in server/.env." };
      }
      return { ...base, kind: "iframe", url: `${webrtcBase(req)}/${pathName(facility._id, role)}` };
    case "mjpeg":
      return { ...base, kind: "img", url: `/api/camera-feed/${feedToken(facility._id, role)}` };
    case "snapshot":
      return { ...base, kind: "img", refreshMs: 5000, url: `/api/camera-feed/${feedToken(facility._id, role)}` };
    case "hls":
      return { ...base, kind: "hls", url: cam.url };
    case "video":
      return { ...base, kind: "video", url: cam.url };
    default:
      return { ...base, kind: "iframe", url: cam.url };
  }
}

// ---------------------------------------------------------------- upstream

// Node's fetch refuses URLs with a user:password part, so the credentials
// move into a Basic auth header. (Cameras that insist on Digest auth need a
// snapshot URL without a password, or the RTSP route.)
function upstreamRequest(url) {
  const parsed = new URL(url);
  const headers = { "User-Agent": "polyhouse-camera-relay" };
  if (parsed.username || parsed.password) {
    const user = decodeURIComponent(parsed.username);
    const pass = decodeURIComponent(parsed.password);
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    parsed.username = "";
    parsed.password = "";
  }
  return { href: parsed.href, headers };
}

async function openUpstream(url, signal) {
  const { href, headers } = upstreamRequest(url);
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), CONNECT_TIMEOUT_MS);
  const onAbort = () => timer.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(href, { headers, signal: timer.signal, redirect: "follow" });
    return { res, cancel: () => timer.abort() };
  } catch (error) {
    throw new Error(timer.signal.aborted ? "the camera did not answer within 8 s" : `could not reach the camera (${error.cause?.code || error.message})`);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

// Streams one camera's MJPEG or snapshot to `res`.
async function relay(facility, role, res) {
  const cam = facility?.cameras?.[role];
  const format = formatOf(cam);
  if (!cam?.url || !["mjpeg", "snapshot"].includes(format)) {
    return res.status(404).json({ status: "error", message: "No relayed camera here" });
  }

  // The response closes when the viewer goes away; stop pulling from the
  // camera then. (Not req "close": that fires as soon as a GET is read.)
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  let upstream;
  try {
    upstream = await openUpstream(cam.url, abort.signal);
  } catch (error) {
    return res.status(502).json({ status: "error", message: `Camera: ${error.message}` });
  }
  const { res: up, cancel } = upstream;
  if (!up.ok || !up.body) {
    cancel();
    return res.status(502).json({ status: "error", message: `Camera answered ${up.status}` });
  }

  res.status(200);
  res.setHeader("Content-Type", up.headers.get("content-type") || "image/jpeg");
  res.setHeader("Cache-Control", "no-store");
  const stream = Readable.fromWeb(up.body);
  stream.on("error", () => res.end());
  res.on("close", () => {
    stream.destroy();
    cancel();
  });
  if (res.destroyed) return stream.destroy();
  stream.pipe(res);
}

// One JPEG out of a multipart MJPEG stream: start-of-image to end-of-image.
function firstJpeg(buffer) {
  const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
  if (start < 0) return null;
  const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
  return end < 0 ? null : buffer.subarray(start, end + 2);
}

// A single frame for image analysis.
async function grabFrame(camera) {
  const format = formatOf(camera);
  const url = camera.snapshotUrl || (["mjpeg", "snapshot"].includes(format) ? camera.url : null);
  if (!url) {
    throw Object.assign(new Error("This camera streams video. Add a snapshot URL to it (most IP cameras have one) to grab a frame."), { status: 400 });
  }
  const { res, cancel } = await openUpstream(url);
  try {
    if (!res.ok || !res.body) throw Object.assign(new Error(`Camera answered ${res.status}`), { status: 502 });
    const multipart = /multipart/i.test(res.headers.get("content-type") || "");
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      chunks.push(Buffer.from(chunk));
      size += chunk.length;
      if (multipart) {
        const frame = firstJpeg(Buffer.concat(chunks));
        if (frame) return frame;
      }
      if (size > MAX_FRAME_BYTES) throw Object.assign(new Error("The camera sent more than 15 MB without a complete image"), { status: 502 });
    }
    const body = Buffer.concat(chunks);
    return multipart ? firstJpeg(body) || body : body;
  } finally {
    cancel();
  }
}

module.exports = {
  ROLE_LABELS,
  detectFormat,
  formatOf,
  cleanCamera,
  configured,
  redact,
  syncFacility,
  syncAll,
  playInfo,
  readFeedToken,
  relay,
  grabFrame,
  pathName,
};
