import { useState } from "react";
import ModalEditarOT from "./ModalEditarOT";
import ModalInforme from "./ModalInforme";

const badgePrioridad = (p) => {
  if (p === "alta") return "bg-red-50 text-red-700";
  if (p === "media") return "bg-amber-50 text-amber-700";
  return "bg-green-50 text-green-700";
};

const badgeEstado = (e) => {
  if (e === "entregado")   return "bg-teal-50 text-teal-700";
  if (e === "completado")  return "bg-green-50 text-green-700";
  if (e === "en progreso") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

const RO = "bg-gray-50 border border-gray-100 rounded px-2 py-1.5 text-sm text-gray-700 w-full";

export default function ModalVerOT({ orden: inicial, onClose, onActualizada }) {
  const [ot, setOt] = useState(inicial);
  const [editarOT, setEditarOT] = useState(false);
  const [verInforme, setVerInforme] = useState(false);

  const empresa = ot.empresa;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-700">{ot.codigo}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgePrioridad(ot.prioridad)}`}>
              {ot.prioridad}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgeEstado(ot.estado)}`}>
              {ot.estado}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-2"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Info cliente */}
          {empresa && (
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Empresa</p>
                <input value={empresa.razonSocial} disabled className={RO} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">RUC</p>
                <input value={empresa.ruc || ""} disabled className={RO} />
              </div>
              {empresa.direccion && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Dirección</p>
                  <input value={empresa.direccion} disabled className={RO} />
                </div>
              )}
            </div>
          )}

          {/* Ingreso de equipo */}
          {ot.ingresoEquipo && (
            <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Ingreso de equipo · <span className="font-mono">{ot.ingresoEquipo.codigo}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Tipo de equipo</p>
                  <input value={ot.ingresoEquipo.tipoEquipo || "—"} disabled className={RO} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Marca / Modelo</p>
                  <input
                    value={[ot.ingresoEquipo.marca, ot.ingresoEquipo.modelo].filter(Boolean).join(" / ") || "—"}
                    disabled className={RO}
                  />
                </div>
                {ot.ingresoEquipo.planta && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Planta</p>
                    <input value={ot.ingresoEquipo.planta} disabled className={RO} />
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Fecha de ingreso</p>
                  <input
                    value={ot.ingresoEquipo.fechaIngreso ? new Date(ot.ingresoEquipo.fechaIngreso).toLocaleDateString("es-PE") : "—"}
                    disabled className={RO}
                  />
                </div>
                {ot.ingresoEquipo.caracteristicasElectricas && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Características eléctricas</p>
                    <input value={ot.ingresoEquipo.caracteristicasElectricas} disabled className={RO} />
                  </div>
                )}
                {ot.ingresoEquipo.accesorios && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Accesorios</p>
                    <input value={ot.ingresoEquipo.accesorios} disabled className={RO} />
                  </div>
                )}
                {ot.ingresoEquipo.descripcionProblema && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Descripción del problema</p>
                    <textarea value={ot.ingresoEquipo.descripcionProblema} disabled rows={2} className={`${RO} resize-none`} />
                  </div>
                )}
                {ot.ingresoEquipo.numeroGuiaEmision && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">N° guía de emisión</p>
                    <input value={ot.ingresoEquipo.numeroGuiaEmision} disabled className={`${RO} font-mono`} />
                  </div>
                )}
                {ot.ingresoEquipo.garantia && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Garantía</p>
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      En garantía
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Datos OT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">Título</p>
              <input value={ot.titulo} disabled className={RO} />
            </div>
            {ot.descripcion && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Descripción</p>
                <textarea value={ot.descripcion} disabled rows={2} className={`${RO} resize-none`} />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Cotización</p>
              <input value={ot.cotizacion?.codigo || "—"} disabled className={`${RO} font-mono`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Personal asignado</p>
              <input value={ot.personalAsignado?.nombre || "Sin asignar"} disabled className={RO} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Fecha de entrega</p>
              <input
                value={ot.fechaEntrega ? new Date(ot.fechaEntrega).toLocaleDateString("es-PE") : "—"}
                disabled
                className={RO}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Fecha de creación</p>
              <input
                value={new Date(ot.createdAt).toLocaleDateString("es-PE")}
                disabled
                className={RO}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => setEditarOT(true)}
            className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Modificar OT
          </button>
          <button
            type="button"
            onClick={() => setVerInforme(true)}
            className="flex-1 text-sm bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 transition font-medium"
          >
            Modificar Informe
          </button>
        </div>
      </div>

      {editarOT && (
        <ModalEditarOT
          orden={ot}
          onClose={() => setEditarOT(false)}
          onGuardada={(actualizada) => {
            setOt(actualizada);
            onActualizada(actualizada);
            setEditarOT(false);
          }}
        />
      )}

      {verInforme && (
        <ModalInforme
          ordenTrabajo={ot}
          onClose={() => setVerInforme(false)}
          onGuardado={(informe) => {
            if (informe.avanceOT) {
              const nueva = { ...ot, estado: informe.avanceOT };
              setOt(nueva);
              onActualizada(nueva);
            }
            // El usuario cierra el informe manualmente con ✕
          }}
        />
      )}
    </div>
  );
}
