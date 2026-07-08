import { useState } from "react";
import { CATALOGO_SERVICIOS } from "../utils/catalogoServicios";

// Panel lateral para elegir ítems del catálogo de servicios. El padre decide
// si el ítem se fusiona con la última fila (mismo grupo) o abre una nueva —
// este componente solo informa qué grupo/texto se clickeó.
export default function SelectorCatalogoServicios({ onSeleccionar, onClose }) {
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set());

  const q = busqueda.trim().toLowerCase();

  const toggleGrupo = (grupo) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(grupo)) next.delete(grupo);
      else next.add(grupo);
      return next;
    });
  };

  const gruposFiltrados = CATALOGO_SERVICIOS
    .map((g) => {
      const matchGrupo = g.grupo.toLowerCase().includes(q);
      const items = !q || matchGrupo ? g.items : g.items.filter((it) => it.toLowerCase().includes(q));
      return { ...g, items, matchGrupo };
    })
    .filter((g) => !q || g.matchGrupo || g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-gray-800">Catálogo de servicios</h4>
              <p className="text-xs text-gray-500 mt-0.5">Click en un ítem para agregarlo a la cotización</p>
            </div>
            <button type="button" onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0">✕</button>
          </div>
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar servicio o palabra clave…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {gruposFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin resultados para “{busqueda}”.</p>
          ) : (
            gruposFiltrados.map((g) => {
              const abierto = q ? true : abiertos.has(g.grupo);
              return (
                <div key={g.grupo} className="mt-1">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(g.grupo)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
                      {g.grupo} <span className="text-gray-400 font-normal normal-case">({g.items.length})</span>
                    </span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                  {abierto && (
                    <div className="pl-3 pb-1">
                      {g.items.map((texto, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => onSeleccionar(g.grupo, texto)}
                          className="w-full text-left flex items-start gap-2 px-3 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-gray-600 hover:text-gray-800 transition"
                        >
                          <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                          <span className="flex-1">{texto}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 text-center shrink-0">
          <p className="text-[11px] text-gray-400">
            Grupo → columna <b>Item</b> · ítem elegido → columna <b>Descripción</b>
          </p>
        </div>
      </div>
    </div>
  );
}
