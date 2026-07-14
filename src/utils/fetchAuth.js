const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE = API.replace(/\/api$/, "");

export function getToken() {
  return localStorage.getItem("token");
}

export function getUsuario() {
  const u = localStorage.getItem("usuario");
  return u ? JSON.parse(u) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export const imgUrl = (ruta) => `${BASE}${ruta}`;

export const uploadAuth = (endpoint, formData) => {
  const token = localStorage.getItem("token");
  return fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
};

const METODOS_ESCRITURA = ["POST", "PUT", "PATCH", "DELETE"];

export const fetchAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.hash = "/login";
  }
  // Avisa al Navbar que hubo un guardado exitoso para que refresque la
  // campana de notificaciones al instante, sin esperar el polling de 60s.
  if (res.ok && METODOS_ESCRITURA.includes(options.method)) {
    window.dispatchEvent(new Event("app:cambio-guardado"));
  }
  return res;
};
