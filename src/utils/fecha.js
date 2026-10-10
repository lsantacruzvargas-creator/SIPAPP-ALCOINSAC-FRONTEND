// Toda fecha/hora que se muestra o se precarga en la UI debe leerse en hora de
// Perú (America/Lima, UTC-5, sin horario de verano) — sin esto,
// toLocaleDateString/getFullYear/getMonth usan el huso del sistema operativo
// del navegador, y toISOString() da el día en UTC (entre las 19:00 y las 23:59
// hora Lima ya es el día siguiente).
const TZ = "America/Lima";

// Los campos de solo fecha (<input type="date">) guardados antes de 2026-10-09
// quedaron a medianoche UTC ("2026-10-09T00:00:00.000Z"): leídos en hora Lima
// caen el día anterior. No se migraron, así que ese valor exacto se lee como
// día calendario en UTC; lo nuevo ya llega a medianoche Lima (T05:00Z) desde
// el backend (ver Backend/src/config/db.js). Un timestamp real a 00:00:00.000
// UTC exacto es prácticamente imposible.
const zonaDe = (d) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0
    ? "UTC" : TZ;

export const formatearFecha = (fecha, opts) => {
  const d = new Date(fecha);
  return d.toLocaleDateString("es-PE", { timeZone: zonaDe(d), day: "2-digit", month: "2-digit", year: "numeric", ...opts });
};

export const formatearFechaHora = (fecha, opts) =>
  new Date(fecha).toLocaleString("es-PE", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, ...opts,
  });

// "YYYY-MM-DD" del día calendario ACTUAL en Lima — para precargar un
// <input type="date"> con el día correcto.
export const fechaHoyLima = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

// "YYYY-MM-DD" de una fecha guardada — para precargar un <input type="date">
// al editar. Intl.DateTimeFormat lanza RangeError con una fecha inválida (a
// diferencia de toLocaleDateString), por eso el guard.
export const aInputFecha = (fecha) => {
  const d = new Date(fecha);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zonaDe(d) }).format(d);
};

// Año y mes (1-12) en Lima, para los filtros por año/mes de las listas.
export const anioLima = (fecha) => Number(aInputFecha(fecha).slice(0, 4) || NaN);
export const mesLima = (fecha) => Number(aInputFecha(fecha).slice(5, 7) || NaN);
