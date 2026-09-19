// Antes de escribir un valor de texto en una celda de Excel, si empieza con
// = + - @ (o tab/CR) Excel/Sheets puede interpretarlo como fórmula en vez de
// texto plano ("Formula Injection" / CSV injection, OWASP) — un nombre de
// material, empresa, título, etc. con ese contenido podría ejecutar una
// fórmula (filtrar datos vía HYPERLINK, o peor) al abrir el archivo
// exportado. Se neutraliza anteponiendo un apóstrofo, que Excel/Sheets
// interpretan como "forzar texto" sin mostrarlo en la celda.
const PATRON_FORMULA = /^[=+\-@\t\r]/;

const sanitizarValor = (v) =>
  typeof v === "string" && PATRON_FORMULA.test(v) ? `'${v}` : v;

const filaSegura = (fila) =>
  Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, sanitizarValor(v)]));

// Reemplazo directo de XLSX.utils.json_to_sheet(filas) para cualquier
// exportación con datos que vengan de campos de texto libre del usuario.
export const filasExcelSeguras = (filas) => filas.map(filaSegura);
