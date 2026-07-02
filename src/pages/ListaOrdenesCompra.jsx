import { useState, useEffect } from "react";
import { fetchAuth, uploadAuth, imgUrl } from "../utils/fetchAuth";
import DetalleDocumento from "../components/DetalleDocumento";
import ModalCrearOrdenCompra   from "../components/ModalCrearOrdenCompra";
import ModalImportarExcel, { COLS_OC } from "../components/ModalImportarExcel";
import { DotChip, badgeOT, badgePago, dotOT, dotPago } from "../components/detalleShared";

const ESTADOS_OT = ["", "pendiente", "en progreso", "completado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TH = "px-4 py-3 font-semibold text-gray-500 whitespace-nowrap";

export default function ListaOrdenesCompra() {
  const hoy = new Date();
  const [ordenes, setOrdenes]       = useState([]);
  const [otMap, setOtMap]           = useState({});
  const [factMap, setFactMap]       = useState({});
  const [factByOCMap, setFactByOCMap] = useState({});
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [crearOpen, setCrearOpen]   = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [estadoOT, setEstadoOT] = useState("");
  const [anio, setAnio]         = useState(hoy.getFullYear());
  const [mes, setMes]           = useState(hoy.getMonth() + 1);

  const cargar = () =>
    Promise.all([
      fetchAuth("/ordenes-compra").then((r) => r.ok ? r.json() : []),
      fetchAuth("/ordenes-trabajo").then((r) => r.ok ? r.json() : []),
      fetchAuth("/facturas").then((r) => r.ok ? r.json() : []),
    ]).then(([ocs, ots, facts]) => {
      setOrdenes(ocs);
      const otM = {};
      ots.forEach((ot) => {
        const cotId = ot.cotizacion?._id || ot.cotizacion;
        if (cotId) otM[cotId] = ot.estado;
      });
      setOtMap(otM);
      const factM = {};
      const factByOCM = {};
      facts.forEach((f) => {
        const cotId = f.cotizacion?._id || f.cotizacion;
        if (cotId && !factM[cotId]) factM[cotId] = f;
        const ocId = f.ordenCompra?._id || f.ordenCompra;
        if (ocId && !factByOCM[ocId]) factByOCM[ocId] = f;
      });
      setFactMap(factM);
      setFactByOCMap(factByOCM);
    });

  useEffect(() => { cargar(); }, []);

  const anios = [...new Set(ordenes.map((o) => new Date(o.fecha).getFullYear()))].sort((a, b) => b - a);

  const filtradas = ordenes.filter((o) => {
    const fecha = new Date(o.fecha);
    const matchAnio  = fecha.getFullYear() === anio;
    const matchMes   = fecha.getMonth() + 1 === mes;
    const txt = busqueda.toLowerCase();
    const matchBusq  = !txt
      || o.numeroOrden?.toLowerCase().includes(txt)
      || o.titulo?.toLowerCase().includes(txt)
      || o.empresa?.razonSocial?.toLowerCase().includes(txt)
      || o.empresa?.ruc?.includes(txt)
      || o.cotizacion?.codigo?.toLowerCase().includes(txt);
    const cotId      = o.cotizacion?._id || o.cotizacion;
    const estadoActual = otMap[cotId];
    const matchEstado = !estadoOT || estadoActual === estadoOT;
    return matchAnio && matchMes && matchBusq && matchEstado;
  });

  const hayFiltro = busqueda || estadoOT || anio !== hoy.getFullYear() || mes !== hoy.getMonth() + 1;

  const subirDocumento = async (id, file) => {
    const fd = new FormData();
    fd.append("documento", file);
    const res = await uploadAuth(`/ordenes-compra/${id}/documento`, fd);
    if (res.ok) {
      const actualizada = await res.json();
      setOrdenes((prev) => prev.map((o) => o._id === id ? { ...o, documento: actualizada.documento } : o));
    }
  };

  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Órdenes de Compra</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtradas.length} orden{filtradas.length !== 1 ? "es" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportarOpen(true)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
            Importar Excel
          </button>
          <button onClick={() => setCrearOpen(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition font-medium">
            + Nueva OC
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex gap-3 flex-wrap items-center">
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {anios.length === 0
            ? <option value={anio}>{anio}</option>
            : anios.map((a) => <option key={a} value={a}>{a}</option>)
          }
        </select>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por N° orden, empresa, RUC, título o cotización…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-60 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={estadoOT}
          onChange={(e) => setEstadoOT(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {ESTADOS_OT.map((e) => (
            <option key={e} value={e}>{e ? e.charAt(0).toUpperCase() + e.slice(1) : "Todo estado OT"}</option>
          ))}
        </select>
        {hayFiltro && (
          <button
            onClick={() => { setBusqueda(""); setEstadoOT(""); setAnio(hoy.getFullYear()); setMes(hoy.getMonth() + 1); }}
            className="text-sm text-gray-400 hover:text-gray-700 transition"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
            <tr>
              <th className={`${TH} text-left`}>N° Orden de Compra</th>
              <th className={`${TH} text-left`}>N° Factura</th>
              <th className={`${TH} text-left`}>Cotización</th>
              <th className={`${TH} text-left`}>Empresa</th>
              <th className={`${TH} text-left`}>Planta</th>
              <th className={`${TH} text-left`}>Encargado</th>
              <th className={`${TH} text-left`}>Título</th>
              <th className={`${TH} text-right`}>Total sin IGV (S/)</th>
              <th className={`${TH} text-center`}>Fecha</th>
              <th className={`${TH} text-center`}>Estado OT</th>
              <th className={`${TH} text-center`}>Estado Pago</th>
              <th className={`${TH} text-center`}>Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">Sin órdenes de compra</td></tr>
            ) : filtradas.map((o) => {
              const cotId = o.cotizacion?._id || o.cotizacion;
              const estadoActual = otMap[cotId];
              const factura = factMap[cotId] || factByOCMap[o._id];
              return (
                <tr key={o._id} className="hover:bg-blue-50/65 cursor-pointer transition-colors" onClick={() => setOrdenSeleccionada(o)}>
                  <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{o.numeroOrden || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{o.numeroFactura || factura?.numeroFactura || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-blue-600">{o.cotizacion?.codigo || "—"}</td>
                  <td className="px-4 py-3.5 text-gray-700">{o.empresa?.razonSocial || "—"}</td>
                  <td className="px-4 py-3.5 text-gray-600">{o.planta || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-600">{o.encargado || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-600">{o.titulo}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                    {Number(o.monto).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-500 whitespace-nowrap">
                    {new Date(o.fecha).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {estadoActual ? (
                      <DotChip chip={badgeOT(estadoActual)} dot={dotOT(estadoActual)}>{estadoActual}</DotChip>
                    ) : (
                      <span className="text-gray-300 text-xs">Sin OT</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {factura?.estadoPago ? (
                      <DotChip chip={badgePago(factura.estadoPago)} dot={dotPago(factura.estadoPago)}>{factura.estadoPago}</DotChip>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <label className="cursor-pointer inline-flex flex-col items-center gap-1">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => { if (e.target.files[0]) subirDocumento(o._id, e.target.files[0]); e.target.value = ""; }}
                      />
                      {o.documento ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={imgUrl(o.documento)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                          >
                            Ver PDF
                          </a>
                          <span className="text-gray-300">|</span>
                          <span className="text-xs text-gray-400 hover:text-gray-600 underline">Reemplazar</span>
                        </div>
                      ) : (
                        <span className="text-xs text-blue-500 hover:text-blue-700 underline">Subir PDF</span>
                      )}
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {ordenSeleccionada && (
        <DetalleDocumento
          tipo="oc"
          data={ordenSeleccionada}
          extra={
            factMap[ordenSeleccionada.cotizacion?._id] ||
            factByOCMap[ordenSeleccionada._id]
          }
          onClose={() => setOrdenSeleccionada(null)}
          onGuardadaOC={(actualizada) => {
            setOrdenes((prev) => prev.map((o) => o._id === actualizada._id ? actualizada : o));
          }}
        />
      )}

      {crearOpen && (
        <ModalCrearOrdenCompra
          onClose={() => setCrearOpen(false)}
          onCreada={(nueva) => { setOrdenes(prev => [nueva, ...prev]); setCrearOpen(false); }}
        />
      )}

      {importarOpen && (
        <ModalImportarExcel
          tipo="Ordenes de Compra"
          columnas={COLS_OC}
          endpoint="/ordenes-compra/importar"
          color="blue"
          onClose={() => setImportarOpen(false)}
          onImportado={cargar}
        />
      )}
    </div>
  );
}
