export const calcSubtotal = (item) =>
  parseFloat((item.cantidad * item.precio).toFixed(2));

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
    ? new Date(item.fechaEntrega).toISOString().split("T")[0]
    : "",
  precio: item.precio,
  moneda: item.moneda || "PEN",
});
