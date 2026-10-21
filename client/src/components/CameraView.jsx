import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, RefreshCw, VideoOff } from "lucide-react";
import { api, apiUrl } from "../lib/api";
import { usePolling } from "../lib/usePolling";

// Relay links carry a 15-minute token, so the list is fetched again well
// before that runs out.
const RENEW_MS = 10 * 60 * 1000;

// The cameras of one facility, as the server says to show them.
export function useCameras(facilityId, enabled = true) {
  const [cameras, setCameras] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.listCameras(facilityId);
      setCameras(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setCameras([]);
    }
  }, [facilityId, enabled]);

  usePolling(load, RENEW_MS, [load]);
  return { cameras, error, reload: load };
}

function Unavailable({ title, detail, onRetry }) {
  return (
    <div className="camera-empty">
      <VideoOff size={22} />
      <strong>{title}</strong>
      {detail && <span className="faint">{detail}</span>}
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

// A still image that reloads every few seconds. The next frame is loaded
// off-screen first so the picture never flashes blank between frames.
function SnapshotImage({ url, refreshMs, label, onError }) {
  const [src, setSrc] = useState(() => `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const probe = new Image();
      probe.onload = () => setSrc(next);
      probe.src = next;
    }, refreshMs);
    return () => clearInterval(timer);
  }, [url, refreshMs]);
  return <img src={src} alt={label} onError={onError} />;
}

function HlsVideo({ url, onError }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    // Safari plays HLS natively; everything else needs hls.js, which is
    // only downloaded when a page actually has an HLS camera.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return undefined;
    }
    let hls;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) return onError();
      hls = new Hls({ liveDurationInfinity: true });
      hls.on(Hls.Events.ERROR, (_e, data) => data.fatal && onError());
      hls.loadSource(url);
      hls.attachMedia(video);
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url, onError]);
  return <video ref={ref} autoPlay muted playsInline controls />;
}

// One camera. `info` is an entry from GET /polyhouses/:id/cameras.
export default function CameraView({ info, compact = false, onRetry }) {
  const frameRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);

  useEffect(() => setFailed(false), [info?.url]);

  if (!info) return null;
  if (info.kind === "unavailable") {
    return (
      <div className="camera">
        <Unavailable title={`${info.label} cannot play`} detail={info.message} />
      </div>
    );
  }

  const url = apiUrl(info.url);
  const fullscreen = () => frameRef.current?.requestFullscreen?.();
  const retry = () => {
    setFailed(false);
    onRetry?.();
  };

  let body;
  if (failed) {
    body = (
      <Unavailable
        title="No picture from the camera"
        detail={
          info.kind === "img"
            ? "The camera did not answer. Check it is powered and on the network, and that its URL is right."
            : "The stream did not load. An http:// stream will not play on an https:// dashboard."
        }
        onRetry={retry}
      />
    );
  } else if (info.kind === "img" && info.refreshMs) {
    body = <SnapshotImage url={url} refreshMs={info.refreshMs} label={info.label} onError={fail} />;
  } else if (info.kind === "img") {
    body = <img src={url} alt={info.label} onError={fail} />;
  } else if (info.kind === "hls") {
    body = <HlsVideo url={url} onError={fail} />;
  } else if (info.kind === "video") {
    body = <video src={url} autoPlay muted playsInline controls loop onError={fail} />;
  } else {
    // MediaMTX's WebRTC player, or the camera's own web page.
    body = <iframe src={url} title={info.label} allow="autoplay; fullscreen" scrolling="no" />;
  }

  return (
    <figure className={`camera${compact ? " camera-compact" : ""}`}>
      <div className="camera-frame" ref={frameRef}>
        {body}
        {!failed && (
          <span className="camera-live">
            <span className="dot dot-live" /> {info.refreshMs ? `every ${info.refreshMs / 1000} s` : "live"}
          </span>
        )}
      </div>
      {!compact && (
        <figcaption className="camera-caption">
          <span>
            <strong>{info.label}</strong>
            <span className="faint"> · {FORMAT_NOTE[info.format] || info.format}</span>
          </span>
          <button className="btn btn-quiet btn-sm" onClick={fullscreen} title="Full screen">
            <Maximize2 size={14} />
          </button>
        </figcaption>
      )}
    </figure>
  );
}

const FORMAT_NOTE = {
  rtsp: "RTSP via the WebRTC gateway",
  mjpeg: "MJPEG, relayed by the server",
  snapshot: "snapshots, relayed by the server",
  hls: "HLS stream",
  video: "video",
  page: "camera web page",
};
