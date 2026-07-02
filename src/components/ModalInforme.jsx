import { useState, useEffect, useCallback } from "react";
import { fetchAuth, uploadAuth, imgUrl } from "../utils/fetchAuth";
import { INP } from "../utils/cotizacionItems";
import VistaInformeCompleto from "./VistaInformeCompleto";

const AVANCES = [
  { valor: "", label: "Sin cambio" },
  { valor: "pendiente", label: "Pendiente" },
  { valor: "en progreso", label: "En progreso" },
  { valor: "completado", label: "Completado" },
  { valor: "entregado", label: "Entregado" },
];

const colorAvance = (v, activo) => {
  if (!activo) return "bg-gray-100 text-gray-500 hover:bg-gray-200";
  if (v === "entregado")  return "bg-teal-600 text-white";
  if (v === "completado") return "bg-green-600 text-white";
  if (v === "en progreso") return "bg-blue-600 text-white";
  if (v === "pendiente") return "bg-amber-500 text-white";
  return "bg-gray-200 text-gray-600";
};

const badgeAvance = (e) => {
  if (e === "entregado")  return "bg-teal-50 text-teal-700";
  if (e === "completado") return "bg-green-50 text-green-700";
  if (e === "en progreso") return "bg-blue-50 text-blue-700";
  if (e === "pendiente") return "bg-amber-50 text-amber-700";
  return "";
};

const FORM_VACIO = {
  titulo: "", descripcion: "", horaInicio: "", horaTermino: "",
  personalEncargado: "", avanceOT: "",
};

const FORM_MAT_VACIO = { material: "", cantidad: "", loteOrigen: "" };

// ─── Sub-componente selector de materiales para informe ────────────────────
function TabMateriales({ ordenTrabajo }) {
  const [movimientos, setMovimientos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [form, setForm] = useState(FORM_MAT_VACIO);
  const [precioAuto, setPrecioAuto] = useState(0);
  const [unidadAuto, setUnidadAuto] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [rm, rmat] = await Promise.all([
      fetchAuth(`/movimientos-almacen?ordenTrabajo=${ordenTrabajo._id}&tipo=egreso`),
      fetchAuth("/materiales"),
    ]);
    if (rm.ok) setMovimientos(await rm.json());
    if (rmat.ok) setMateriales(await rmat.json());
  }, [ordenTrabajo._id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!form.material) { setLotes([]); setPrecioAuto(0); setUnidadAuto(""); return; }
    fetchAuth(`/movimientos-almacen/lotes/${form.material}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setLotes);
    const mat = materiales.find((m) => m._id === form.material);
    setUnidadAuto(mat?.unidad || "");
  }, [form.material, materiales]);

  const seleccionarLote = (l) => {
    setForm((prev) => ({ ...prev, loteOrigen: l.lote }));
    setPrecioAuto(l.precioUnitario);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async () => {
    if (!form.material || !form.cantidad) {
      setError("Selecciona material y cantidad.");
      return;
    }
    setGuardando(true);
    setError("");
    const r = await fetchAuth("/movimientos-almacen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "egreso",
        material: form.material,
        cantidad: Number(form.cantidad),
        loteOrigen: form.loteOrigen,
        precioUnitario: precioAuto,
        ordenTrabajo: ordenTrabajo._id,
        notas: `Consumido en OT ${ordenTrabajo.codigo}`,
      }),
    });
    if (r.ok) {
      await cargar();
      setForm(FORM_MAT_VACIO);
      setLotes([]);
      setPrecioAuto(0);
      setAgregando(false);
    } else {
      const d = await r.json();
      setError(d.mensaje || "Error al guardar");
    }
    setGuardando(false);
  };

  const total = movimientos.reduce((s, m) => s + m.cantidad * m.precioUnitario, 0);
  const fmt = (n) => Number(n || 0).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Tabla de materiales ya consumidos */}
      {movimientos.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Material</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Cant.</th>
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-semibold uppercase hidden sm:table-cell">Lote</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-semibold uppercase">P. Unit.</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-semibold uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movimientos.map((mv) => (
                <tr key={mv._id}>
                  <td className="px-4 py-2 text-gray-800">
                    <p className="font-medium">{mv.material?.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{mv.material?.codigo}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">
                    {mv.cantidad} {mv.material?.unidad}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400 hidden sm:table-cell">
                    {mv.loteOrigen || "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600">S/ {fmt(mv.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-gray-800">
                    S/ {fmt(mv.cantidad * mv.precioUnitario)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-600 text-right">
                  Total consumido:
                </td>
                <td className="px-4 py-2 text-right font-bold text-gray-900 font-mono">
                  S/ {fmt(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {movimientos.length === 0 && !agregando && (
        <p className="text-sm text-gray-300 text-center py-8 border border-dashed border-gray-100 rounded-xl">
          Sin materiales registrados para esta OT
        </p>
      )}

      {/* Formulario agregar material */}
      {agregando && (
        <div className="border-2 border-blue-100 rounded-xl p-5 space-y-4 bg-blue-50/20">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Agregar material</p>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Material</label>
            <select name="material" value={form.material} onChange={handleChange} className={`w-full ${INP}`}>
              <option value="">Seleccionar…</option>
              {materiales.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.codigo} — {m.nombre} (stock: {m.stock} {m.unidad})
                </option>
              ))}
            </select>
          </div>

          {lotes.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-2">Lote (selecciona para cargar precio)</label>
              <div className="space-y-2">
                {lotes.map((l) => (
                  <button key={l.lote} type="button" onClick={() => seleccionarLote(l)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition ${
                      form.loteOrigen === l.lote
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className="flex justify-between">
                      <span className="font-mono text-gray-700">{l.lote}</span>
                      <span className="font-semibold text-gray-800">S/ {fmt(l.precioUnitario)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {l.proveedor && <span>{l.proveedor} · </span>}
                      <span>Disponible: {l.cantidadDisponible} {unidadAuto}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lotes.length === 0 && form.material && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              No hay lotes con stock disponible para este material.
            </p>
          )}

          {form.loteOrigen && (
            <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-sm flex justify-between">
              <span className="text-blue-700">Precio unitario del lote:</span>
              <span className="font-semibold text-blue-800">S/ {fmt(precioAuto)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Cantidad *</label>
              <input type="number" name="cantidad" value={form.cantidad} onChange={handleChange}
                min={0.01} step="any" className={`w-full ${INP}`} placeholder="0" />
            </div>
            {form.cantidad && precioAuto > 0 && (
              <div className="flex items-end pb-2">
                <p className="text-sm text-gray-600">
                  Subtotal: <span className="font-semibold text-gray-800">S/ {fmt(form.cantidad * precioAuto)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAgregando(false); setForm(FORM_MAT_VACIO); setError(""); }}
              className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="button" onClick={guardar} disabled={guardando}
              className="text-sm bg-amber-500 text-white px-5 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition font-medium">
              {guardando ? "Guardando…" : "Registrar consumo"}
            </button>
          </div>
        </div>
      )}

      {!agregando && (
        <button type="button" onClick={() => setAgregando(true)}
          className="w-full text-sm border-2 border-dashed border-gray-200 text-gray-400 py-3 rounded-xl hover:border-blue-300 hover:text-blue-500 transition">
          + Agregar material consumido
        </button>
      )}
    </div>
  );
}

// Módulo-nivel — evita pérdida de foco
function FilaItem({ item, onUpdate, onRemove, onSubirImagenes, subiendo }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Ítem</span>
        <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 transition">
          Eliminar
        </button>
      </div>
      <input
        type="text"
        value={item.titulo}
        onChange={(e) => onUpdate(item._key, e.target.value)}
        placeholder="Título del ítem"
        className={`w-full ${INP}`}
      />
      <div className="flex flex-wrap gap-2">
        {item.imagenes.map((img, i) => (
          <img key={i} src={imgUrl(img)} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
        ))}
        <label className={`w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition text-gray-400 select-none
          ${subiendo ? "opacity-50 cursor-wait border-gray-200" : "border-gray-300 hover:border-blue-400 hover:text-blue-400"}`}
        >
          <span className="text-xl leading-none">📷</span>
          <span className="text-xs mt-0.5">{subiendo ? "…" : "Foto"}</span>
          <input
            type="file" accept="image/*" multiple className="hidden"
            disabled={subiendo}
            onChange={(e) => onSubirImagenes(item._key, e.target.files)}
          />
        </label>
      </div>
    </div>
  );
}

// Tarjeta de avance guardado — siempre read-only
function AvanceCard({ avance }) {
  const fecha = avance.fechaHoraGuardado
    ? new Date(avance.fechaHoraGuardado).toLocaleString("es-PE", {
        dateStyle: "short", timeStyle: "short",
      })
    : "—";

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-2.5 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono">{fecha}</span>
        {avance.avanceOT && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgeAvance(avance.avanceOT)}`}>
            {avance.avanceOT}
          </span>
        )}
      </div>

      {avance.titulo && (
        <p className="font-semibold text-sm text-gray-800">{avance.titulo}</p>
      )}
      {avance.descripcion && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{avance.descripcion}</p>
      )}
      {(avance.horaInicio || avance.horaTermino) && (
        <p className="text-xs text-gray-400">
          ⏱ {avance.horaInicio || "?"} — {avance.horaTermino || "?"}
        </p>
      )}
      {(avance.personalEncargado || avance.subordinados?.length > 0) && (
        <p className="text-xs text-gray-500">
          {avance.personalEncargado?.nombre && `👤 ${avance.personalEncargado.nombre}`}
          {avance.subordinados?.length > 0 &&
            ` + ${avance.subordinados.map((s) => s.nombre).join(", ")}`}
        </p>
      )}
      {avance.items?.map((item, i) =>
        (item.titulo || item.imagenes?.length > 0) ? (
          <div key={i} className="space-y-1">
            {item.titulo && (
              <p className="text-xs text-gray-400 font-medium">{item.titulo}</p>
            )}
            {item.imagenes?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.imagenes.map((img, j) => (
                  <img key={j} src={imgUrl(img)} alt=""
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                ))}
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function ModalInforme({ ordenTrabajo, onClose, onGuardado }) {
  const [avances, setAvances] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [subordinados, setSubordinados] = useState([]);
  const [items, setItems] = useState([]);
  const [subiendoKey, setSubiendoKey] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [verCompleto, setVerCompleto] = useState(false);
  const [tabActiva, setTabActiva] = useState("avances");

  useEffect(() => {
    Promise.all([
      fetchAuth("/usuarios/lista").then((r) => r.ok ? r.json() : []),
      fetchAuth(`/informes?ordenTrabajo=${ordenTrabajo._id}`).then((r) => r.ok ? r.json() : []),
    ]).then(([users, data]) => {
      setUsuarios(users);
      setAvances(Array.isArray(data) ? data : []);
      setCargando(false);
    });
  }, [ordenTrabajo._id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleSubordinado = (id) =>
    setSubordinados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const agregarItem = () =>
    setItems((prev) => [
      ...prev,
      { _key: Date.now() + Math.random(), titulo: "", imagenes: [] },
    ]);

  const actualizarItem = (key, titulo) =>
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, titulo } : it)));

  const eliminarItem = (key) =>
    setItems((prev) => prev.filter((it) => it._key !== key));

  const subirImagenes = async (key, files) => {
    setSubiendoKey(key);
    const urls = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("imagen", file);
      const res = await uploadAuth("/informes/subir-imagen", fd);
      if (res.ok) urls.push((await res.json()).url);
    }
    setItems((prev) =>
      prev.map((it) =>
        it._key === key ? { ...it, imagenes: [...it.imagenes, ...urls] } : it
      )
    );
    setSubiendoKey(null);
  };

  const cancelarNuevo = () => {
    setAgregando(false);
    setForm(FORM_VACIO);
    setSubordinados([]);
    setItems([]);
  };

  const guardar = async () => {
    setGuardando(true);
    const payload = {
      ordenTrabajo: ordenTrabajo._id,
      ...form,
      subordinados,
      items: items.map((it) => ({ titulo: it.titulo, imagenes: it.imagenes })),
    };
    if (!payload.personalEncargado) delete payload.personalEncargado;

    const res = await fetchAuth("/informes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setAvances((prev) => [...prev, data]);
      cancelarNuevo();
      onGuardado(data);
    }
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between px-6 pt-4 pb-0">
            <div>
              <h3 className="font-semibold text-gray-800">Informe de avance</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{ordenTrabajo.codigo}</p>
            </div>
            <div className="flex items-center gap-3">
              {avances.length > 0 && (
                <span className="text-xs text-gray-400">
                  {avances.length} avance{avances.length !== 1 ? "s" : ""}
                </span>
              )}
              <button type="button" onClick={onClose}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
          </div>
          <div className="flex px-6 mt-3 gap-1">
            {[{ id: "avances", label: "Avances" }, { id: "materiales", label: "Materiales" }].map((t) => (
              <button key={t.id} type="button" onClick={() => setTabActiva(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  tabActiva === t.id
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {tabActiva === "materiales" && (
            <TabMateriales ordenTrabajo={ordenTrabajo} />
          )}
          {tabActiva === "avances" && cargando ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
          ) : tabActiva === "avances" ? (
            <>
              {/* Avances guardados — read-only */}
              {avances.length === 0 && !agregando && (
                <p className="text-sm text-gray-300 text-center py-8 border border-dashed border-gray-100 rounded-xl">
                  Sin avances registrados
                </p>
              )}
              {avances.map((a, i) => <AvanceCard key={a._id || i} avance={a} />)}

              {/* Formulario nuevo avance */}
              {agregando && (
                <div className="border-2 border-blue-100 rounded-xl p-5 space-y-4 bg-blue-50/20">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    Nuevo avance
                  </p>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Título de la actividad</label>
                    <input name="titulo" value={form.titulo} onChange={handleChange}
                      className={`w-full ${INP}`} placeholder="Actividad realizada…" />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                    <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                      rows={3} className={`w-full ${INP} resize-none`}
                      placeholder="Detalle de lo realizado…" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Hora de inicio</label>
                      <input type="time" name="horaInicio" value={form.horaInicio}
                        onChange={handleChange} className={`w-full ${INP}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Hora de término</label>
                      <input type="time" name="horaTermino" value={form.horaTermino}
                        onChange={handleChange} className={`w-full ${INP}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Personal encargado</label>
                      <select name="personalEncargado" value={form.personalEncargado}
                        onChange={handleChange} className={`w-full ${INP}`}>
                        <option value="">Sin asignar</option>
                        {usuarios.map((u) => (
                          <option key={u._id} value={u._id}>{u.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Avance de la OT</label>
                      <div className="flex gap-1 flex-wrap">
                        {AVANCES.map(({ valor, label }) => (
                          <button key={valor} type="button"
                            onClick={() => setForm({ ...form, avanceOT: valor })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${colorAvance(valor, form.avanceOT === valor)}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {usuarios.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Subordinados</label>
                      <div className="flex flex-wrap gap-2">
                        {usuarios.map((u) => (
                          <label key={u._id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                              subordinados.includes(u._id)
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}>
                            <input type="checkbox" checked={subordinados.includes(u._id)}
                              onChange={() => toggleSubordinado(u._id)}
                              className="accent-blue-600" />
                            {u.nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500">Ítems e imágenes</label>
                      <button type="button" onClick={agregarItem}
                        className="text-xs text-gray-500 hover:text-gray-800 transition">
                        + Agregar ítem
                      </button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <FilaItem key={item._key} item={item}
                          onUpdate={actualizarItem}
                          onRemove={() => eliminarItem(item._key)}
                          onSubirImagenes={subirImagenes}
                          subiendo={subiendoKey === item._key}
                        />
                      ))}
                      {items.length === 0 && (
                        <p className="text-xs text-gray-300 text-center py-3 border border-dashed border-gray-100 rounded-xl">
                          Sin ítems
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={cancelarNuevo}
                      className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                      Cancelar
                    </button>
                    <button type="button" onClick={guardar}
                      disabled={guardando || !!subiendoKey}
                      className="text-sm bg-amber-500 text-white px-5 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition font-medium">
                      {guardando ? "Guardando…" : "Guardar avance"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer — solo visible en tab avances cuando no se está agregando */}
        {tabActiva === "avances" && !cargando && !agregando && (
          <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
            {avances.length > 0 && (
              <button
                type="button"
                onClick={() => setVerCompleto(true)}
                className="flex-1 text-sm bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Ver informe completo
              </button>
            )}
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className={`text-sm bg-amber-500 text-white py-2.5 rounded-lg hover:bg-amber-600 transition font-medium ${avances.length > 0 ? "flex-1" : "w-full"}`}
            >
              + Nuevo avance
            </button>
          </div>
        )}
      </div>

      {verCompleto && (
        <VistaInformeCompleto
          ordenTrabajo={ordenTrabajo}
          avances={avances}
          onClose={() => setVerCompleto(false)}
          onModificar={() => setVerCompleto(false)}
        />
      )}
    </div>
  );
}
