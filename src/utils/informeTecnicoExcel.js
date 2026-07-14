import ExcelJS from "exceljs";
import { tipoInformePorValor } from "./informesTecnicos";
import { imgUrl } from "./fetchAuth";

// exceljs solo puede incrustar estos 3 formatos — si la foto subida es de
// otro tipo (ej. webp/heic) se omite del Excel (sigue disponible en la app).
const EXTENSION_SOPORTADA = (ruta) => {
  const ext = (ruta.split(".").pop() || "").toLowerCase();
  if (ext === "jpg") return "jpeg";
  if (["jpeg", "png", "gif"].includes(ext)) return ext;
  return null;
};

// Direcciones de celda mapeadas celda-por-celda contra las plantillas reales
// (dumps exhaustivos con la librería xlsx sobre los archivos de
// Frontend/informes/, cruzando la versión rellenada de ejemplo con la
// versión en blanco para separar etiqueta de valor). "bombas" y
// "protocolo_jaula_ardilla" están verificados contra un caso real relleno
// (alta confianza). "bobina_estator_mtto"/"bobina_estator_rebo" se derivan
// de los merges de la plantilla en blanco (alta confianza en encabezado y
// tablas; los 6 valores de "megadoBobina" son mejor esfuerzo porque esa
// zona es un gráfico de megado, no una celda simple). "tecnico_mantenimiento"
// usa la plantilla construida desde cero en esta sesión, así que es exacta
// por diseño. Un campo/ítem/celda que no aparece acá simplemente no tiene
// posición conocida en la plantilla — su valor igual se garantiza en el
// bloque "DATOS CAPTURADOS" que se anexa más abajo.
const MAPEOS = {
  bombas: {
    campos: {
      cliente: "G4", equipo: "G5", referencia: "AI4", ot: "AX4", nGuia: "AH5",
      oc: "AT5", indicacionesCliente: "M6", recepcion: "AU6",
      marca: "H10", modelo: "H11", hp: "H12", nSerie: "H13", rpm: "H14", peso: "H15",
    },
    checklist: {
      "2. Revisión mecánica": {
        hechoPor: "J18", fecha: "Y18",
        items: {
          tapasLT: "H22", tapasLOT: "P22", guarda: "H23", impulsor: "H24", acople: "H25",
          contratapaLT: "J26", contratapaLOT: "Q26", selloMecanico: "J27",
          rodamientosLT: "J28", rodamientosLOT: "S28",
          soportesEjeLT: "K29", soportesEjeLOT: "S29",
          anilloLT: "I30", anilloLOT: "N30",
          vRingLT: "H31", vRingLOT: "N31",
          retenLT: "H32", retenLOT: "N32",
        },
      },
    },
    bullets: {
      observaciones: { col: "F", fila: 35, max: 20 },
      resumenTrabajo: { col: "F", fila: 57, max: 10 },
      recomendaciones: { col: "F", fila: 68, max: 3 },
    },
    evidencias: {
      evidencias: ["E97", "V97", "AM97", "E118", "V118", "AM118", "E139", "V139", "AM139"],
    },
    footer: { hechoPor: "H71", vB: "AC71", fecha: "AZ71" },
  },

  protocolo_jaula_ardilla: {
    // Los encabezados de las páginas de evidencias (G77/G150, AI77/AI150,
    // etc.) son fórmulas ="=G4" etc. en la propia plantilla — se actualizan
    // solas al escribir la celda principal, no hace falta repetirlas acá.
    campos: {
      cliente: "G4", equipo: "G5",
      referencia: "AI4", ot: "AX4",
      nGuia: "AH5", oc: "AT5",
      indicacionesCliente: "M10", recepcion: "AU10",
      marca: "G6", nSerie: "G7", codigo: "G8",
      ip: "AA6", potenciaKw: "AD7", tensionV: "AC8", corrienteA: "AO6", cosphi: "AX6",
      frecuenciaHz: "AP7", nSalidas: "AZ7", rpm: "AL8", conexion: "AZ8",
      bornera: "AH9", cajaBornes: "W9", conexIngreso: "AX9",
      alambreAwgRec: "BH20", conexionRec: "BW20", papelNomexRec: "BH21", gruposBobinasRec: "BW21",
      paseRec: "BH22", bobinasGrupoRec: "BW22", vueltasRec: "BH23", nSalidasRec: "BW23",
      conclusionRecepcion: "J21", conclusionVibracionRecepcion: "J34",
      vNom: "G46", iNom: "Q46", conexionSal: "Z46",
      rpmSalida: "G51", ivIn: "Y51",
    },
    checklist: {
      "4. Revisión mecánica": {
        hechoPor: "AJ13", fecha: "AY13",
        items: {
          canalizacionMediante: "AN15",
          posicionTrabajo: "AK17",
          tapasLT: "AH18", tapasLOT: "AP18", fundaLOT: "AH19",
          contratapaLT: "AS19", contratapaLOT: "AY19",
          soportesEjeLT: "AJ20", soportesEjeLOT: "AP20",
          ventiladorLOT: "AJ21", chaveta1: "AQ21",
          cargaLT: "AH22", chaveta2: "AT22",
          rodamientosLT: "AJ23", rodamientosLOT: "AS23",
          anilloLanLT: "AH24", anilloLanLOT: "AN24",
          vRingLT: "AH25", vRingLOT: "AN25",
          retenLT: "AH26", retenLOT: "AN26",
        },
      },
    },
    tabla: {
      aislamientoRecepcion: {
        hechoPor: "J13", fecha: "Y13",
        bornes1m__aMasa: "K17", bornes1m__entreFases: "T17",
        bornes2m__aMasa: "N17", bornes2m__entreFases: "W17",
        bornes3m__aMasa: "Q17", bornes3m__entreFases: "Z17",
      },
      resistenciaRecepcion: {
        resistencia__c14: "K20", resistencia__c25: "Q20", resistencia__c36: "W20",
      },
      vibracionRecepcion: {
        horizontal__lt: "L31", horizontal__lot: "R31",
        vertical__lt: "L32", vertical__lot: "R32",
        axial__lt: "L33", axial__lot: "R33",
      },
      aislamientoSalida: {
        hechoPor: "J37", fecha: "Y37",
        bornes1m__aMasa: "K41", bornes1m__entreFases: "T41",
        bornes2m__aMasa: "N41", bornes2m__entreFases: "W41",
        bornes3m__aMasa: "Q41", bornes3m__entreFases: "Z41",
      },
      resistenciaSalida: {
        resistencia__c14: "K44", resistencia__c25: "Q44", resistencia__c36: "W44",
      },
      pruebaMotorTabla: {
        tension__c12: "K49", tension__c23: "Q49", tension__c31: "W49",
        amperaje__c12: "K50", amperaje__c23: "Q50", amperaje__c31: "W50",
      },
    },
    bullets: {
      resumenTrabajo: { col: "F", fila: 55, max: 11 },
      recomendaciones: { col: "F", fila: 68, max: 3 },
    },
    evidencias: {
      evidenciasRecepcion: ["E97", "V97", "AM97", "E118", "V118", "AM118", "E139", "V139", "AM139"],
      evidenciasSalida: ["E170", "V170", "AM170", "E191", "V191", "AM191", "E212", "V212", "AM212"],
    },
    footer: { hechoPor: "H71", vB: "AC71", fecha: "AZ71" },
  },

  bobina_estator_mtto: {
    campos: {
      cliente: ["E11", "E77"], equipo: ["E10", "E76"], planta: ["T10", "T76"],
      tecnico: ["T11", "T77"], ot: ["AG11", "AG77"],
      marca: "E17", potencia: "E18", rpm: "E19", modelo: "E20", nEquipo: "E21",
    },
    tabla: {
      // Zona de gráfico de megado en la plantilla real (no una grilla de
      // celdas simple) — se ubica el valor capturado justo debajo de cada
      // rótulo de fase como mejor esfuerzo.
      megadoBobina: {
        fase1Tierra__valor: "B97", fase2Tierra__valor: "S97",
        fase3Tierra__valor: "B113", fase12__valor: "S113",
        fase23__valor: "B129", fase13__valor: "S129",
      },
    },
    bullets: {
      resumen: { col: "B", fila: 48, max: 7 },
      recomendaciones: { col: "B", fila: 61, max: 3 },
    },
    // Esta plantilla no tiene ningún bloque "Hecho por/V.B./Fecha" impreso
    // (confirmado revisando las 199 filas de la hoja) — la firma queda en
    // el bloque anexo en vez de escribirse sobre celdas sin etiqueta.
  },

  bobina_estator_rebo: {
    campos: {
      cliente: ["E11", "E77"], equipo: ["E10", "E76"], planta: ["T10", "T76"],
      tecnico: ["T11", "T77"], ot: ["AG11", "AG77"],
      marca: "F17", potencia: "F18", rpm: "F19", modelo: "F20", nEquipo: "F21",
      pase: "D42", nSalidas: "N42", alambre: "E43", kgAlambre: "O43",
      vueltas: "E44", papelNomex: "O44", conexion: "F45",
      gruposBobinas: "I46", bobinasGrupo: "I47",
    },
    tabla: {
      pruebasResistencia: { l14__valor: "G28", l36__valor: "M28", l25__valor: "G29", tierra__valor: "M29" },
      aislamientoIngreso: {
        fase12__valor: "G32", f1Tierra__valor: "M32",
        fase23__valor: "G33", f2Tierra__valor: "M33",
        fase31__valor: "G34", f3Tierra__valor: "M34",
      },
      aislamientoSalida: {
        fase12__valor: "G37", f1Tierra__valor: "M37",
        fase23__valor: "G38", f2Tierra__valor: "M38",
        fase31__valor: "G39", f3Tierra__valor: "M39",
      },
    },
    bullets: {
      diagnostico: { col: "T", fila: 36, max: 5 },
      conclusiones: { col: "T", fila: 42, max: 5 },
    },
    // Igual que en bobina_estator_mtto: no existe bloque de firma impreso
    // en esta plantilla — queda en el bloque anexo.
  },

  // Plantilla real "CAJA REDUCTORA EN MTTO.xlsx" (encontrada por el usuario
  // en Frontend/informes/) — reemplaza la plantilla que se había armado
  // desde cero a partir del PDF. Mapeada celda por celda contra el XML
  // crudo (estilo de cada celda), no contra un ejemplo relleno.
  tecnico_mantenimiento: {
    campos: {
      cliente: "G5", equipo: "G6", referencia: "AE5", ot: "AY5",
      nGuia: "AE6", oc: "AU6", indicacionesCliente: "O9",
      placa: "I12", marca: "I13", nSerie: "I14", tipoEquipo: "I15",
    },
    checklist: {
      "Revisión mecánica": {
        hechoPor: "I18", fecha: "X18",
        items: {
          engranaje: "K19", ejeSinFin: "K20", tapasRodajes: "K21", rodamientos: "K22",
          canalChavetero: "K23", chaveta: "K24", retenes: "K25", tapaCiega: "K26",
        },
      },
    },
    bullets: {
      observaciones: { col: "F", fila: 29, max: 3 },
      procesoTrabajo: { col: "F", fila: 66, max: 3 },
      recomendaciones: { col: "F", fila: 71, max: 1 },
    },
    footer: { hechoPor: "I74", vB: "AD74", fecha: "AZ74" },
  },
};

// Para campos/checklist/tabla, una sección puede tener SOLO ALGUNOS de sus
// elementos mapeados (ej. un ítem de checklist sin celda propia en la
// plantilla real) — esta función devuelve nada más los pares [label, valor]
// de lo que efectivamente NO tiene celda, para no duplicar en el bloque
// anexo lo que ya se escribió con precisión.
const elementosSinMapear = (seccion, mapa, campos) => {
  if (seccion.tipo === "campos") {
    return seccion.campos
      .filter((c) => !mapa.campos?.[c.clave])
      .map((c) => [c.label, campos[c.clave] ?? ""]);
  }
  if (seccion.tipo === "checklist") {
    const m = mapa.checklist?.[seccion.titulo];
    const pares = [];
    if (seccion.hechoPor && !m?.hechoPor) pares.push(["Hecho por", campos[`${seccion.titulo}__hechoPor`] ?? ""]);
    if (seccion.hechoPor && !m?.fecha) pares.push(["Fecha", campos[`${seccion.titulo}__fecha`] ?? ""]);
    seccion.items
      .filter((it) => !m?.items?.[it.clave])
      .forEach((it) => pares.push([it.label, campos[it.clave] ?? ""]));
    return pares;
  }
  if (seccion.tipo === "tabla") {
    const m = mapa.tabla?.[seccion.clave] || {};
    const valores = campos[seccion.clave] || {};
    const pares = [];
    if (seccion.hechoPor && !m.hechoPor) pares.push(["Hecho por", campos[`${seccion.titulo}__hechoPor`] ?? ""]);
    if (seccion.hechoPor && !m.fecha) pares.push(["Fecha", campos[`${seccion.titulo}__fecha`] ?? ""]);
    seccion.filas.forEach((f) => seccion.columnas.forEach((c) => {
      const clave = `${f.clave}__${c.clave}`;
      if (!m[clave]) pares.push([`${f.label} — ${c.label}`, valores[clave] ?? ""]);
    }));
    return pares;
  }
  return [];
};

// Exporta un InformeTecnico ya guardado a un .xlsx: cada campo con celda
// mapeada en MAPEOS se escribe directamente en su posición original de la
// plantilla (conserva 100% el formato/logo/merges/anchos/bordes/colores —
// se usa exceljs en vez de xlsx/SheetJS porque esta última, incluso sin
// tocar nada, no conserva el estilo de las celdas al releer y regrabar un
// archivo; exceljs sí preserva todo lo que no se toca explícitamente).
// Lo que no tiene celda conocida (o excede el número de líneas/fotos que la
// plantilla reserva) se anexa como bloque legible debajo del contenido
// original, para garantizar que nunca se pierda un dato capturado.
export async function exportarInformeTecnicoExcel(informe, ot) {
  const def = tipoInformePorValor(informe.tipo);
  if (!def) throw new Error("Tipo de informe desconocido");

  const res = await fetch(`/informes-templates/${encodeURIComponent(def.archivoExcel)}`);
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  const campos = informe.campos || {};
  const mapa = MAPEOS[informe.tipo] || {};

  const escribir = (addr, valor) => {
    if (!addr || valor === undefined || valor === null || valor === "") return;
    (Array.isArray(addr) ? addr : [addr]).forEach((a) => { ws.getCell(a).value = String(valor); });
  };

  def.secciones.forEach((seccion) => {
    if (seccion.tipo === "campos") {
      seccion.campos.forEach((c) => escribir(mapa.campos?.[c.clave], campos[c.clave]));
    } else if (seccion.tipo === "checklist") {
      const m = mapa.checklist?.[seccion.titulo];
      if (!m) return;
      if (seccion.hechoPor) {
        escribir(m.hechoPor, campos[`${seccion.titulo}__hechoPor`]);
        escribir(m.fecha, campos[`${seccion.titulo}__fecha`]);
      }
      seccion.items.forEach((it) => escribir(m.items?.[it.clave], campos[it.clave]));
    } else if (seccion.tipo === "tabla") {
      const m = mapa.tabla?.[seccion.clave];
      if (!m) return;
      if (seccion.hechoPor) {
        escribir(m.hechoPor, campos[`${seccion.titulo}__hechoPor`]);
        escribir(m.fecha, campos[`${seccion.titulo}__fecha`]);
      }
      const valores = campos[seccion.clave] || {};
      seccion.filas.forEach((f) => seccion.columnas.forEach((c) => {
        const clave = `${f.clave}__${c.clave}`;
        escribir(m[clave], valores[clave]);
      }));
    } else if (seccion.tipo === "bullets") {
      const m = mapa.bullets?.[seccion.clave];
      if (!m) return;
      const lineas = (campos[seccion.clave] || []).filter(Boolean);
      lineas.slice(0, m.max).forEach((linea, i) => escribir(`${m.col}${m.fila + i}`, linea));
    } else if (seccion.tipo === "evidencias") {
      const slots = mapa.evidencias?.[seccion.clave];
      if (!slots) return;
      const grupos = campos[seccion.clave] || [];
      grupos.slice(0, slots.length).forEach((g, i) => escribir(slots[i], g.titulo));
    }
  });

  const fechaFormateada = informe.fecha ? new Date(informe.fecha).toLocaleDateString("es-PE") : "";
  escribir(mapa.footer?.hechoPor, informe.hechoPor);
  escribir(mapa.footer?.vB, informe.vB);
  escribir(mapa.footer?.fecha, fechaFormateada);

  // Bloque anexo: solo lo que NO tiene celda mapeada para este tipo, más el
  // excedente de líneas/fotos que ya no cupo en los espacios reservados.
  // Estas plantillas usan una grilla de columnas angostísimas (~18px cada
  // una, ancho ≈2.29) para armar los recuadros del formato original — un
  // texto normal escrito en una sola de esas celdas se ve cortado porque
  // Excel no hace "overflow" visual cuando la celda vecina no está
  // realmente vacía (trae borde/estilo heredado de la grilla). Por eso acá
  // se fusiona un rango ancho antes de escribir, en vez de una celda suelta.
  //
  // ws.rowCount refleja la dimensión declarada de la hoja (ej. 199 en estas
  // plantillas), no la última fila con contenido real (que puede ser mucho
  // más chica, ej. ~128) — usarlo tal cual dejaba un salto enorme de filas
  // vacías antes de este bloque. Se busca la última fila que de verdad
  // tiene algo escrito.
  let ultimaFilaConContenido = 0;
  ws.eachRow((_row, numeroFila) => { ultimaFilaConContenido = numeroFila; });
  let fila = ultimaFilaConContenido + 4;
  const escribirFila = (col, r, valor) => {
    const rango = `${col}${r}:AJ${r}`;
    try { ws.mergeCells(rango); } catch { /* ya fusionada, no pasa nada */ }
    ws.getCell(`${col}${r}`).value = String(valor);
  };

  const bloques = [];
  def.secciones.forEach((seccion) => {
    if (["campos", "checklist", "tabla"].includes(seccion.tipo)) {
      const faltan = elementosSinMapear(seccion, mapa, campos);
      if (faltan.length) bloques.push([seccion.titulo, faltan]);
      return;
    }
    if (seccion.tipo === "bullets") {
      const m = mapa.bullets?.[seccion.clave];
      const lineas = (campos[seccion.clave] || []).filter(Boolean);
      if (!m) {
        bloques.push([seccion.titulo, lineas.length ? lineas.map((l) => ["", l]) : [["(sin líneas)", ""]]]);
      } else if (lineas.length > m.max) {
        bloques.push([`${seccion.titulo} (líneas adicionales)`, lineas.slice(m.max).map((l) => ["", l])]);
      }
    } else if (seccion.tipo === "evidencias") {
      const slots = mapa.evidencias?.[seccion.clave];
      const grupos = campos[seccion.clave] || [];
      if (!slots) {
        bloques.push([seccion.titulo, grupos.map((g) => [g.titulo || "(sin título)", `${g.imagenes?.length || 0} foto(s)`])]);
      } else if (grupos.length > slots.length) {
        bloques.push([`${seccion.titulo} (grupos adicionales)`, grupos.slice(slots.length).map((g) => [g.titulo || "(sin título)", `${g.imagenes?.length || 0} foto(s)`])]);
      }
    }
  });

  // Firma: si la plantilla de este tipo no tiene un bloque de "Hecho por /
  // V.B. / Fecha" (ej. bobina_estator_mtto/rebo no lo traen), no se pierde
  // el dato — cae acá igual que cualquier otro campo sin celda mapeada.
  const faltanFirma = [];
  if (!mapa.footer?.hechoPor) faltanFirma.push(["Hecho por", informe.hechoPor || ""]);
  if (!mapa.footer?.vB) faltanFirma.push(["V.B.", informe.vB || ""]);
  if (!mapa.footer?.fecha) faltanFirma.push(["Fecha", fechaFormateada]);
  if (faltanFirma.length) bloques.push(["Firma", faltanFirma]);

  if (bloques.length) {
    escribirFila("B", fila, `DATOS ADICIONALES — ${def.label}`);
    fila += 2;
    bloques.forEach(([titulo, pares]) => {
      escribirFila("B", fila, titulo);
      fila += 1;
      pares.forEach(([label, valor]) => {
        escribirFila("C", fila, label ? `${label}: ${valor || "—"}` : (valor || "—"));
        fila += 1;
      });
      fila += 1;
    });
    fila += 2;
  }

  // Fotos: se insertan apiladas en la columna B, en una posición fija
  // (debajo de todo lo demás) en vez de intentar adivinar la celda "correcta"
  // de cada plantilla — el usuario las arrastra a su lugar final en Excel.
  // El tamaño se fija (no se lee el ancho/alto real de cada foto) para no
  // tener que decodificar la imagen; queda una distorsión leve si la foto
  // no es 4:3, aceptable para este flujo de "colocar y luego acomodar".
  const gruposConFotos = [];
  def.secciones.forEach((seccion) => {
    if (seccion.tipo !== "evidencias") return;
    (campos[seccion.clave] || []).forEach((g) => {
      if (g.imagenes?.length) gruposConFotos.push({ titulo: g.titulo || seccion.titulo, imagenes: g.imagenes });
    });
  });

  if (gruposConFotos.length) {
    escribirFila("B", fila, "FOTOS ADJUNTAS (arrastrar a la posición final)");
    fila += 2;
    for (const grupo of gruposConFotos) {
      for (const ruta of grupo.imagenes) {
        const extension = EXTENSION_SOPORTADA(ruta);
        if (!extension) { console.warn("Formato de imagen no soportado para Excel:", ruta); continue; }
        try {
          const resImg = await fetch(imgUrl(ruta));
          const bufferImg = await resImg.arrayBuffer();
          const imageId = wb.addImage({ buffer: bufferImg, extension });
          escribirFila("B", fila, grupo.titulo);
          ws.addImage(imageId, {
            tl: { col: 1, row: fila }, // col 1 = B, fila es 1-indexado pero el anchor espera 0-indexado
            ext: { width: 260, height: 195 },
          });
          fila += 11;
        } catch (err) {
          console.warn("No se pudo insertar la imagen en el Excel:", ruta, err.message);
        }
      }
    }
  }

  const nombreArchivo = `${def.label} - ${ot?.codigo || informe.codigo || "informe"}.xlsx`;
  const bufferSalida = await wb.xlsx.writeBuffer();
  const blob = new Blob([bufferSalida], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
