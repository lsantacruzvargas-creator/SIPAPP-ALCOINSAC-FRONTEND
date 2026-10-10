import { aInputFecha } from "./fecha";

export const calcSubtotal = (item) =>
  parseFloat((item.cantidad * item.precio).toFixed(2));

// El descuento global es sobre la SUMA de subtotales (no por ítem) y se
// aplica antes del IGV — `subtotal` sigue siendo el bruto para mostrarlo tal
// cual; `igv` y `total` ya salen sobre la base descontada.
export const calcularTotales = (sub, descuentoPct = 0) => {
  const s = Math.round(Number(sub) * 100) / 100 || 0;
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  const descuento = Math.round(s * (pct / 100) * 100) / 100;
  const subtotalConDescuento = Math.round((s - descuento) * 100) / 100;
  const igv = Math.round(subtotalConDescuento * 0.18 * 100) / 100;
  return {
    subtotal: s,
    descuentoPorcentaje: pct,
    descuento,
    subtotalConDescuento,
    igv,
    total: Math.round((subtotalConDescuento + igv) * 100) / 100,
  };
};

// Opciones sugeridas para "Forma de pago" — combo editable (input + datalist):
// el usuario puede elegir una de estas o escribir cualquier otro texto libre.
export const OPCIONES_FORMA_PAGO = [
  "Factura a 15 días",
  "Factoring",
  "50% adelanto, saldo cuando entrega",
  ,
];

export const INP =
  "border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400";
export const INP_RO = "bg-transparent border-transparent text-sm px-2 py-1";

export const itemVacioVenta = () => ({
  _key: Date.now() + Math.random(),
  descripcion: "",
  cantidad: 1,
  fechaEntrega: "",
  precio: 0,
  moneda: "PEN",
});

export const itemVacioServicio = () => ({
  _key: Date.now() + Math.random(),
  descripcion: "",
  subItems: [],
  cantidad: 1,
  fechaEntrega: "",
  precio: 0,
  moneda: "PEN",
});

export const itemDesdeDb = (item) => ({
  _key: Date.now() + Math.random(),
  descripcion: item.descripcion,
  subItems: (item.subItems || []).map((texto) => ({
    _subKey: Date.now() + Math.random(),
    texto,
  })),
  cantidad: item.cantidad,
  fechaEntrega: item.fechaEntrega
    ? aInputFecha(item.fechaEntrega)
    : "",
  precio: item.precio,
  moneda: item.moneda || "PEN",
  otGenerada: item.otGenerada || null,
});

// Validación de ítems requeridos por el modelo (Backend/src/models/Cotizacion.js:
// descripcion, cantidad y precio son obligatorios) — se resalta en el form
// antes de enviar, en vez de dejar que el guardado falle en el servidor.
export const descripcionInvalida = (item) => !item.descripcion?.trim();
export const cantidadInvalida = (item) => !(Number(item.cantidad) > 0);
export const precioInvalido = (item) =>
  item.precio === "" || item.precio == null || isNaN(Number(item.precio)) || Number(item.precio) < 0;
export const itemInvalido = (item) =>
  descripcionInvalida(item) || cantidadInvalida(item) || precioInvalido(item);
