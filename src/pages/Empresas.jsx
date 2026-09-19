import { useState, useEffect } from "react";
import { fetchAuth, getUsuario } from "../utils/fetchAuth";
import ModalEmpresa from "../components/ModalEmpresa";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");
  const esAdmin = getUsuario()?.rol === "admin";

  const eliminar = async () => {
    setBorrando(true);
    setErrorEliminar("");
    const res = await fetchAuth(`/empresas/${eliminando._id}`, { method: "DELETE" });
    if (res.ok) {
      setEmpresas((prev) => prev.filter((e) => e._id !== eliminando._id));
      setEliminando(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorEliminar(data.mensaje || "No se pudo eliminar la empresa.");
    }
    setBorrando(false);
  };

  const cargar = () =>
    fetchAuth("/empresas").then((res) => res.ok && res.json().then(setEmpresas));

  useEffect(() => { cargar(); }, []);

  const empresasFiltradas = empresas.filter((e) => {
    const q = filtro.toLowerCase();
    return e.razonSocial.toLowerCase().includes(q) || e.ruc.includes(q);
  });

  const abrirNuevo = () => {
    setEditando(null);
    setModal(true);
  };

  const abrirEditar = (empresa) => {
    setEditando(empresa);
    setModal(true);
  };

  return (
    <div className="p-6 m-0">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Empresas</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o RUC…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            onClick={abrirNuevo}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            + Nueva empresa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-500 text-white text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Alias</th>
              <th className="px-4 py-3 text-left">Razón social</th>
              <th className="px-4 py-3 text-left">RUC</th>
              <th className="px-4 py-3 text-left">Contacto</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {empresasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {filtro ? "Sin resultados para la búsqueda" : "Sin empresas registradas"}
                </td>
              </tr>
            ) : (
              empresasFiltradas.map((e) => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{e.codigo}</td>
                  <td className="px-4 py-3 font-medium">{e.alias}</td>
                  <td className="px-4 py-3">{e.razonSocial}</td>
                  <td className="px-4 py-3">{e.ruc}</td>
                  <td className="px-4 py-3">{e.plantas?.[0]?.contactos?.[0]?.nombre || "—"}</td>
                  <td className="px-4 py-3">{e.plantas?.[0]?.contactos?.[0]?.telefono || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(e)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                    {esAdmin && (
                      <button
                        onClick={() => { setEliminando(e); setErrorEliminar(""); }}
                        className="text-red-500 hover:underline text-xs ml-3"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {modal && (
        <ModalEmpresa
          empresa={editando}
          onClose={() => setModal(false)}
          onGuardada={async () => {
            await cargar();
            setModal(false);
          }}
        />
      )}

      {eliminando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-semibold text-gray-800">Eliminar empresa</h4>
            <p className="text-sm text-gray-500">
              ¿Eliminar permanentemente <strong>{eliminando.alias || eliminando.razonSocial}</strong>? Esta acción no se puede deshacer.
            </p>
            {errorEliminar && <p className="text-sm text-red-600">{errorEliminar}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEliminando(null)} disabled={borrando}
                className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={eliminar} disabled={borrando}
                className="text-sm bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium">
                {borrando ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
