import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";

const FORM_VACIO = { razonSocial: "", ruc: "", direccion: "", telefono: "", correo: "", alias: "", plantas: [] };

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [plantaInput, setPlantaInput] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const res = await fetchAuth("/empresas");
    if (res.ok) setEmpresas(await res.json());
  };

  const empresasFiltradas = empresas.filter((e) => {
    const q = filtro.toLowerCase();
    return e.razonSocial.toLowerCase().includes(q) || e.ruc.includes(q);
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const agregarPlanta = () => {
    const nombre = plantaInput.trim();
    if (!nombre) return;
    setForm((f) => ({ ...f, plantas: [...f.plantas, { nombre }] }));
    setPlantaInput("");
  };

  const quitarPlanta = (idx) =>
    setForm((f) => ({ ...f, plantas: f.plantas.filter((_, i) => i !== idx) }));

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setPlantaInput("");
    setError("");
    setModal(true);
  };

  const abrirEditar = (empresa) => {
    setEditando(empresa);
    setForm({
      razonSocial: empresa.razonSocial,
      ruc: empresa.ruc,
      direccion: empresa.direccion || "",
      telefono: empresa.telefono || "",
      correo: empresa.correo || "",
      alias: empresa.alias || "",
      plantas: empresa.plantas || [],
    });
    setPlantaInput("");
    setError("");
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetchAuth(
        editando ? `/empresas/${editando._id}` : "/empresas",
        { method: editando ? "PUT" : "POST", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) return setError(data.mensaje || "Error al guardar");
      await cargar();
      setModal(false);
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
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
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Correo</th>
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
                  <td className="px-4 py-3">{e.telefono}</td>
                  <td className="px-4 py-3">{e.correo}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(e)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              {editando ? "Editar empresa" : "Nueva empresa"}
            </h3>

            {error && (
              <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Razón social</label>
                <input
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RUC</label>
                <input
                  name="ruc"
                  value={form.ruc}
                  onChange={handleChange}
                  required
                  maxLength={11}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alias</label>
                <input
                  name="alias"
                  value={form.alias}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo de contacto</label>
                <input
                  name="correo"
                  type="email"
                  value={form.correo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              {/* Plantas */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Plantas</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={plantaInput}
                    onChange={(e) => setPlantaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarPlanta(); } }}
                    placeholder="Nombre de la planta…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <button
                    type="button"
                    onClick={agregarPlanta}
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
                  >
                    + Agregar
                  </button>
                </div>
                {form.plantas.length > 0 && (
                  <ul className="space-y-1">
                    {form.plantas.map((p, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-gray-700">{p.nombre}</span>
                        <button
                          type="button"
                          onClick={() => quitarPlanta(idx)}
                          className="text-gray-400 hover:text-red-500 transition text-base leading-none ml-2"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {cargando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
