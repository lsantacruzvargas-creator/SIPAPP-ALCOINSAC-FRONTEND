import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuth } from "../utils/fetchAuth";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Colores ──────────────────────────────────────────────────────────────────
const COLOR_OT = {
  pendiente:    "#f59e0b",
  "en progreso": "#3b82f6",
  completado:   "#22c55e",
};
const COLOR_FACT = {
  "sin pago":    "#ef4444",
  "pago parcial": "#f59e0b",
  pagado:        "#22c55e",
};

// ── Tooltip personalizado ────────────────────────────────────────────────────
function TooltipCustom({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2 text-sm">
      <span className="font-medium text-gray-700 capitalize">{name}:</span>{" "}
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

// ── Tarjeta KPI ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  const texto = {
    gray:  "text-gray-800",
    blue:  "text-blue-700",
    amber: "text-amber-700",
    green: "text-green-600",
    red:   "text-red-600",
  };
  return (
    <div className="card flex flex-col gap-1 min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl sm:text-3xl font-bold leading-tight break-all ${texto[color] ?? texto.gray}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Tarjeta contraste OC vs Cotizaciones ─────────────────────────────────────
function KpiContrasteCard({ totalCots, totalOCs }) {
  const navigate = useNavigate();
  const sinOC = totalCots - totalOCs;
  const pct = totalCots > 0 ? Math.round((totalOCs / totalCots) * 100) : 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Conversión Cotización → OC
      </p>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">Cotizaciones</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{totalCots}</p>
        </div>
        <div className="text-2xl font-light text-gray-300 pb-1">→</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">Órdenes de Compra</p>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-700">{totalOCs}</p>
        </div>
        <div
          className="min-w-0 cursor-pointer hover:opacity-70 transition"
          onClick={() => navigate("/cotizaciones", { state: { filtroOC: "sin" } })}
        >
          <p className="text-xs text-gray-400 mb-0.5">Cotizaciones sin OC</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-500">{sinOC}</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {totalOCs} de {totalCots} cotizaciones tienen orden de compra emitida
      </p>
    </div>
  );
}

function LabelDona({ cx, cy, midAngle, innerRadius, outerRadius, value }) {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={15} fontWeight="700">
      {value}
    </text>
  );
}

// ── Gráfico de dona ──────────────────────────────────────────────────────────
function GraficoDona({ titulo, datos, colores }) {
  const total = datos.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{titulo}</h3>
      <p className="text-xs text-gray-400 mb-4">{total} registros en total</p>
      {total === 0 ? (
        <p className="text-sm text-gray-300 text-center py-12">Sin datos</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={datos}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={<LabelDona />}
            >
              {datos.map((entry) => (
                <Cell key={entry.name} fill={colores[entry.name] ?? "#9ca3af"} />
              ))}
            </Pie>
            <Tooltip content={<TooltipCustom />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-gray-600 capitalize">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const SELECT = "input-field w-auto";

function porFecha(arr, campoFecha, ano, mes) {
  return arr.filter((item) => {
    const f = item[campoFecha] ? new Date(item[campoFecha]) : null;
    if (!f) return true;
    if (ano && f.getFullYear() !== parseInt(ano)) return false;
    if (mes && f.getMonth() + 1 !== parseInt(mes)) return false;
    return true;
  });
}

// ── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const usuario = JSON.parse(localStorage.getItem("usuario") ?? "null");
  const [ots, setOts]     = useState([]);
  const [facts, setFacts] = useState([]);
  const [cots, setCots]   = useState([]);
  const [ocs, setOcs]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  useEffect(() => {
    Promise.all([
      fetchAuth("/ordenes-trabajo").then((r) => r.ok ? r.json() : []),
      fetchAuth("/facturas").then((r) => r.ok ? r.json() : []),
      fetchAuth("/cotizaciones").then((r) => r.ok ? r.json() : []),
      fetchAuth("/ordenes-compra").then((r) => r.ok ? r.json() : []),
    ]).then(([o, f, c, oc]) => {
      setOts(o); setFacts(f); setCots(c); setOcs(oc);
      setCargando(false);
    });
  }, []);

  // ── Años disponibles (union de todos los datos) ──────────────────────────
  const anos = [...new Set([
    ...facts.map((f) => new Date(f.fechaEmision).getFullYear()),
    ...cots.map((c) => c.fecha ? new Date(c.fecha).getFullYear() : null),
    ...ocs.map((o) => o.fecha  ? new Date(o.fecha).getFullYear()  : null),
    ...ots.map((o) => o.fecha  ? new Date(o.fecha).getFullYear()  : null),
  ].filter(Boolean))].sort((a, b) => b - a);

  // ── Arrays filtrados ─────────────────────────────────────────────────────
  const otsFiltradas   = porFecha(ots,   "fecha",        filtroAno, filtroMes);
  const factsFiltradas = porFecha(facts, "fechaEmision", filtroAno, filtroMes);
  const cotsFiltradas  = porFecha(cots,  "fecha",        filtroAno, filtroMes);
  const ocsFiltradas   = porFecha(ocs,   "fecha",        filtroAno, filtroMes);

  // ── Datos para gráficos ──────────────────────────────────────────────────
  const contarPor = (arr, campo) => {
    const map = {};
    arr.forEach((item) => {
      const k = item[campo] ?? "sin definir";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  };

  const datosOT   = contarPor(otsFiltradas,   "estado");
  const datosFact = contarPor(factsFiltradas, "estadoPago");

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const otsActivas     = otsFiltradas.filter((o) => o.estado !== "completado").length;
  const otsCompletadas = otsFiltradas.filter((o) => o.estado === "completado").length;
  const factAbiertas   = factsFiltradas.filter((f) => f.estadoPago !== "pagado").length;
  const totalFacturado = factsFiltradas.reduce((s, f) => s + (f.monto ?? 0), 0);
  const totalPagado    = factsFiltradas.reduce((s, f) => s + (Number(f.montoPagado) || 0), 0);
  const porCobrar      = totalFacturado - totalPagado;

  const fmt = (n) => `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  if (cargando) {
    return <div className="p-8 text-sm text-gray-400">Cargando dashboard…</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* Bienvenida + filtros */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Bienvenido, {usuario?.nombre}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Panel principal — SIP App Alcoinsac</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={SELECT}>
            <option value="">Todos los años</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={SELECT}>
            <option value="">Todos los meses</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          {(filtroAno || filtroMes) && (
            <button
              onClick={() => { setFiltroAno(""); setFiltroMes(""); }}
              className="text-sm text-gray-400 hover:text-gray-700 transition"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs — fila 1 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Cotizaciones"      value={cotsFiltradas.length} sub="total registradas"                    color="gray"  />
        <KpiCard label="OTs activas"       value={otsActivas}           sub={`${otsCompletadas} completadas`}      color="blue"  />
        <KpiCard label="Facturas abiertas" value={factAbiertas}         sub={`${factsFiltradas.length} en total`}  color="amber" />
        <KpiCard label="Total facturado"   value={fmt(totalFacturado)}  sub="suma de montos de facturas"           color="gray"  />
      </div>

      {/* KPIs — fila 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Total pagado" value={fmt(totalPagado)} sub="suma de pagos registrados" color="green" />
        <KpiCard label="Por cobrar"   value={fmt(porCobrar)}   sub="facturado menos pagado"    color="red"   />
      </div>

      {/* Contraste OC vs Cotizaciones */}
      <KpiContrasteCard totalCots={cotsFiltradas.length} totalOCs={ocsFiltradas.length} />

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GraficoDona
          titulo="Órdenes de Trabajo por estado"
          datos={datosOT}
          colores={COLOR_OT}
        />
        <GraficoDona
          titulo="Facturas por estado de pago"
          datos={datosFact}
          colores={COLOR_FACT}
        />
      </div>

    </div>
  );
}
