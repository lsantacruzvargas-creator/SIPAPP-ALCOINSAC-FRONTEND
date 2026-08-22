import { useState } from "react";
import { fetchAuth } from "../utils/fetchAuth";

const FORM_VACIO = { razonSocial: "", ruc: "", direccion: "", alias: "", plantas: [] };
const PLANTA_VACIA = { nombre: "", contactoNombre: "", contactoTelefono: "" };
const CONTACTO_VACIO = { nombre: "", telefono: "" };

export default function ModalEmpresa({ empresa, onClose, onGuardada }) {
  const [form, setForm] = useState(
    empresa
      ? {
          razonSocial: empresa.razonSocial,
          ruc: empresa.ruc,
          direccion: empresa.direccion || "",
          alias: empresa.alias || "",
          plantas: empresa.plantas || [],
        }
      : FORM_VACIO
  );
  const [plantaInput, setPlantaInput] = useState(PLANTA_VACIA);
  const [errorPlanta, setErrorPlanta] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Contacto nuevo pendiente de agregar a una planta ya creada — solo una
  // planta a la vez tiene su mini-form de "+ agregar contacto" abierto.
  const [contactoNuevo, setContactoNuevo] = useState(CONTACTO_VACIO);
  const [plantaAgregandoContacto, setPlantaAgregandoContacto] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlantaInputChange = (e) =>
    setPlantaInput({ ...plantaInput, [e.target.name]: e.target.value });

  // Cada planta nueva se crea junto con su primer contacto (mismo requisito
  // ya validado antes) — los contactos adicionales se agregan después,
  // directamente en la lista, con "+ agregar contacto".
  const agregarPlanta = () => {
    const nombre = plantaInput.nombre.trim();
    const contactoNombre = plantaInput.contactoNombre.trim();
    const contactoTelefono = plantaInput.contactoTelefono.trim();
    if (!nombre || !contactoNombre || !contactoTelefono) {
      setErrorPlanta("Completa el nombre de la planta y su primer contacto (nombre y teléfono).");
      return;
    }
    setErrorPlanta("");
    setForm((f) => ({
      ...f,
      plantas: [...f.plantas, { nombre, contactos: [{ nombre: contactoNombre, telefono: contactoTelefono }] }],
    }));
    setPlantaInput(PLANTA_VACIA);
  };

  const quitarPlanta = (idx) =>
    setForm((f) => ({ ...f, plantas: f.plantas.filter((_, i) => i !== idx) }));

  const abrirAgregarContacto = (idx) => {
    setPlantaAgregandoContacto(idx);
    setContactoNuevo(CONTACTO_VACIO);
    setErrorPlanta("");
  };

  const agregarContacto = (idx) => {
    const nombre = contactoNuevo.nombre.trim();
    const telefono = contactoNuevo.telefono.trim();
    if (!nombre || !telefono) {
      setErrorPlanta("Completa nombre y teléfono del contacto.");
      return;
    }
    setErrorPlanta("");
    setForm((f) => ({
      ...f,
      plantas: f.plantas.map((p, i) =>
        i === idx ? { ...p, contactos: [...(p.contactos || []), { nombre, telefono }] } : p
      ),
    }));
    setContactoNuevo(CONTACTO_VACIO);
    setPlantaAgregandoContacto(null);
  };

  const quitarContacto = (idxPlanta, idxContacto) =>
    setForm((f) => ({
      ...f,
      plantas: f.plantas.map((p, i) =>
        i === idxPlanta ? { ...p, contactos: p.contactos.filter((_, ci) => ci !== idxContacto) } : p
      ),
    }));

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Plantas</label>
            <p className="text-xs text-gray-400 mb-2">
              Cada planta requiere al menos un contacto (nombre y teléfono) — se pueden agregar más después.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                name="nombre"
                value={plantaInput.nombre}
                onChange={handlePlantaInputChange}
                placeholder="Nombre de la planta…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                name="contactoNombre"
                value={plantaInput.contactoNombre}
                onChange={handlePlantaInputChange}
                placeholder="Persona de contacto…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                name="contactoTelefono"
                value={plantaInput.contactoTelefono}
                onChange={handlePlantaInputChange}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarPlanta(); } }}
                placeholder="Teléfono…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            {errorPlanta && <p className="text-xs text-red-500 mb-2">{errorPlanta}</p>}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={agregarPlanta}
                className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
              >
                + Agregar planta
              </button>
            </div>
            {form.plantas.length > 0 && (
              <ul className="space-y-2">
                {form.plantas.map((p, idx) => (
                  <li key={idx} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{p.nombre}</span>
                      <button
                        type="button"
                        onClick={() => quitarPlanta(idx)}
                        className="text-gray-400 hover:text-red-500 transition text-base leading-none ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    {(p.contactos || []).length > 0 && (
                      <ul className="space-y-1">
                        {p.contactos.map((c, ci) => (
                          <li key={ci} className="flex items-center justify-between text-xs text-gray-500 pl-1">
                            <span>{c.nombre} — {c.telefono}</span>
                            <button
                              type="button"
                              onClick={() => quitarContacto(idx, ci)}
                              className="text-gray-300 hover:text-red-500 transition"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {plantaAgregandoContacto === idx ? (
                      <div className="flex gap-2 pt-1">
                        <input
                          value={contactoNuevo.nombre}
                          onChange={(e) => setContactoNuevo((c) => ({ ...c, nombre: e.target.value }))}
                          placeholder="Nombre"
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <input
                          value={contactoNuevo.telefono}
                          onChange={(e) => setContactoNuevo((c) => ({ ...c, telefono: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarContacto(idx); } }}
                          placeholder="Teléfono"
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button type="button" onClick={() => agregarContacto(idx)}
                          className="text-xs bg-gray-900 text-white px-2.5 rounded-lg hover:bg-gray-700 transition shrink-0">
                          Agregar
                        </button>
                        <button type="button" onClick={() => setPlantaAgregandoContacto(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition shrink-0">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirAgregarContacto(idx)}
                        className="text-xs text-blue-500 hover:text-blue-700 transition"
                      >
                        + Agregar contacto
                      </button>
                    )}
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
