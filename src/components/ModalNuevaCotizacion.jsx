import { useState, useEffect } from "react";
import { fetchAuth } from "../utils/fetchAuth";
import { calcSubtotal, itemInvalido } from "../utils/cotizacionItems";
import TablaItemsCotizacion from "./TablaItemsCotizacion";

const INP = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 w-full transition";

function calcular(sub) {
  const s = Math.round(Number(sub) * 100) / 100 || 0;
  const igv = Math.round(s * 0.18 * 100) / 100;
  return { subtotal: s, igv, total: Math.round((s + igv) * 100) / 100 };
}

const FORM_VACIO = {
  empresa: "", tipo: "venta", numeroCotizacion: "", atencion: "",
  fecha: new Date().toISOString().split("T")[0], fechaRecibida: "",
  titulo: "", encargado: "", planta: "", condicionPago: "",
  plazoEntrega: "", lugarEntrega: "", validezOferta: "",
  numeroGuiaEmision: "", numeroGuiaRemision: "", codigoSap: "", fechaSalida: "",
  subtotal: "",
};

// Cotización "en frío": se crea sin partir de ninguna Orden de Trabajo (se
// cotiza antes de inspeccionar el equipo). Reutiliza TablaItemsCotizacion
// para el catálogo de servicios; "Generar OT" queda deshabilitado aquí
// (seleccionables=false) porque la cotización aún no tiene `_id`.
export default function ModalNuevaCotizacion({ onClose, onCreada }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [items, setItems] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAuth("/empresas").then(r => r.ok && r.json()).then(d => setEmpresas(d || []));
    fetchAuth("/cotizaciones/siguiente-numero-cotizacion").then(r =>
      r.ok && r.json().then(d => setForm(f => ({ ...f, numeroCotizacion: d.siguiente })))
    );
  }, []);

  const empresaSel = empresas.find(e => e._id === form.empresa);
  const plantasEmpresa = empresaSel?.plantas ?? [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value, ...(name === "empresa" ? { planta: "" } : {}) }));
  };

  const subtotalItems = parseFloat(items.reduce((acc, i) => acc + calcSubtotal(i), 0).toFixed(2));
  const usarTotalesDeItems = items.length > 0;
  const totalesMostrados = usarTotalesDeItems ? calcular(subtotalItems) : calcular(form.subtotal);

  const guardar = async () => {
    setIntentoGuardar(true);
    if (!form.titulo.trim()) return setError("El título / descripción es obligatorio.");
    if (items.some(itemInvalido)) {
      return setError("Hay ítems con campos obligatorios sin completar (descripción, cantidad o precio). Corrígelos antes de guardar — resaltados en rojo.");
    }
    setError(""); setGuardando(true);

    const payload = {
      tipo:               form.tipo,
      condicionPago:      form.condicionPago,
      titulo:             form.titulo,
      numeroCotizacion:   form.numeroCotizacion,
      atencion:           form.atencion,
      encargado:          form.encargado,
      planta:             form.planta,
      plazoEntrega:       form.plazoEntrega,
      lugarEntrega:       form.lugarEntrega,
      validezOferta:      form.validezOferta,
      subtotal:           totalesMostrados.subtotal,
      igv:                totalesMostrados.igv,
      total:              totalesMostrados.total,
      numeroGuiaEmision:  form.numeroGuiaEmision,
      numeroGuiaRemision: form.numeroGuiaRemision,
      codigoSap:          form.codigoSap,
      fechaSalida:        form.fechaSalida || null,
      items: items.map(i => {
        const it = {
          descripcion: i.descripcion, cantidad: i.cantidad, precio: i.precio,
          moneda: i.moneda, subtotal: calcSubtotal(i),
        };
        if (i.subItems?.length > 0) it.subItems = i.subItems.map(s => s.texto).filter(Boolean);
        return it;
      }),
    };
    if (form.empresa) payload.empresa = form.empresa;
    if (form.fecha) payload.fecha = form.fecha;
    if (form.fechaRecibida) payload.fechaRecibida = form.fechaRecibida;

    const res = await fetchAuth("/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const nueva = await res.json();
      onCreada?.(nueva);
    } else {
      setError("Error al crear la cotización.");
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 flex flex-col">

      <div className="shrink-0 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-8 py-4">
        <h3 className="font-semibold text-gray-800 text-lg">Nueva Cotización</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Empresa</label>
            <select name="empresa" value={form.empresa} onChange={handleChange} className={INP}>
              <option value="">— Sin empresa —</option>
              {empresas.map(e => (
                <option key={e._id} value={e._id}>{e.alias ? `${e.alias} — ` : ""}{e.razonSocial}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">N° Cotización</label>
              <input name="numeroCotizacion" value={form.numeroCotizacion} onChange={handleChange} placeholder="—" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={INP} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Atención</label>
              <input name="atencion" value={form.atencion} onChange={handleChange} placeholder="Ej. Área de Compras" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={INP}>
                <option value="venta">Venta</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Encargado</label>
              <input name="encargado" value={form.encargado} onChange={handleChange} placeholder="Nombre del encargado" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Planta</label>
              {plantasEmpresa.length > 0 ? (
                <select name="planta" value={form.planta} onChange={handleChange} className={INP}>
                  <option value="">— Seleccionar planta —</option>
                  {plantasEmpresa.map((p, i) => <option key={i} value={p.nombre}>{p.nombre}</option>)}
                </select>
              ) : (
                <input name="planta" value={form.planta} onChange={handleChange} placeholder="Planta o sede" className={INP} />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Título / Descripción</label>
            <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Descripción de la cotización" className={INP} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Forma de pago</label>
              <input name="condicionPago" value={form.condicionPago} onChange={handleChange} placeholder="—" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fecha recibida</label>
              <input type="date" name="fechaRecibida" value={form.fechaRecibida} onChange={handleChange} className={INP} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Plazo de entrega</label>
              <input name="plazoEntrega" value={form.plazoEntrega} onChange={handleChange} placeholder="Ej. 2 días de recibida su O/C." className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Lugar de entrega</label>
              <input name="lugarEntrega" value={form.lugarEntrega} onChange={handleChange} placeholder="Ej. Planta Chilca" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Validez de la oferta</label>
              <input name="validezOferta" value={form.validezOferta} onChange={handleChange} placeholder="Ej. 15 días" className={INP} />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Código SAP</label>
              <input name="codigoSap" value={form.codigoSap} onChange={handleChange} placeholder="—" className={INP} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fecha de salida</label>
              <input type="date" name="fechaSalida" value={form.fechaSalida} onChange={handleChange} className={INP} />
            </div>
          </div>

          <TablaItemsCotizacion
            items={items}
            onItemsChange={setItems}
            tipo={form.tipo}
            puedeEditar
            disabled={false}
            intentoGuardar={intentoGuardar}
            totalesMostrados={totalesMostrados}
            seleccionables={false}
          />

          {/* Cálculos */}
          <div className="rounded-xl bg-gradient-to-br from-gray-50 to-sky-50/40 border border-gray-100 p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Subtotal sin IGV
                {usarTotalesDeItems && <span className="text-gray-400 font-normal"> (calculado desde Ítems)</span>}
              </label>
              {usarTotalesDeItems ? (
                <p className={`${INP} text-lg font-semibold bg-gray-50 text-gray-700 border-transparent`}>
                  {totalesMostrados.subtotal.toFixed(2)}
                </p>
              ) : (
                <input type="number" name="subtotal" value={form.subtotal} onChange={handleChange}
                  step="0.01" min="0" placeholder="0.00" className={`${INP} text-lg font-semibold`} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-400">IGV 18%</p>
                <p className="font-semibold text-gray-700">{totalesMostrados.igv.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Total</p>
                <p className="font-semibold text-gray-700">{totalesMostrados.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <div className="shrink-0 flex justify-end gap-3 px-8 py-4 border-t border-gray-100 bg-white">
        <button type="button" onClick={onClose} className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={guardando}
          className="text-sm bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition font-medium">
          {guardando ? "Creando…" : "Crear Cotización"}
        </button>
      </div>
    </div>
  );
}
