import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import { money } from "../components/detalleShared";
import * as XLSX from "xlsx";

const TH = "px-4 py-3 font-semibold text-gray-500 whitespace-nowrap";
const VACIO = { valorizado: { total: 0, materiales: [] }, consumo: [], ocSinFactura: [], otSinCotizacion: [], facturasSinPago: [] };

const nombreEmpresa = (e) => e?.razonSocial || "Sin empresa";
const fecha = (f) => f ? new Date(f).toLocaleDateString("es-PE") : "—";

function TarjetaTotal({ label, valor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 inline-block">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{money(valor)}</p>
    </div>
  );
}

// `id` permite el deep-link desde el Dashboard (ej. /reportes#oc-sin-factura)
// — ver el scroll-to-hash en el efecto de montaje más abajo. `total`, si se
// pasa, muestra la tarjeta de valorizado de la tabla arriba de esta.
function Seccion({ id, titulo, acento, count, total, totalLabel, children }) {
  return (
    <div id={id} className="mb-6 scroll-mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-5 rounded-full ${acento}`} />
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{titulo}</h3>
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      {total !== undefined && <TarjetaTotal label={totalLabel ?? "Valorizado Total"} valor={total} />}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">{children}</table>
        </div>
      </div>
    </div>
  );
}

export default function Reportes() {
  const [data, setData]         = useState(VACIO);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAuth("/reportes/valorizado-almacen").then((r) => r.ok ? r.json() : { total: 0, materiales: [] }),
      fetchAuth("/reportes/consumo-por-ot").then((r) => r.ok ? r.json() : []),
      fetchAuth("/reportes/oc-sin-factura").then((r) => r.ok ? r.json() : []),
      fetchAuth("/reportes/ot-sin-cotizacion").then((r) => r.ok ? r.json() : []),
      fetchAuth("/reportes/facturas-sin-pago").then((r) => r.ok ? r.json() : []),
    ]).then(([valorizado, consumo, ocSinFactura, otSinCotizacion, facturasSinPago]) => {
      setData({ valorizado, consumo, ocSinFactura, otSinCotizacion, facturasSinPago });
      setCargando(false);
    });
  }, []);

  // Deep-link desde las tarjetas del Dashboard (ej. navigate("/reportes#oc-sin-factura")):
  // una vez cargados los datos, si hay hash en la URL, hace scroll a esa sección.
  useEffect(() => {
    if (cargando || !window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cargando]);

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    const filaMaterial = (m) => ({
      "Codigo":     m.codigo,
      "Nombre":     m.nombre,
      "Unidad":     m.unidad,
      "Tipo":       m.tipoMaterial,
      "Stock":      m.stock,
      "Valorizado": m.valorizado,
    });
    const filaConsumo = (c) => ({
      "N° OT":            c.numeroOT,
      "Titulo":           c.titulo,
      "Empresa":          nombreEmpresa(c.empresa),
      "Costo Materiales": c.costoMateriales,
    });
    const filaOcSinFactura = (o) => ({
      "N° Orden": o.numeroOrden,
      "Codigo":   o.codigo,
      "Titulo":   o.titulo,
      "Empresa":  nombreEmpresa(o.empresa),
      "Monto":    o.monto,
      "Fecha":    fecha(o.fecha),
      "Estado":   o.estado,
    });
    const filaOtSinCotizacion = (o) => ({
      "N° OT":   o.numeroOT,
      "Codigo":  o.codigo,
      "Titulo":  o.titulo,
      "Empresa": nombreEmpresa(o.empresa),
      "Total":   o.total,
      "Fecha":   fecha(o.fecha),
      "Estado":  o.estado,
    });
    const filaFacturaSinPago = (f) => ({
      "N° Factura": f.numeroFactura,
      "Codigo":     f.codigo,
      "Empresa":    nombreEmpresa(f.empresa),
      "Monto":      f.monto,
      "Fecha":      fecha(f.fecha),
    });

    [
      ["Valorizado Almacen",  data.valorizado.materiales.map(filaMaterial)],
      ["Consumo por OT",      data.consumo.map(filaConsumo)],
      ["OC sin Factura",      data.ocSinFactura.map(filaOcSinFactura)],
      ["OT sin Cotizacion",   data.otSinCotizacion.map(filaOtSinCotizacion)],
      ["Facturas sin Pago",   data.facturasSinPago.map(filaFacturaSinPago)],
    ].forEach(([nombre, filas]) => {
      const ws = XLSX.utils.json_to_sheet(filas);
      XLSX.utils.book_append_sheet(wb, ws, nombre);
    });

    XLSX.writeFile(wb, "reportes-almacen.xlsx");
  };

  if (cargando) {
    return <div className="p-8 text-sm text-gray-400">Cargando reportes…</div>;
  }

  const totalConsumo = data.consumo.reduce((s, c) => s + (c.costoMateriales || 0), 0);
  const totalOcSinFactura = data.ocSinFactura.reduce((s, o) => s + (o.monto || 0), 0);
  const totalOtSinCotizacion = data.otSinCotizacion.reduce((s, o) => s + (o.total || 0), 0);
  const totalFacturasSinPago = data.facturasSinPago.reduce((s, f) => s + (f.monto || 0), 0);

  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Reportes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Indicadores de almacén y de la cadena comercial</p>
        </div>
        <button onClick={exportarExcel}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
          Exportar Excel
        </button>
      </div>

      {/* Valorizado de Almacén */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Valorizado de Almacén</h3>
          <span className="text-xs text-gray-400">({data.valorizado.materiales.length})</span>
        </div>
        <TarjetaTotal label="Valorizado Total" valor={data.valorizado.total} />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
                <tr>
                  <th className={`${TH} text-left`}>Código</th>
                  <th className={`${TH} text-left`}>Nombre</th>
                  <th className={`${TH} text-left`}>Unidad</th>
                  <th className={`${TH} text-center`}>Tipo</th>
                  <th className={`${TH} text-right`}>Stock</th>
                  <th className={`${TH} text-right`}>Valorizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.valorizado.materiales.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
                ) : data.valorizado.materiales.map((m) => (
                  <tr key={m.materialId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{m.codigo}</td>
                    <td className="px-4 py-3.5 text-gray-700">{m.nombre}</td>
                    <td className="px-4 py-3.5 text-gray-600">{m.unidad}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide bg-gray-100 text-gray-600">
                        {m.tipoMaterial}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-800 tabular-nums">{m.stock}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">{money(m.valorizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Consumo de materiales por OT */}
      <Seccion titulo="Consumo de materiales por OT" acento="bg-indigo-500" count={data.consumo.length}
        total={totalConsumo} totalLabel="Costo Total en Materiales">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
          <tr>
            <th className={`${TH} text-left`}>N° OT</th>
            <th className={`${TH} text-left`}>Título</th>
            <th className={`${TH} text-left`}>Empresa</th>
            <th className={`${TH} text-right`}>Costo Materiales</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.consumo.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
          ) : data.consumo.map((c) => (
            <tr key={c.otId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{c.numeroOT}</td>
              <td className="px-4 py-3.5 text-gray-600">{c.titulo}</td>
              <td className="px-4 py-3.5 text-gray-700">{nombreEmpresa(c.empresa)}</td>
              <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">{money(c.costoMateriales)}</td>
            </tr>
          ))}
        </tbody>
      </Seccion>

      {/* Órdenes de Compra sin Factura */}
      <Seccion id="oc-sin-factura" titulo="Órdenes de Compra sin Factura" acento="bg-amber-500" count={data.ocSinFactura.length}
        total={totalOcSinFactura} totalLabel="Monto Total sin Facturar">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
          <tr>
            <th className={`${TH} text-left`}>N° Orden</th>
            <th className={`${TH} text-left`}>Código</th>
            <th className={`${TH} text-left`}>Título</th>
            <th className={`${TH} text-left`}>Empresa</th>
            <th className={`${TH} text-right`}>Monto</th>
            <th className={`${TH} text-left`}>Fecha</th>
            <th className={`${TH} text-center`}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.ocSinFactura.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
          ) : data.ocSinFactura.map((o) => (
            <tr key={o.ocId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{o.numeroOrden || "—"}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{o.codigo}</td>
              <td className="px-4 py-3.5 text-gray-600">{o.titulo}</td>
              <td className="px-4 py-3.5 text-gray-700">{nombreEmpresa(o.empresa)}</td>
              <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">{money(o.monto)}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fecha(o.fecha)}</td>
              <td className="px-4 py-3.5 text-center">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide bg-gray-100 text-gray-600">
                  {o.anulado ? "anulada" : o.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Seccion>

      {/* Órdenes de Trabajo sin Cotización */}
      <Seccion id="ot-sin-cotizacion" titulo="Órdenes de Trabajo sin Cotización" acento="bg-purple-500" count={data.otSinCotizacion.length}
        total={totalOtSinCotizacion} totalLabel="Valorizado Total sin Cotizar">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
          <tr>
            <th className={`${TH} text-left`}>N° OT</th>
            <th className={`${TH} text-left`}>Código</th>
            <th className={`${TH} text-left`}>Título</th>
            <th className={`${TH} text-left`}>Empresa</th>
            <th className={`${TH} text-right`}>Total</th>
            <th className={`${TH} text-left`}>Fecha</th>
            <th className={`${TH} text-center`}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.otSinCotizacion.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
          ) : data.otSinCotizacion.map((o) => (
            <tr key={o.otId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{o.numeroOT || "—"}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{o.codigo}</td>
              <td className="px-4 py-3.5 text-gray-600">{o.titulo}</td>
              <td className="px-4 py-3.5 text-gray-700">{nombreEmpresa(o.empresa)}</td>
              <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">{money(o.total)}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fecha(o.fecha)}</td>
              <td className="px-4 py-3.5 text-center">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide bg-gray-100 text-gray-600">
                  {o.anulado ? "anulada" : o.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Seccion>

      {/* Facturas sin pago */}
      <Seccion id="facturas-sin-pago" titulo="Facturas sin pago" acento="bg-red-500" count={data.facturasSinPago.length}
        total={totalFacturasSinPago} totalLabel="Monto Total por Cobrar">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide border-b-2 border-gray-200">
          <tr>
            <th className={`${TH} text-left`}>N° Factura</th>
            <th className={`${TH} text-left`}>Código</th>
            <th className={`${TH} text-left`}>Empresa</th>
            <th className={`${TH} text-right`}>Monto</th>
            <th className={`${TH} text-left`}>Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.facturasSinPago.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin datos</td></tr>
          ) : data.facturasSinPago.map((f) => (
            <tr key={f.facturaId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{f.numeroFactura || "—"}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{f.codigo}</td>
              <td className="px-4 py-3.5 text-gray-700">{nombreEmpresa(f.empresa)}</td>
              <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">{money(f.monto)}</td>
              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fecha(f.fecha)}</td>
            </tr>
          ))}
        </tbody>
      </Seccion>
    </div>
  );
}
