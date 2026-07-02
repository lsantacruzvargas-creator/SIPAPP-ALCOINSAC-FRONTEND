import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import DetalleDocumento from "../components/DetalleDocumento";
import ModalCrearFactura  from "../components/ModalCrearFactura";
import ModalImportarExcel, { COLS_FACTURAS } from "../components/ModalImportarExcel";
import { DotChip, BarraPago, badgePago, dotPago } from "../components/detalleShared";
import * as XLSX from "xlsx";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const FILTROS_VACIO = { empresa: "", ano: "", mes: "", estadoPago: "", busqueda: "" };

const ESTADOS_PAGO = [
  { valor: "sin pago",     label: "Sin pago",     cls: "bg-red-50 text-red-700" },
  { valor: "pago parcial", label: "Pago parcial", cls: "bg-amber-50 text-amber-700" },
  { valor: "pagado",       label: "Pagado",       cls: "bg-green-50 text-green-700" },
];

function BadgeCancelacion({ fecha, pagado }) {
  if (!fecha) return <span className="text-gray-300 text-xs">—</span>;
  const str = new Date(fecha).toLocaleDateString("es-PE");

  if (pagado) {
    return <span className="inline-flex flex-col items-center"><span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full line-through">Vencimiento</span><span className="text-xs text-gray-300 line-through">{str}</span></span>;
  }

  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fecha); vence.setHours(0, 0, 0, 0);
  const dias  = (vence - hoy) / 86400000;
  if (dias < 0)  return <span className="inline-flex flex-col items-center"><span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Vencida</span><span className="text-xs text-red-400">{str}</span></span>;
  if (dias <= 7) return <span className="inline-flex flex-col items-center"><span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Próx. a vencer</span><span className="text-xs text-amber-500">{str}</span></span>;
  return <span className="text-xs text-gray-500">{str}</span>;
}

const SELECT = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300";
const TD_NUM = "px-3 py-3.5 text-right tabular-nums";
const TH     = "px-3 py-3 font-semibold text-gray-500 whitespace-nowrap";

export default function ListaFacturas() {
  const [facturas, setFacturas]       = useState([]);
  const [filtros, setFiltros]         = useState(FILTROS_VACIO);
  const [seleccionada, setSeleccionada] = useState(null);
  const [crearOpen, setCrearOpen]     = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);

  const cargar = () =>
    fetchAuth("/facturas")
      .then(r => r.ok ? r.json() : [])
      .then(data => setFacturas(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));

  useEffect(() => { cargar(); }, []);

  const empresasLista = [
    ...new Map(
      facturas.filter(f => f.empresa?._id).map(f => [f.empresa._id, f.empresa])
    ).values(),
  ].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));

  const anos = [...new Set(
    facturas.map(f => new Date(f.fechaEmision).getFullYear())
  )].sort((a, b) => b - a);

  const handleFiltro = e => setFiltros({ ...filtros, [e.target.name]: e.target.value });

  const filtradas = facturas.filter(f => {
    const fecha = new Date(f.fechaEmision);
    const q     = filtros.busqueda.toLowerCase();
    return (
      (!filtros.empresa    || f.empresa?._id === filtros.empresa) &&
      (!filtros.ano        || fecha.getFullYear() === parseInt(filtros.ano)) &&
      (!filtros.mes        || fecha.getMonth() + 1 === parseInt(filtros.mes)) &&
      (!filtros.estadoPago || f.estadoPago === filtros.estadoPago) &&
      (!q ||
        f.empresa?.razonSocial?.toLowerCase().includes(q) ||
        f.empresa?.ruc?.includes(q) ||
        f.numeroFactura?.toLowerCase().includes(q) ||
        (f.ordenCompra?.numeroOrden || f.numeroOrdenCompra || "").toLowerCase().includes(q) ||
        f.descripcion?.toLowerCase().includes(q) ||
        f.encargado?.toLowerCase().includes(q) ||
        f.planta?.toLowerCase().includes(q))
    );
  });

  const handlePagoChange = (id, valor) =>
    setFacturas(prev => prev.map(f => f._id === id ? { ...f, montoPagado: valor } : f));

  const handlePagoBlur = (id, valor) => {
    const factura = facturas.find(f => f._id === id);
    if (!factura) return;
    const totalAPagar = Number(factura.totalAPagar) || 0;
    const pago = parseFloat(valor) || 0;
    let estadoPago = "sin pago";
    if (pago > 0 && pago < totalAPagar) estadoPago = "pago parcial";
    if (totalAPagar > 0 && pago >= totalAPagar) estadoPago = "pagado";
    setFacturas(prev =>
      prev.map(f => f._id === id ? { ...f, montoPagado: pago, estadoPago } : f)
    );
    fetchAuth(`/facturas/${id}/estado-pago`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montoPagado: pago }),
    });
  };

  const exportarExcel = () => {
    const datos = filtradas.map(f => ({
      "N° Factura":       f.numeroFactura          || "—",
      "Fecha emisión":    new Date(f.fechaEmision).toLocaleDateString("es-PE"),
      "Fecha cancelación":f.fechaCancelacion
        ? new Date(f.fechaCancelacion).toLocaleDateString("es-PE") : "—",
      "O.C.":             f.ordenCompra?.numeroOrden || f.numeroOrdenCompra || "—",
      "Empresa":          f.empresa?.razonSocial      || "—",
      "RUC":              f.empresa?.ruc               || "—",
      "Subtotal":         Number(f.subtotal ?? f.monto ?? 0).toFixed(2),
      "IGV 18%":          Number(f.igv      ?? 0).toFixed(2),
      "Total":            Number(f.total    ?? 0).toFixed(2),
      "Descripción":      f.descripcion || "—",
      "Encargado":        f.encargado   || "—",
      "Planta":           f.planta      || "—",
      "Detracción (12%)": Number(f.detraccion  ?? 0).toFixed(2),
      "Total a pagar":    Number(f.totalAPagar ?? 0).toFixed(2),
      "Monto pagado":     Number(f.montoPagado ?? 0).toFixed(2),
      "Estado pago":      f.estadoPago,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    XLSX.writeFile(wb, "facturas.xlsx");
  };

  const totales = {
    subtotal:    filtradas.reduce((s, f) => s + (Number(f.subtotal ?? f.monto)    || 0), 0),
    igv:         filtradas.reduce((s, f) => s + (Number(f.igv)                   || 0), 0),
    total:       filtradas.reduce((s, f) => s + (Number(f.total)                 || 0), 0),
    detraccion:  filtradas.reduce((s, f) => s + (Number(f.detraccion)            || 0), 0),
    totalAPagar: filtradas.reduce((s, f) => s + (Number(f.totalAPagar)           || 0), 0),
    pagado:      filtradas.reduce((s, f) => s + (Number(f.montoPagado)           || 0), 0),
  };

  return (
    <>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Facturas</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtradas.length} registro{filtradas.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
            Exportar Excel
          </button>
          <button onClick={() => setImportarOpen(true)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
            Importar Excel
          </button>
          <button onClick={() => setCrearOpen(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition font-medium">
            + Nueva Factura
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select name="empresa" value={filtros.empresa} onChange={handleFiltro} className={SELECT}>
          <option value="">Toda empresa</option>
          {empresasLista.map(e => (
            <option key={e._id} value={e._id}>
              {e.alias ? `${e.alias} — ` : ""}{e.razonSocial}
            </option>
          ))}
        </select>
        <select name="ano" value={filtros.ano} onChange={handleFiltro} className={SELECT}>
          <option value="">Todos los años</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select name="mes" value={filtros.mes} onChange={handleFiltro} className={SELECT}>
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select name="estadoPago" value={filtros.estadoPago} onChange={handleFiltro} className={SELECT}>
          <option value="">Todos los estados</option>
          {ESTADOS_PAGO.map(({ valor, label }) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
        <input name="busqueda" value={filtros.busqueda} onChange={handleFiltro}
          placeholder="Buscar por empresa, RUC, N° factura, OC, descripción…"
          className={`${SELECT} flex-1 min-w-52`} />
        {Object.values(filtros).some(Boolean) && (
          <button onClick={() => setFiltros(FILTROS_VACIO)}
            className="text-sm text-gray-400 hover:text-gray-700 transition">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "1000px" }}>
            <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
              <tr>
                <th className={`${TH} text-left`}>N° Factura</th>
                <th className={`${TH} text-center`}>Fecha emisión</th>
                <th className={`${TH} text-center`}>Fecha cancelación</th>
                <th className={`${TH} text-left`}>Orden de Compra</th>
                <th className={`${TH} text-left`}>Empresa</th>
                <th className={`${TH} text-right`}>Subtotal</th>
                <th className={`${TH} text-right`}>IGV 18%</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-right`}>Detracción 12%</th>
                <th className={`${TH} text-right`}>Total a pagar</th>
                <th className={`${TH} text-center`}>Estado pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                    {Object.values(filtros).some(Boolean)
                      ? "Sin resultados para los filtros aplicados"
                      : "Sin facturas registradas"}
                  </td>
                </tr>
              ) : (
                <>
                {filtradas.map(f => (
                  <tr key={f._id} className="hover:bg-emerald-50/65 cursor-pointer transition-colors"
                    onClick={() => setSeleccionada(f)}>
                    <td className="px-3 py-3.5 font-semibold text-gray-800 whitespace-nowrap">
                      {f.numeroFactura || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-center text-gray-500 whitespace-nowrap">
                      {new Date(f.fechaEmision).toLocaleDateString("es-PE")}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <BadgeCancelacion fecha={f.fechaCancelacion} pagado={f.estadoPago === "pagado"} />
                    </td>
                    <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap">
                      {f.ordenCompra?.numeroOrden || f.numeroOrdenCompra || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-gray-700">
                      {f.empresa?.razonSocial || <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`${TD_NUM} text-gray-400`}>
                      {Number(f.subtotal ?? f.monto ?? 0).toFixed(2)}
                    </td>
                    <td className={`${TD_NUM} text-gray-400`}>
                      {Number(f.igv ?? 0).toFixed(2)}
                    </td>
                    <td className={`${TD_NUM} text-gray-600`}>
                      {Number(f.total ?? 0).toFixed(2)}
                    </td>
                    <td className={`${TD_NUM} text-gray-400`}>
                      {Number(f.detraccion ?? 0).toFixed(2)}
                    </td>
                    <td className={`${TD_NUM} font-bold text-gray-900`}>
                      {Number(f.totalAPagar ?? 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1.5 min-w-[130px]">
                        <DotChip chip={badgePago(f.estadoPago)} dot={dotPago(f.estadoPago)}>
                          {f.estadoPago}
                        </DotChip>
                        <BarraPago pagado={f.montoPagado} total={Number(f.totalAPagar) || 0} />
                        <input type="number" min="0" step="0.01"
                          value={f.montoPagado ?? 0}
                          onChange={e => handlePagoChange(f._id, e.target.value)}
                          onBlur={e => handlePagoBlur(f._id, e.target.value)}
                          className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <td colSpan={5} className="px-3 py-3.5 text-right text-xs uppercase tracking-wide text-gray-400">
                    Totales ({filtradas.length})
                  </td>
                  <td className={`${TD_NUM} text-gray-500`}>{totales.subtotal.toFixed(2)}</td>
                  <td className={`${TD_NUM} text-gray-500`}>{totales.igv.toFixed(2)}</td>
                  <td className={`${TD_NUM} text-gray-700`}>{totales.total.toFixed(2)}</td>
                  <td className={`${TD_NUM} text-gray-500`}>{totales.detraccion.toFixed(2)}</td>
                  <td className={`${TD_NUM} font-bold text-gray-900`}>{totales.totalAPagar.toFixed(2)}</td>
                  <td className="px-3 py-3.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">Cobrado</span>
                      <span className="tabular-nums text-emerald-700 font-bold">{totales.pagado.toFixed(2)}</span>
                    </div>
                  </td>
                </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {crearOpen && (
      <ModalCrearFactura
        onClose={() => setCrearOpen(false)}
        onCreada={(nueva) => { setFacturas(prev => [nueva, ...prev]); setCrearOpen(false); }}
      />
    )}

    {importarOpen && (
      <ModalImportarExcel
        tipo="Facturas"
        columnas={COLS_FACTURAS}
        endpoint="/facturas/importar"
        color="emerald"
        onClose={() => setImportarOpen(false)}
        onImportado={cargar}
      />
    )}

    {seleccionada && (
      <DetalleDocumento
        tipo="factura"
        data={seleccionada}
        onClose={() => setSeleccionada(null)}
        onGuardadaFactura={(actualizada) => {
          setFacturas(prev => prev.map(f => f._id === actualizada._id ? actualizada : f));
        }}
      />
    )}
    </>
  );
}
