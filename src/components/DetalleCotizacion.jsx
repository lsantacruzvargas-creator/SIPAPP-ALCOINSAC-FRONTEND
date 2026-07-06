import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import { exportarCotizacionPdf } from "../utils/cotizacionPdf";
import ModalCrearOT from "./ModalCrearOT";
import ModalOrdenCompra from "./ModalOrdenCompra";
import {
  FlujoNegocio, TarjetaRelacion, Chip,
  badgePago, badgeOT, money, BotonAnular, BannerAnulado,
} from "./detalleShared";

const INP = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 w-full transition";

function calcular(sub) {
  const s = Math.round(Number(sub) * 100) / 100 || 0;
  const igv = Math.round(s * 0.18 * 100) / 100;
  return { subtotal: s, igv, total: Math.round((s + igv) * 100) / 100 };
}

export default function DetalleCotizacion({ cotizacion: inicial, onClose, onGuardada, onNavegar }) {
  const [cot, setCot] = useState(inicial);
  const subtotalInicial = inicial.subtotal ?? 0;
  const [form, setForm] = useState({
    subtotal:           subtotalInicial > 0 ? String(subtotalInicial) : "",
    empresa:            inicial.empresa?._id     || "",
    tipo:               inicial.tipo             || "venta",
    condicionPago:      inicial.condicionPago    || "",
    fecha:              inicial.fecha ? new Date(inicial.fecha).toISOString().split("T")[0] : "",
    fechaRecibida:      inicial.fechaRecibida ? new Date(inicial.fechaRecibida).toISOString().split("T")[0] : "",
    titulo:             inicial.titulo           || "",
    numeroCotizacion:   inicial.numeroCotizacion || "",
    encargado:          inicial.encargado        || "",
    planta:             inicial.planta           || "",
    numeroGuiaEmision:  inicial.numeroGuiaEmision  || "",
    numeroGuiaRemision: inicial.numeroGuiaRemision || "",
    codigoSap:          inicial.codigoSap          || "",
    fechaSalida:        inicial.fechaSalida ? new Date(inicial.fechaSalida).toISOString().split("T")[0] : "",
  });
  const [calc, setCalc] = useState(() => calcular(subtotalInicial));
  const [empresas, setEmpresas] = useState([]);
  const [ot, setOt]             = useState(null);
  const [informes, setInformes] = useState([]);
  const [oc, setOc]             = useState(null);
  const [factura, setFactura]   = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState("");
  const [crearOTOpen, setCrearOTOpen] = useState(false);
  const [crearOCOpen, setCrearOCOpen] = useState(false);

  const cargarRelaciones = () => {
    Promise.all([
      fetchAuth("/ordenes-trabajo").then(r => r.ok ? r.json() : []),
      fetchAuth("/ordenes-compra").then(r => r.ok ? r.json() : []),
      fetchAuth("/facturas").then(r => r.ok ? r.json() : []),
    ]).then(([ots, ocs, facts]) => {
      const otFound = ots.find(o => (o.cotizacion?._id || o.cotizacion) === cot._id) || null;
      setOt(otFound);
      const ocFound = ocs.find(o => (o.cotizacion?._id || o.cotizacion) === cot._id) || null;
      setOc(ocFound);
      // La factura de la cadena comparte numeroDocumento; si no, se resuelve por la OC.
      const factFound =
        (cot.numeroDocumento != null && facts.find(f => f.numeroDocumento === cot.numeroDocumento)) ||
        (ocFound && facts.find(f => (f.ordenCompra?._id || f.ordenCompra) === ocFound._id)) ||
        null;
      setFactura(factFound);
      if (otFound) {
        fetchAuth(`/informes?ordenTrabajo=${otFound._id}`)
          .then(r => r.ok && r.json())
          .then(infs => setInformes(infs || []));
      } else {
        setInformes([]);
      }
    });
  };

  useEffect(() => {
    fetchAuth("/empresas").then(r => r.ok && r.json()).then(emps => setEmpresas(emps || []));
    cargarRelaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cot._id]);

  const plantasEmpresa = empresas.find(e => e._id === form.empresa)?.plantas ?? [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "subtotal") setCalc(calcular(value));
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "empresa" ? { planta: "" } : {}),
    }));
  };

  const guardar = async () => {
    setGuardando(true); setError("");
    // Los ítems no se editan en esta vista; se envían solo los campos de cabecera.
    const payload = {
      tipo:               form.tipo,
      condicionPago:      form.condicionPago,
      titulo:             form.titulo || "por definir",
      numeroCotizacion:   form.numeroCotizacion,
      encargado:          form.encargado,
      planta:             form.planta,
      subtotal:           calc.subtotal,
      igv:                calc.igv,
      total:              calc.total,
      numeroGuiaEmision:  form.numeroGuiaEmision,
      numeroGuiaRemision: form.numeroGuiaRemision,
      codigoSap:          form.codigoSap,
      fechaSalida:        form.fechaSalida || null,
    };
    if (form.empresa) payload.empresa = form.empresa;
    if (form.fecha) payload.fecha = form.fecha;
    if (form.fechaRecibida) payload.fechaRecibida = form.fechaRecibida;

    const res = await fetchAuth(`/cotizaciones/${cot._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const actualizada = await res.json();
      setCot(actualizada);
      onGuardada?.(actualizada);
    } else {
      setError("Error al guardar los cambios.");
    }
    setGuardando(false);
  };

  const anular = async (motivo) => {
    const res = await fetchAuth(`/cotizaciones/${cot._id}/anular`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    if (res.ok) {
      const actualizada = await res.json();
      setCot(actualizada);
      onGuardada?.(actualizada);
    } else {
      setError("Error al anular el documento.");
    }
  };

  const ultimo = informes[informes.length - 1];

  const pasos = [
    { tipo: "cotizacion", activo: true,               codigo: cot.codigo },
    { tipo: "ot",         activo: !!ot,               codigo: ot?.codigo },
    { tipo: "informe",    activo: informes.length > 0, codigo: informes.length ? `${informes.length} av.` : "" },
    { tipo: "oc",         activo: !!oc,               codigo: oc?.codigo },
    { tipo: "factura",    activo: !!factura,          codigo: factura?.codigo },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Header degradado */}
      <div className="shrink-0 bg-gradient-to-r from-sky-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose}
              className="text-sm text-white/80 hover:text-white transition flex items-center gap-1.5 group shrink-0">
              <span className="group-hover:-translate-x-0.5 transition">←</span> Cotizaciones
            </button>
            <span className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-widest leading-none">Cotización</p>
              <h1 className="text-lg font-bold font-mono leading-tight">
                {cot.codigo}
                {cot.numeroDocumento != null && (
                  <span className="ml-2 text-xs font-normal text-white/60">Doc. N° {cot.numeroDocumento}</span>
                )}
              </h1>
              {cot.empresa && <p className="text-xs text-white/80 leading-tight">{cot.empresa.razonSocial}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-white/60 uppercase tracking-widest leading-none">Total</p>
              <p className="text-lg font-bold leading-tight">{money(cot.total)}</p>
              <Chip className="mt-0.5 bg-white/20 text-white">{cot.tipo}</Chip>
            </div>
            <button onClick={() => exportarCotizacionPdf(cot)}
              className="bg-white/15 text-white text-sm px-4 py-2 rounded-lg hover:bg-white/25 transition font-medium shrink-0">
              Exportar PDF
            </button>
            {!cot.anulado && <BotonAnular onAnular={anular} />}
            {!cot.anulado && (
              <button onClick={guardar} disabled={guardando}
                className="bg-white text-sky-700 text-sm px-5 py-2 rounded-lg hover:bg-sky-50 disabled:opacity-60 transition font-semibold shadow-sm shrink-0">
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper de flujo */}
      <div className="shrink-0 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-5">
          <FlujoNegocio pasos={pasos} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Datos editables */}
          <fieldset disabled={cot.anulado} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 self-start">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-sky-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos de la cotización</h2>
            </div>

            {cot.anulado && (
              <BannerAnulado motivo={cot.motivoAnulacion} por={cot.anuladoPor} fecha={cot.fechaAnulacion} />
            )}

            <div>
              <label className="text-xs text-gray-500 block mb-1">Empresa</label>
              <select name="empresa" value={form.empresa} onChange={handleChange} className={INP}>
                <option value="">— Sin empresa —</option>
                {empresas.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.alias ? `${e.alias} — ` : ""}{e.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° Cotización</label>
                <input name="numeroCotizacion" value={form.numeroCotizacion} onChange={handleChange}
                  placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                <select name="tipo" value={form.tipo} onChange={handleChange} className={INP}>
                  <option value="venta">Venta</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Encargado</label>
                <input name="encargado" value={form.encargado} onChange={handleChange}
                  placeholder="Nombre del encargado" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Planta</label>
                {plantasEmpresa.length > 0 ? (
                  <select name="planta" value={form.planta} onChange={handleChange} className={INP}>
                    <option value="">— Seleccionar planta —</option>
                    {plantasEmpresa.map((p, i) => (
                      <option key={i} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <input name="planta" value={form.planta} onChange={handleChange}
                    placeholder="Planta o sede" className={INP} />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Título / Descripción</label>
              <input name="titulo" value={form.titulo} onChange={handleChange}
                placeholder="Descripción de la cotización" className={INP} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Condición de pago</label>
                <input name="condicionPago" value={form.condicionPago} onChange={handleChange}
                  placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha recibida</label>
                <input type="date" name="fechaRecibida" value={form.fechaRecibida} onChange={handleChange} className={INP} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° guía de llegada</label>
                <input name="numeroGuiaEmision" value={form.numeroGuiaEmision} onChange={handleChange}
                  placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° guía de salida</label>
                <input name="numeroGuiaRemision" value={form.numeroGuiaRemision} onChange={handleChange}
                  placeholder="—" className={INP} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Código SAP</label>
                <input name="codigoSap" value={form.codigoSap} onChange={handleChange}
                  placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha de salida</label>
                <input type="date" name="fechaSalida" value={form.fechaSalida} onChange={handleChange} className={INP} />
              </div>
            </div>

            {/* Ítems (solo lectura) */}
            {cot.items?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-center">Cant.</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-center">Mon.</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cot.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{item.descripcion}</p>
                          {item.subItems?.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {item.subItems.map((s, j) => (
                                <li key={j} className="text-xs text-gray-500 flex gap-1.5"><span>•</span><span>{s}</span></li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right">{Number(item.precio).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{item.moneda === "PEN" ? "S/" : "$"}</td>
                        <td className="px-3 py-2 text-right font-medium">{Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cálculos */}
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-sky-50/40 border border-gray-100 p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Subtotal sin IGV</label>
                <input type="number" name="subtotal" value={form.subtotal} onChange={handleChange}
                  step="0.01" min="0" placeholder="0.00" className={`${INP} text-lg font-semibold`} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-400">IGV 18%</p>
                  <p className="font-semibold text-gray-700">{calc.igv.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-semibold text-gray-700">{calc.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </fieldset>

          {/* Relaciones */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Relaciones</h2>
            </div>

            <TarjetaRelacion tipo="cotizacion" codigo={cot.codigo} numero={cot.numeroCotizacion} actual>
              <p className="text-sm text-gray-600 line-clamp-2">{cot.titulo}</p>
            </TarjetaRelacion>

            <TarjetaRelacion tipo="ot" codigo={ot?.codigo} numero={ot?.numeroOT} vacio={!ot}
              onClick={ot ? () => onNavegar?.({ tipo: "ot", data: ot }) : undefined}
              onCrear={!ot && !cot.anulado ? () => setCrearOTOpen(true) : undefined} crearLabel="OT">
              {ot?.estado && <Chip className={badgeOT(ot.estado)}>{ot.estado}</Chip>}
            </TarjetaRelacion>

            <TarjetaRelacion
              tipo="informe"
              codigo={informes.length ? `${informes.length} avance${informes.length !== 1 ? "s" : ""}` : null}
              vacio={informes.length === 0}>
              {ultimo?.fechaHoraGuardado && (
                <p className="text-xs text-gray-500">
                  Último: {new Date(ultimo.fechaHoraGuardado).toLocaleDateString("es-PE")}
                </p>
              )}
            </TarjetaRelacion>

            <TarjetaRelacion tipo="oc" codigo={oc?.codigo} numero={oc?.numeroOrden} vacio={!oc}
              onClick={oc ? () => onNavegar?.({ tipo: "oc", data: oc, extra: factura }) : undefined}
              onCrear={!oc && !cot.anulado ? () => setCrearOCOpen(true) : undefined} crearLabel="OC">
              {oc?.monto > 0 && <p className="text-xs text-gray-500">{money(oc.monto)}</p>}
            </TarjetaRelacion>

            <TarjetaRelacion tipo="factura" codigo={factura?.codigo} numero={factura?.numeroFactura} vacio={!factura}
              onClick={factura ? () => onNavegar?.({ tipo: "factura", data: factura }) : undefined}>
              {(factura?.totalAPagar || factura?.total) > 0 && (
                <p className="text-xs text-gray-500">{money(factura.totalAPagar ?? factura.total)}</p>
              )}
              {factura?.estadoPago && <Chip className={badgePago(factura.estadoPago)}>{factura.estadoPago}</Chip>}
            </TarjetaRelacion>
          </section>
        </div>
      </div>

      {crearOTOpen && (
        <ModalCrearOT
          cotizacion={cot}
          onClose={() => setCrearOTOpen(false)}
          onCreada={() => { setCrearOTOpen(false); cargarRelaciones(); }}
        />
      )}

      {crearOCOpen && (
        <ModalOrdenCompra
          cotizacion={cot}
          onClose={() => setCrearOCOpen(false)}
          onCreada={() => { setCrearOCOpen(false); cargarRelaciones(); }}
        />
      )}
    </div>
  );
}
