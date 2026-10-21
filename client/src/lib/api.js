const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "polyhouse.token";

// Fired when the server rejects the token, so the whole app signs out instead
// of looking signed in while every request fails.
export const UNAUTHORIZED_EVENT = "polyhouse:unauthorized";

const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage blocked: the session just will not survive a reload.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up.
    }
  },
};

export const tokenStore = {
  get: () => safeStorage.get(TOKEN_KEY),
  set: (token) => safeStorage.set(TOKEN_KEY, token),
  clear: () => safeStorage.remove(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, raw = false } = {}) {
  const token = tokenStore.get();
  const headers = {};
  // FormData (a photo upload) sets its own multipart content type.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the API running?", 0);
  }

  if (response.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (raw) {
    if (!response.ok) throw new ApiError("Download failed", response.status);
    return response.blob();
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || "Request failed", response.status);
  }
  return payload;
}

// Turns a server-relative path (/api/camera-feed/...) into a full URL.
export const apiUrl = (path) => (/^https?:\/\//.test(path) ? path : `${BASE}${path}`);

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  changePassword: (body) => request("/auth/password", { method: "PATCH", body }),

  listAreas: () => request("/areas"),
  createArea: (body) => request("/areas", { method: "POST", body }),
  deleteArea: (id) => request(`/areas/${id}`, { method: "DELETE" }),

  listUsers: () => request("/users"),
  createUser: (body) => request("/users", { method: "POST", body }),
  updateUser: (id, body) => request(`/users/${id}`, { method: "PATCH", body }),
  setUserAccess: (id, access) => request(`/users/${id}/access`, { method: "PUT", body: { access } }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  listFacilities: () => request("/polyhouses"),
  getFacility: (id) => request(`/polyhouses/${id}`),
  createFacility: (body) => request("/polyhouses", { method: "POST", body }),
  updateFacility: (id, body) => request(`/polyhouses/${id}`, { method: "PATCH", body }),
  deleteFacility: (id) => request(`/polyhouses/${id}`, { method: "DELETE" }),

  listReadings: (id, limit = 50) => request(`/polyhouses/${id}/readings?limit=${limit}`),
  readingSeries: (id, hours = 24) => request(`/polyhouses/${id}/readings/series?hours=${hours}`),
  getState: (id) => request(`/polyhouses/${id}/state`),
  saveThreshold: (id, body) => request(`/polyhouses/${id}/threshold`, { method: "PUT", body }),
  exportCsv: (id) => request(`/polyhouses/${id}/readings/export`, { raw: true }),

  listPhenotypes: (id) => request(`/polyhouses/${id}/phenotypes`),
  latestPhenotypes: (facility) =>
    request(`/phenotypes/latest${facility ? `?facility=${facility}` : ""}`),
  addPhenotype: (id, body) => request(`/polyhouses/${id}/phenotypes`, { method: "POST", body }),
  analysePhoto: (id, file) => {
    const form = new FormData();
    form.append("image", file);
    return request(`/polyhouses/${id}/phenotypes/analyse`, { method: "POST", body: form });
  },
  analyseCamera: (id, camera = "rgb") =>
    request(`/polyhouses/${id}/phenotypes/analyse`, { method: "POST", body: { camera } }),

  listCameras: (id) => request(`/polyhouses/${id}/cameras`),

  network: () => request("/network"),
};
