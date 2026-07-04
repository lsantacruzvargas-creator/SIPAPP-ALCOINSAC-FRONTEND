import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import ModalOrdenCompra from "./ModalOrdenCompra";
import {
  FlujoNegocio, TarjetaRelacion, Chip,
  badgePago, badgeOT, money, BotonAnular, BannerAnulado,
} from "./detalleShared";

const INP = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full transition";
const RO  = "bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 w-full";

const PRIORIDADES = ["alta", "media", "baja"];
const ESTADOS = ["pendiente", "en progreso", "completado", "entregado"];

const colorPrioridad = (p, activa) => {
  if (!activa) return "bg-gray-100 text-gray-500 hover:bg-gray-200";
  if (p === "alta") return "bg-red-500 text-white";
  if (p === "media") return "bg-amber-400 text-white";
  return "bg-green-500 text-white";
};

const colorEstado = (e, activo) => {
  if (!activo) return "bg-gray-100 text-gray-500 hover:bg-gray-200";
  if (e === "entregado")  return "bg-teal-600 text-white";
  if (e === "completado") return "bg-green-600 text-white";
  if (e === "en progreso") return "bg-blue-600 text-white";
  return "bg-amber-500 text-white";
};

export default function DetalleOrdenTrabajo({ orden: inicial, onClose, onGuardada, onNavegar }) {
  const [ot, setOt] = useState(inicial);
  const [form, setForm] = useState({
    titulo:             inicial.titulo             || "",
    descripcion:        inicial.descripcion        || "",
    prioridad:          inicial.prioridad           || "media",
    estado:             inicial.estado              || "pendiente",
    fechaEntrega: inicial.fechaEntrega
      ? new Date(inicial.fechaEntrega).toISOString().split("T")[0] : "",
    fechaRecibida: inicial.fechaRecibida
      ? new Date(inicial.fechaRecibida).toISOString().split("T")[0] : "",
    personalAsignado:   inicial.personalAsignado?._id || "",
    numeroOT:           inicial.numeroOT           || "",
    numeroGuiaEmision:  inicial.numeroGuiaEmision  || "",
    numeroGuiaRemision: inicial.numeroGuiaRemision || "",
  });
  const [usuarios, setUsuarios]   = useState([]);
  const [cot, setCot]             = useState(ot.cotizacion || null);
  const [oc, setOc]               = useState(null);
  const [factura, setFactura]     = useState(null);
  const [informes, setInformes]   = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState("");
  const [crearOCOpen, setCrearOCOpen] = useState(false);

  const cargarRelaciones = () => {
    Promise.all([
      fetchAuth("/cotizaciones").then(r => r.ok ? r.json() : []),
      fetchAuth("/ordenes-compra").then(r => r.ok ? r.json() : []),
      fetchAuth("/facturas").then(r => r.ok ? r.json() : []),
    ]).then(([cots, ocs, facts]) => {
      const cotId = ot.cotizacion?._id || ot.cotizacion;
      const cotResuelta =
        (cotId && cots.find(c => c._id === cotId)) ||
        (ot.numeroDocumento != null && cots.find(c => c.numeroDocumento === ot.numeroDocumento)) ||
        null;
      setCot(cotResuelta);

      const ocResuelta =
        (cotResuelta && ocs.find(o => (o.cotizacion?._id || o.cotizacion) === cotResuelta._id)) ||
        (ot.numeroDocumento != null && ocs.find(o => o.numeroDocumento === ot.numeroDocumento)) ||
        null;
      setOc(ocResuelta);

      const factResuelta =
        (ocResuelta && facts.find(f => (f.ordenCompra?._id || f.ordenCompra) === ocResuelta._id)) ||
        (ot.numeroDocumento != null && facts.find(f => f.numeroDocumento === ot.numeroDocumento)) ||
        null;
      setFactura(factResuelta);
    });

    fetchAuth(`/informes?ordenTrabajo=${ot._id}`)
      .then(r => r.ok && r.json())
      .then(infs => setInformes(infs || []));
  };

  useEffect(() => {
    fetchAuth("/personal/lista").then(r => r.ok && r.json().then(u => setUsuarios(u || [])));
    cargarRelaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ot._id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async () => {
    setGuardando(true); setError("");
    const body = { ...form };
    if (!body.personalAsignado) delete body.personalAsignado;
    if (!body.fechaEntrega) delete body.fechaEntrega;
    if (!body.fechaRecibida) delete body.fechaRecibida;

    const res = await fetchAuth(`/ordenes-trabajo/${ot._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const actualizada = await res.json();
      setOt(actualizada);
      onGuardada?.(actualizada);
    } else {
      setError("Error al guardar los cambios.");
    }
    setGuardando(false);
  };

  const anular = async (motivo) => {
    const res = await fetchAuth(`/ordenes-trabajo/${ot._id}/anular`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    if (res.ok) {
      const actualizada = await res.json();
      setOt(actualizada);
      onGuardada?.(actualizada);
    } else {
      setError("Error al anular el documento.");
    }
  };

  const ie     = ot.ingresoEquipo;
  const ultimo = informes[informes.length - 1];

  const pasos = [
    { tipo: "cotizacion", activo: !!cot,              codigo: cot?.codigo },
    { tipo: "ot",         activo: true,               codigo: ot.codigo },
    { tipo: "informe",    activo: informes.length > 0, codigo: informes.length ? `${informes.length} av.` : "" },
    { tipo: "oc",         activo: !!oc,               codigo: oc?.codigo },
    { tipo: "factura",    activo: !!factura,          codigo: factura?.codigo },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Header degradado */}
      <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose}
              className="text-sm text-white/80 hover:text-white transition flex items-center gap-1.5 group shrink-0">
              <span className="group-hover:-translate-x-0.5 transition">←</span> Órdenes de Trabajo
            </button>
            <span className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest leading-none">Orden de Trabajo</p>
              <h1 className="text-lg font-bold font-mono leading-tight">
                {ot.codigo}
                {ot.numeroDocumento != null && (
                  <span className="ml-2 text-xs font-normal text-white/60">Doc. N° {ot.numeroDocumento}</span>
                )}
              </h1>
              {ot.empresa && <p className="text-xs text-white/80 leading-tight">{ot.empresa.razonSocial}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-white/60 uppercase tracking-widest leading-none">Estado</p>
              <Chip className="mt-0.5 bg-white/20 text-white">{ot.estado}</Chip>
            </div>
            {!ot.anulado && <BotonAnular onAnular={anular} />}
            {!ot.anulado && (
              <button onClick={guardar} disabled={guardando}
                className="bg-white text-indigo-700 text-sm px-5 py-2 rounded-lg hover:bg-indigo-50 disabled:opacity-60 transition font-semibold shadow-sm shrink-0">
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
          <fieldset disabled={ot.anulado} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 self-start">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos de la orden de trabajo</h2>
            </div>

            {ot.anulado && (
              <BannerAnulado motivo={ot.motivoAnulacion} por={ot.anuladoPor} fecha={ot.fechaAnulacion} />
            )}

            {/* Ingreso de equipo (solo lectura) */}
            {ie && (
              <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Ingreso de equipo · <span className="font-mono">{ie.codigo}</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Tipo de equipo</p>
                    <input value={ie.tipoEquipo || "—"} disabled className={RO} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Marca / Modelo</p>
                    <input value={[ie.marca, ie.modelo].filter(Boolean).join(" / ") || "—"} disabled className={RO} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 block mb-1">Título</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} className={INP} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° OT</label>
                <input name="numeroOT" value={form.numeroOT} onChange={handleChange} placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha recibida</label>
                <input type="date" name="fechaRecibida" value={form.fechaRecibida} onChange={handleChange} className={INP} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° guía de llegada</label>
                <input name="numeroGuiaEmision" value={form.numeroGuiaEmision} onChange={handleChange} placeholder="—" className={INP} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">N° guía de salida</label>
                <input name="numeroGuiaRemision" value={form.numeroGuiaRemision} onChange={handleChange} placeholder="—" className={INP} />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Descripción</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                rows={3} className={`${INP} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-2">Prioridad</label>
                <div className="flex gap-1.5">
                  {PRIORIDADES.map(p => (
                    <button key={p} type="button" onClick={() => setForm({ ...form, prioridad: p })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${colorPrioridad(p, form.prioridad === p)}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha de entrega</label>
                <input type="date" name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} className={INP} />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-2">Estado</label>
              <div className="flex gap-2">
                {ESTADOS.map(e => (
                  <button key={e} type="button" onClick={() => setForm({ ...form, estado: e })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${colorEstado(e, form.estado === e)}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Personal asignado</label>
              <select name="personalAsignado" value={form.personalAsignado} onChange={handleChange} className={INP}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u._id} value={u._id}>{u.nombre}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </fieldset>

          {/* Relaciones */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-violet-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Relaciones</h2>
            </div>

            <TarjetaRelacion tipo="cotizacion" codigo={cot?.codigo} vacio={!cot}
              onClick={cot ? () => onNavegar?.({ tipo: "cotizacion", data: cot }) : undefined}>
              <p className="text-sm text-gray-700 line-clamp-2">{cot?.titulo}</p>
              {cot?.total > 0 && <p className="text-xs text-gray-500">{money(cot.total)}</p>}
            </TarjetaRelacion>

            <TarjetaRelacion tipo="ot" codigo={ot.codigo} actual>
              {ot.estado && <Chip className={badgeOT(ot.estado)}>{ot.estado}</Chip>}
              {ot.numeroOT && <p className="text-xs text-gray-500">N° OT: {ot.numeroOT}</p>}
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

            <TarjetaRelacion tipo="oc" codigo={oc?.codigo} vacio={!oc}
              onClick={oc ? () => onNavegar?.({ tipo: "oc", data: oc, extra: factura }) : undefined}
              onCrear={!oc && cot && !ot.anulado ? () => setCrearOCOpen(true) : undefined} crearLabel="OC">
              {oc?.numeroOrden && <p className="text-sm text-gray-700">{oc.numeroOrden}</p>}
              {oc?.monto > 0 && <p className="text-xs text-gray-500">{money(oc.monto)}</p>}
            </TarjetaRelacion>

            <TarjetaRelacion tipo="factura" codigo={factura?.codigo} vacio={!factura}
              onClick={factura ? () => onNavegar?.({ tipo: "factura", data: factura }) : undefined}>
              {factura?.numeroFactura && <p className="text-sm text-gray-700">{factura.numeroFactura}</p>}
              {(factura?.totalAPagar || factura?.total) > 0 && (
                <p className="text-xs text-gray-500">{money(factura.totalAPagar ?? factura.total)}</p>
              )}
              {factura?.estadoPago && <Chip className={badgePago(factura.estadoPago)}>{factura.estadoPago}</Chip>}
            </TarjetaRelacion>
          </section>
        </div>
      </div>

      {crearOCOpen && cot && (
        <ModalOrdenCompra
          cotizacion={cot}
          onClose={() => setCrearOCOpen(false)}
          onCreada={() => { setCrearOCOpen(false); cargarRelaciones(); }}
        />
      )}
    </div>
  );
}
