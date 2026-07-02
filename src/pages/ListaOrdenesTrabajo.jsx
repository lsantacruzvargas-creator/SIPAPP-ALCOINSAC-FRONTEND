import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import ModalVerOT from "../components/ModalVerOT";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FILTROS_VACIO = { ano: "", mes: "", prioridad: "", estado: "", empresa: "", planta: "", busqueda: "" };

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

const SELECT =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400";

export default function ListaOrdenesTrabajo() {
  const [ordenes, setOrdenes] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIO);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    fetchAuth("/ordenes-trabajo").then((r) => r.ok && r.json().then(setOrdenes));
  }, []);

  const anos = [...new Set(ordenes.map((o) => new Date(o.createdAt).getFullYear()))].sort(
    (a, b) => b - a
  );

  const empresasLista = [
    ...new Map(
      ordenes
        .filter((o) => o.empresa?._id)
        .map((o) => [o.empresa._id, o.empresa])
    ).values(),
  ].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));

  const plantasLista = [
    ...new Set(
      ordenes.map((o) => o.ingresoEquipo?.planta).filter(Boolean)
    ),
  ].sort();

  const handleFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });

  const filtradas = ordenes.filter((o) => {
    const fecha = new Date(o.createdAt);
    const q = filtros.busqueda.toLowerCase();
    return (
      (!filtros.ano || fecha.getFullYear() === parseInt(filtros.ano)) &&
      (!filtros.mes || fecha.getMonth() + 1 === parseInt(filtros.mes)) &&
      (!filtros.prioridad || o.prioridad === filtros.prioridad) &&
      (!filtros.estado || o.estado === filtros.estado) &&
      (!filtros.empresa || o.empresa?._id === filtros.empresa) &&
      (!filtros.planta || o.ingresoEquipo?.planta === filtros.planta) &&
      (!q ||
        o.codigo?.toLowerCase().includes(q) ||
        o.titulo?.toLowerCase().includes(q) ||
        o.empresa?.razonSocial?.toLowerCase().includes(q) ||
        o.empresa?.ruc?.includes(q) ||
        o.cotizacion?.codigo?.toLowerCase().includes(q))
    );
  });

  return (
    <>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Órdenes de Trabajo</h2>
        <span className="text-sm text-gray-400">{filtradas.length} orden{filtradas.length !== 1 ? "es" : ""}</span>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">

<select name="empresa" value={filtros.empresa} onChange={handleFiltro} className={SELECT}>
          <option value="">Toda empresa</option>
          {empresasLista.map((e) => (
            <option key={e._id} value={e._id}>
              {e.alias ? `${e.alias} — ` : ""}{e.razonSocial}
            </option>
          ))}
        </select>

        {plantasLista.length > 0 && (
          <select name="planta" value={filtros.planta} onChange={handleFiltro} className={SELECT}>
            <option value="">Toda planta</option>
            {plantasLista.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}        

        <select name="prioridad" value={filtros.prioridad} onChange={handleFiltro} className={SELECT}>
          <option value="">Toda prioridad</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>

        <select name="estado" value={filtros.estado} onChange={handleFiltro} className={SELECT}>
          <option value="">Todo estado</option>
          <option value="pendiente">Pendiente</option>
          <option value="en progreso">En progreso</option>
          <option value="completado">Completado</option>
          <option value="entregado">Entregado</option>
        </select>

        

        <select name="ano" value={filtros.ano} onChange={handleFiltro} className={SELECT}>
          <option value="">Todos los años</option>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select name="mes" value={filtros.mes} onChange={handleFiltro} className={SELECT}>
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <input
          name="busqueda"
          value={filtros.busqueda}
          onChange={handleFiltro}
          placeholder="Buscar OT por código, cotización, empresa o título…"
          className={`${SELECT} flex-1 min-w-52`}
        />

        {Object.values(filtros).some(Boolean) && (
          <button
            onClick={() => setFiltros(FILTROS_VACIO)}
            className="text-sm text-gray-400 hover:text-gray-700 transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-500 text-white text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código OT</th>
              <th className="px-4 py-3 text-left">Cotización</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-center">Prioridad</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-left">Personal</th>
              <th className="px-4 py-3 text-center">F. Entrega</th>
              <th className="px-4 py-3 text-center">F. Creación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  {Object.values(filtros).some(Boolean)
                    ? "Sin resultados para los filtros aplicados"
                    : "Sin órdenes de trabajo registradas"}
                </td>
              </tr>
            ) : (
              filtradas.map((o) => (
                <tr
                  key={o._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSeleccionada(o)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.codigo}</td>
                  <td className="px-4 py-3 font-mono text-ms text-black-400">
                    {o.cotizacion?.codigo || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.empresa ? (
                      <span>
                        <span className="font-medium">{o.empresa.alias}</span>
                        <span className="text-gray-400"> — {o.empresa.razonSocial}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin empresa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{o.titulo}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgePrioridad(o.prioridad)}`}>
                      {o.prioridad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgeEstado(o.estado)}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.personalAsignado?.nombre || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {o.fechaEntrega
                      ? new Date(o.fechaEntrega).toLocaleDateString("es-PE")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString("es-PE")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>

    {seleccionada && (
      <ModalVerOT
        orden={seleccionada}
        onClose={() => setSeleccionada(null)}
        onActualizada={(actualizada) => {
          setOrdenes((prev) =>
            prev.map((o) => (o._id === actualizada._id ? actualizada : o))
          );
          setSeleccionada(actualizada);
        }}
      />
    )}
    </>
  );
}
