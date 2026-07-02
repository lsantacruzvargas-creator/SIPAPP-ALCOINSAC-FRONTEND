import { useState, useEffect } from "react";
import { imgUrl, fetchAuth } from "../utils/fetchAuth";

const badgeAvance = (e) => {
  if (e === "entregado")   return "bg-teal-100 text-teal-700 border border-teal-200";
  if (e === "completado")  return "bg-green-100 text-green-700 border border-green-200";
  if (e === "en progreso") return "bg-blue-100 text-blue-700 border border-blue-200";
  if (e === "pendiente")   return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-gray-100 text-gray-500 border border-gray-200";
};

function Campo({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

function AvanceCompleto({ avance, numero }) {
  const fecha = avance.fechaHoraGuardado
    ? new Date(avance.fechaHoraGuardado).toLocaleString("es-PE", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";

  const encargado = avance.personalEncargado?.nombre || "—";
  const subordinados =
    avance.subordinados?.length > 0
      ? avance.subordinados.map((s) => s.nombre).join(", ")
      : "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Cabecera numerada */}
      <div className="flex items-center gap-3 px-6 py-4 bg-gray-800">
        <span className="w-7 h-7 rounded-full bg-white text-gray-800 text-xs flex items-center justify-center font-bold shrink-0">
          {numero}
        </span>
        <span className="text-sm text-gray-300">{fecha}</span>
        {avance.avanceOT ? (
          <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badgeAvance(avance.avanceOT)}`}>
            {avance.avanceOT}
          </span>
        ) : (
          <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-600 text-gray-300 border border-gray-500">
            Sin cambio de estado
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="px-6 py-5 space-y-5">

        {/* Título */}
        <Campo label="Título de la actividad">
          <p className="font-semibold text-base text-gray-800">
            {avance.titulo || <span className="text-gray-300 font-normal">Sin título</span>}
          </p>
        </Campo>

        {/* Descripción */}
        <Campo label="Descripción">
          {avance.descripcion
            ? <p className="whitespace-pre-wrap leading-relaxed">{avance.descripcion}</p>
            : <span className="text-gray-300">Sin descripción</span>
          }
        </Campo>

        {/* Horario */}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Hora de inicio">
            <p className="font-mono text-gray-800">{avance.horaInicio || "—"}</p>
          </Campo>
          <Campo label="Hora de término">
            <p className="font-mono text-gray-800">{avance.horaTermino || "—"}</p>
          </Campo>
        </div>

        {/* Personal */}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Personal encargado">
            <p>{encargado}</p>
          </Campo>
          <Campo label="Subordinados">
            <p>{subordinados}</p>
          </Campo>
        </div>

        {/* Ítems e imágenes */}
        {avance.items?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Ítems e imágenes
            </p>
            <div className="space-y-4">
              {avance.items.map((item, j) => (
                (item.titulo || item.imagenes?.length > 0) && (
                  <div key={j} className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {item.titulo && (
                      <p className="text-sm font-semibold text-gray-700">{item.titulo}</p>
                    )}
                    {item.imagenes?.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {item.imagenes.map((img, k) => (
                          <img
                            key={k}
                            src={imgUrl(img)}
                            alt=""
                            onClick={() => window.open(imgUrl(img), "_blank")}
                            className="w-36 h-36 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-80 transition shadow-sm"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300">Sin imágenes</p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {(!avance.items || avance.items.length === 0) && (
          <Campo label="Ítems e imágenes">
            <span className="text-gray-300">Sin ítems registrados</span>
          </Campo>
        )}
      </div>
    </div>
  );
}

function SeccionMateriales({ ordenTrabajoId }) {
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    fetchAuth(`/movimientos-almacen?ordenTrabajo=${ordenTrabajoId}&tipo=egreso`)
      .then((r) => r.ok ? r.json() : [])
      .then(setMovimientos);
  }, [ordenTrabajoId]);

  if (movimientos.length === 0) return null;

  const fmt = (n) => Number(n || 0).toFixed(2);
  const total = movimientos.reduce((s, m) => s + m.cantidad * m.precioUnitario, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-gray-800">
        <span className="text-sm text-gray-200 font-semibold">Materiales utilizados</span>
      </div>
      <div className="px-6 py-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase">Material</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase">Cant.</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Lote</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase">P. Unitario</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movimientos.map((mv) => (
              <tr key={mv._id}>
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-gray-800">{mv.material?.nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{mv.material?.codigo}</p>
                </td>
                <td className="py-2.5 text-right font-mono text-gray-700">
                  {mv.cantidad} {mv.material?.unidad}
                </td>
                <td className="py-2.5 text-xs text-gray-400 font-mono hidden sm:table-cell">
                  {mv.loteOrigen || "—"}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-600">S/ {fmt(mv.precioUnitario)}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-gray-800">S/ {fmt(mv.cantidad * mv.precioUnitario)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className="py-3 text-sm font-semibold text-gray-600 text-right pr-4">
                Total en materiales:
              </td>
              <td className="py-3 text-right font-bold text-gray-900 font-mono text-base">
                S/ {fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function VistaInformeCompleto({ ordenTrabajo, avances, onClose, onModificar }) {
  const empresa = ordenTrabajo.empresa;

  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Informe de Orden de Trabajo</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-sm text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
              {ordenTrabajo.codigo}
            </span>
            {empresa && (
              <span className="text-sm text-gray-500">
                {empresa.alias && <span className="font-medium">{empresa.alias}</span>}
                {empresa.razonSocial && <span> — {empresa.razonSocial}</span>}
              </span>
            )}
          </div>
          {ordenTrabajo.titulo && (
            <p className="text-sm text-gray-500 mt-0.5">{ordenTrabajo.titulo}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {avances.length} avance{avances.length !== 1 ? "s" : ""} registrado{avances.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none mt-1"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {avances.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-16">Sin avances registrados</p>
          ) : (
            avances.map((avance, i) => (
              <AvanceCompleto key={avance._id || i} avance={avance} numero={i + 1} />
            ))
          )}
          <SeccionMateriales ordenTrabajoId={ordenTrabajo._id} />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 px-8 py-4 flex gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-sm border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={onModificar}
          className="text-sm bg-amber-500 text-white px-5 py-2.5 rounded-lg hover:bg-amber-600 transition font-medium"
        >
          Modificar informe
        </button>
      </div>
    </div>
  );
}
