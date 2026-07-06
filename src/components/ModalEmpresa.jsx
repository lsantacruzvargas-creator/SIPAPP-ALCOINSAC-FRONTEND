import { useState } from "react";
import { fetchAuth } from "../utils/fetchAuth";

const FORM_VACIO = { razonSocial: "", ruc: "", direccion: "", alias: "", plantas: [], contactos: [] };
const CONTACTO_VACIO = { nombre: "", telefono: "", correo: "" };

export default function ModalEmpresa({ empresa, onClose, onGuardada }) {
  const [form, setForm] = useState(
    empresa
      ? {
          razonSocial: empresa.razonSocial,
          ruc: empresa.ruc,
          direccion: empresa.direccion || "",
          alias: empresa.alias || "",
          plantas: empresa.plantas || [],
          contactos: empresa.contactos || [],
        }
      : FORM_VACIO
  );
  const [plantaInput, setPlantaInput] = useState("");
  const [contactoInput, setContactoInput] = useState(CONTACTO_VACIO);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleContactoChange = (e) =>
    setContactoInput({ ...contactoInput, [e.target.name]: e.target.value });

  const agregarPlanta = () => {
    const nombre = plantaInput.trim();
    if (!nombre) return;
    setForm((f) => ({ ...f, plantas: [...f.plantas, { nombre }] }));
    setPlantaInput("");
  };

  const quitarPlanta = (idx) =>
    setForm((f) => ({ ...f, plantas: f.plantas.filter((_, i) => i !== idx) }));

  const agregarContacto = () => {
    const nombre = contactoInput.nombre.trim();
    if (!nombre) return;
    setForm((f) => ({ ...f, contactos: [...f.contactos, { ...contactoInput, nombre }] }));
    setContactoInput(CONTACTO_VACIO);
  };

  const quitarContacto = (idx) =>
    setForm((f) => ({ ...f, contactos: f.contactos.filter((_, i) => i !== idx) }));

  const guardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetchAuth(
        empresa ? `/empresas/${empresa._id}` : "/empresas",
        { method: empresa ? "PUT" : "POST", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) return setError(data.mensaje || "Error al guardar");
      onGuardada?.(data);
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          {empresa ? "Editar empresa" : "Nueva empresa"}
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
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Contactos</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                name="nombre"
                value={contactoInput.nombre}
                onChange={handleContactoChange}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarContacto(); } }}
                placeholder="Persona de contacto…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                name="telefono"
                value={contactoInput.telefono}
                onChange={handleContactoChange}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarContacto(); } }}
                placeholder="Teléfono…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                name="correo"
                type="email"
                value={contactoInput.correo}
                onChange={handleContactoChange}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarContacto(); } }}
                placeholder="Correo…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={agregarContacto}
                className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
              >
                + Agregar
              </button>
            </div>
            {form.contactos.length > 0 && (
              <ul className="space-y-1">
                {form.contactos.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-gray-700">
                      {c.nombre}
                      {(c.telefono || c.correo) && (
                        <span className="text-gray-400"> — {[c.telefono, c.correo].filter(Boolean).join(" · ")}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarContacto(idx)}
                      className="text-gray-400 hover:text-red-500 transition text-base leading-none ml-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              onClick={onClose}
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
  );
}
