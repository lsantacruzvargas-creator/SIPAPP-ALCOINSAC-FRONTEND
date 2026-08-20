// Config-driven: cada tipo de informe técnico define sus secciones/campos
// acá (mismo principio que catalogoServicios.js) — FormInformeTecnico.jsx
// y VistaInformeTecnico.jsx son genéricos, leen esta estructura y no
// hardcodean nada por tipo. Los `clave` de cada campo son las llaves que
// se guardan en `InformeTecnico.campos` (Backend/src/models/InformeTecnico.js)
// y las que usa informeTecnicoExcel.js para mapear a celdas de la plantilla.
//
// Tipos de sección soportados por el renderer genérico:
//   campos      — inputs simples (texto/fecha), en grilla
//   checklist   — pares label+input (con "Hecho por"/"Fecha" opcional arriba;
//                 acepta también `imagenes: [{clave,label}]` para casilleros
//                 de una sola foto dentro de la misma tarjeta, ej. "Imagen
//                 principal A/B" en Revisión mecánica)
//   bullets     — lista dinámica de líneas de texto ("+ agregar línea")
//   tabla       — grilla de lecturas numéricas (filas x columnas)
//   evidencias  — grupos de fotos DINÁMICOS con leyenda propia (cámara o
//                 galería, se agregan/quitan libremente)
//   galeriaFija — grilla FIJA de casilleros de una sola foto cada uno,
//                 organizados en `paginas: [{titulo, slots:[{clave,label}]}]`
//                 — cada casillero tiene una posición fija y conocida en la
//                 plantilla (a diferencia de "evidencias", no son agregables)

// Algunos títulos de checklist traen numeración con punto (ej. "2. Revisión
// mecánica") — MongoDB descarta en silencio cualquier clave de objeto que
// contenga un "." (se probó contra la base real: los ítems del checklist
// sin punto en el título se guardan bien, pero "hechoPor"/"fecha" del
// encabezado, que usan el título completo como parte de la clave, nunca
// llegaban a persistirse). Se usa esta función en vez del título crudo en
// todos los lugares que arman la clave de `campos` para ese par.
export const claveChecklist = (titulo) => titulo.replace(/\./g, "");

const CAMPOS_HEADER = [
  { clave: "cliente", label: "Cliente" },
  { clave: "equipo", label: "Equipo" },
  { clave: "referencia", label: "Referencia" },
  { clave: "ot", label: "O.T." },
  { clave: "nGuia", label: "N° Guía" },
  { clave: "oc", label: "O.C." },
  { clave: "indicacionesCliente", label: "Indicaciones del cliente" },
];

// Las plantillas de Bobina de Estator (MTTO/REBO) son un formato "REPORTE DE
// FALLAS" más simple — su encabezado real solo trae Equipo/Empresa/Planta/
// Técnico/OT, sin Referencia/N° Guía/O.C./Indicaciones del cliente. Usar
// CAMPOS_HEADER completo ahí generaba campos que no existen en el papel.
const CAMPOS_HEADER_BOBINA = [
  { clave: "cliente", label: "Cliente" },
  { clave: "equipo", label: "Equipo" },
  { clave: "ot", label: "O.T." },
];

const BULLETS_ESTANDAR = (clave, titulo, simbolo = "▫") => ({
  tipo: "bullets", titulo, clave, simbolo,
});

export const TIPOS_INFORME = [
  {
    valor: "bombas",
    label: "Informe de Mantenimiento de Bombas",
    archivoExcel: "INFORME DE MANTENIMIENTO DE BOMBAS.xlsx",
    secciones: [
      { tipo: "campos", titulo: "Datos generales", campos: [...CAMPOS_HEADER, { clave: "recepcion", label: "Recepción" }] },
      {
        tipo: "campos", titulo: "1. Datos técnicos",
        campos: [
          { clave: "marca", label: "Marca" }, { clave: "modelo", label: "Modelo" },
          { clave: "hp", label: "HP" }, { clave: "nSerie", label: "N° Serie" },
          { clave: "rpm", label: "RPM" }, { clave: "peso", label: "Peso" },
        ],
      },
      {
        tipo: "checklist", titulo: "2. Revisión mecánica", hechoPor: true,
        items: [
          { clave: "tapasLT", label: "Tapas LT" }, { clave: "tapasLOT", label: "Tapas LOT" },
          { clave: "guarda", label: "Guarda" }, { clave: "impulsor", label: "Impulsor" },
          { clave: "acople", label: "Acople" },
          { clave: "contratapaLT", label: "Contratapa LT" }, { clave: "contratapaLOT", label: "Contratapa LOT" },
          { clave: "selloMecanico", label: "Sello Mecánico" },
          { clave: "rodamientosLT", label: "Rodamientos LT" }, { clave: "rodamientosLOT", label: "Rodamientos LOT" },
          { clave: "soportesEjeLT", label: "Soportes de eje LT" }, { clave: "soportesEjeLOT", label: "Soportes de eje LOT" },
          { clave: "anilloLT", label: "Anillo LT" }, { clave: "anilloLOT", label: "Anillo LOT" },
          { clave: "vRingLT", label: "V-ring LT" }, { clave: "vRingLOT", label: "V-ring LOT" },
          { clave: "retenLT", label: "Retén LT" }, { clave: "retenLOT", label: "Retén LOT" },
        ],
        // Se insertan como imagen real en el Excel (no solo un link/leyenda) —
        // ver MAPEOS.bombas.checklist["2. Revisión mecánica"].imagenes en
        // informeTecnicoExcel.js para las celdas de destino.
        imagenes: [
          { clave: "imagenPrincipalA", label: "Imagen principal A" },
          { clave: "imagenPrincipalB", label: "Imagen principal B" },
        ],
      },
      BULLETS_ESTANDAR("observaciones", "3. Observaciones"),
      BULLETS_ESTANDAR("resumenTrabajo", "Resumen de trabajo"),
      BULLETS_ESTANDAR("recomendaciones", "Recomendaciones"),
      // Grilla FIJA de 27 fotos (9 por página × 3 páginas) — a diferencia de
      // "evidencias" (grupos dinámicos con leyenda propia, agregables/quitables
      // libremente), acá cada casillero tiene una posición fija en la
      // plantilla real y una sola foto (se reemplaza al volver a subir).
      {
        tipo: "galeriaFija", titulo: "Evidencias fotográficas", clave: "evidenciasFijas",
        paginas: [
          {
            titulo: "Página 2",
            slots: [
              { clave: "p2_1", label: "Foto 1" }, { clave: "p2_2", label: "Foto 2" }, { clave: "p2_3", label: "Foto 3" },
              { clave: "p2_4", label: "Foto 4" }, { clave: "p2_5", label: "Foto 5" }, { clave: "p2_6", label: "Foto 6" },
              { clave: "p2_7", label: "Foto 7" }, { clave: "p2_8", label: "Foto 8" }, { clave: "p2_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 3",
            slots: [
              { clave: "p3_1", label: "Foto 1" }, { clave: "p3_2", label: "Foto 2" }, { clave: "p3_3", label: "Foto 3" },
              { clave: "p3_4", label: "Foto 4" }, { clave: "p3_5", label: "Foto 5" }, { clave: "p3_6", label: "Foto 6" },
              { clave: "p3_7", label: "Foto 7" }, { clave: "p3_8", label: "Foto 8" }, { clave: "p3_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 4",
            slots: [
              { clave: "p4_1", label: "Foto 1" }, { clave: "p4_2", label: "Foto 2" }, { clave: "p4_3", label: "Foto 3" },
              { clave: "p4_4", label: "Foto 4" }, { clave: "p4_5", label: "Foto 5" }, { clave: "p4_6", label: "Foto 6" },
              { clave: "p4_7", label: "Foto 7" }, { clave: "p4_8", label: "Foto 8" }, { clave: "p4_9", label: "Foto 9" },
            ],
          },
        ],
      },
    ],
  },
  {
    valor: "protocolo_jaula_ardilla",
    label: "Protocolo de Prueba de Motores Eléctricos de Jaula de Ardilla",
    archivoExcel: "PROTOCOLO DE PRUEBA DE MOTORES ELECTRICOS DE JAULA DE ARDILLA.xlsx",
    secciones: [
      { tipo: "campos", titulo: "Datos generales", campos: [...CAMPOS_HEADER, { clave: "recepcion", label: "Recepción" }] },
      {
        tipo: "campos", titulo: "Datos de placa",
        campos: [
          { clave: "marca", label: "Marca" }, { clave: "nSerie", label: "N° Serie" }, { clave: "codigo", label: "Código" },
          { clave: "ip", label: "IP" }, { clave: "potenciaKw", label: "Potencia (kW)" }, { clave: "tensionV", label: "Tensión (V)" },
          { clave: "corrienteA", label: "Corriente (A)" }, { clave: "cosphi", label: "Cosφ" },
          { clave: "frecuenciaHz", label: "Frecuencia (Hz)" }, { clave: "nSalidas", label: "N. Salidas" },
          { clave: "rpm", label: "RPM" }, { clave: "conexion", label: "Conexión" },
          { clave: "bornera", label: "Bornera" }, { clave: "cajaBornes", label: "Caja de bornes" },
          { clave: "conexIngreso", label: "Conex. de ingreso" },
        ],
      },
      {
        tipo: "checklist", titulo: "4. Revisión mecánica", hechoPor: true,
        items: [
          { clave: "canalizacionMediante", label: "a. Refrigeración — Canalización mediante" },
          { clave: "posicionTrabajo", label: "Posición de trabajo" },
          { clave: "tapasLT", label: "Tapas LT" }, { clave: "tapasLOT", label: "Tapas LOT" },
          { clave: "fundaLOT", label: "Funda LOT" },
          { clave: "contratapaLT", label: "Contratapa LT" }, { clave: "contratapaLOT", label: "Contratapa LOT" },
          { clave: "soportesEjeLT", label: "Soportes de eje LT" }, { clave: "soportesEjeLOT", label: "Soportes de eje LOT" },
          { clave: "ventiladorLOT", label: "Ventilador LOT" }, { clave: "chaveta1", label: "Chaveta" },
          { clave: "cargaLT", label: "Carga LT" }, { clave: "chaveta2", label: "Chaveta" },
          { clave: "rodamientosLT", label: "Rodamientos LT" }, { clave: "rodamientosLOT", label: "Rodamientos LOT" },
          { clave: "anilloLanLT", label: "Anillo lan LT" }, { clave: "anilloLanLOT", label: "Anillo lan LOT" },
          { clave: "vRingLT", label: "V-ring LT" }, { clave: "vRingLOT", label: "V-ring LOT" },
          { clave: "retenLT", label: "Retén LT" }, { clave: "retenLOT", label: "Retén LOT" },
        ],
      },
      {
        tipo: "tabla", titulo: "1. Recepción: pruebas eléctricas — aislamiento megóhmetro (MΩ)", clave: "aislamientoRecepcion",
        hechoPor: true,
        columnas: [{ clave: "aMasa", label: "A masa" }, { clave: "entreFases", label: "Entre fases" }],
        filas: [
          { clave: "bornes1m", label: "Bornes 1-M / 1-2" }, { clave: "bornes2m", label: "Bornes 2-M / 2-3" }, { clave: "bornes3m", label: "Bornes 3-M / 3-1" },
        ],
      },
      {
        tipo: "tabla", titulo: "1. Recepción — Resistencia de bobina (Ω)", clave: "resistenciaRecepcion",
        columnas: [{ clave: "c14", label: "1-4" }, { clave: "c25", label: "2-5" }, { clave: "c36", label: "3-6" }],
        filas: [{ clave: "resistencia", label: "Resistencia (Ω)" }],
      },
      { tipo: "campos", titulo: "1. Recepción — Conclusión", campos: [{ clave: "conclusionRecepcion", label: "Conclusión" }] },
      {
        tipo: "campos", titulo: "Evaluación de núcleo magnético",
        campos: [
          { clave: "tiempoPrueba", label: "Tiempo de prueba" }, { clave: "comentarios", label: "Comentarios" },
          { clave: "voltajeInducido", label: "Voltaje inducido" },
          { clave: "areaCalentamiento", label: "% Area calentamiento" },
          { clave: "kGauss", label: "kGauss" },
        ],
      },
      {
        tipo: "tabla", titulo: "2. Recepción: pruebas de vibración RMS (mm/s)", clave: "vibracionRecepcion",
        columnas: [{ clave: "lt", label: "LT" }, { clave: "lot", label: "LOT" }],
        filas: [{ clave: "horizontal", label: "Horizontal" }, { clave: "vertical", label: "Vertical" }, { clave: "axial", label: "Axial" }],
      },
      { tipo: "campos", titulo: "2. Recepción — Conclusión", campos: [{ clave: "conclusionVibracionRecepcion", label: "Conclusión" }] },
      {
        tipo: "tabla", titulo: "3. Salida: pruebas eléctricas — aislamiento megóhmetro (MΩ)", clave: "aislamientoSalida",
        hechoPor: true,
        columnas: [{ clave: "aMasa", label: "A masa" }, { clave: "entreFases", label: "Entre fases" }],
        filas: [
          { clave: "bornes1m", label: "Bornes 1-M / 1-2" }, { clave: "bornes2m", label: "Bornes 2-M / 2-3" }, { clave: "bornes3m", label: "Bornes 3-M / 3-1" },
        ],
      },
      {
        tipo: "tabla", titulo: "3. Salida — Resistencia de bobina (Ω)", clave: "resistenciaSalida",
        columnas: [{ clave: "c14", label: "1-4" }, { clave: "c25", label: "2-5" }, { clave: "c36", label: "3-6" }],
        filas: [{ clave: "resistencia", label: "Resistencia (Ω)" }],
      },
      {
        tipo: "campos", titulo: "Prueba de motor (salida)",
        campos: [
          { clave: "vNom", label: "Vnom" }, { clave: "iNom", label: "Inom (A)" }, { clave: "conexionSal", label: "Conexión" },
        ],
      },
      {
        tipo: "tabla", titulo: "c. Prueba de motor — Tensión / Amperaje", clave: "pruebaMotorTabla",
        columnas: [{ clave: "c12", label: "1-2" }, { clave: "c23", label: "2-3" }, { clave: "c31", label: "3-1" }],
        filas: [{ clave: "tension", label: "Tensión" }, { clave: "amperaje", label: "Amperaje" }],
      },
      {
        tipo: "campos", titulo: "Prueba de motor (salida) — datos finales",
        campos: [{ clave: "rpmSalida", label: "RPM" }, { clave: "ivIn", label: "Iv/In (%)" }],
      },
      BULLETS_ESTANDAR("resumenTrabajo", "Resumen de trabajo"),
      BULLETS_ESTANDAR("recomendaciones", "Recomendaciones"),
      // El banner impreso solo dice "EVIDENCIAS FOTOGRAFICAS" en las 3
      // páginas (sin distinguir recepción/salida, ambas pruebas viven en la
      // página 1 antes de las fotos) — se dejó como una sola sección
      // genérica de 27 fotos, mismo patrón que bombas/tecnico_mantenimiento.
      {
        tipo: "galeriaFija", titulo: "Evidencias fotográficas", clave: "evidenciasFijas",
        paginas: [
          {
            titulo: "Página 2",
            slots: [
              { clave: "p2_1", label: "Foto 1" }, { clave: "p2_2", label: "Foto 2" }, { clave: "p2_3", label: "Foto 3" },
              { clave: "p2_4", label: "Foto 4" }, { clave: "p2_5", label: "Foto 5" }, { clave: "p2_6", label: "Foto 6" },
              { clave: "p2_7", label: "Foto 7" }, { clave: "p2_8", label: "Foto 8" }, { clave: "p2_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 3",
            slots: [
              { clave: "p3_1", label: "Foto 1" }, { clave: "p3_2", label: "Foto 2" }, { clave: "p3_3", label: "Foto 3" },
              { clave: "p3_4", label: "Foto 4" }, { clave: "p3_5", label: "Foto 5" }, { clave: "p3_6", label: "Foto 6" },
              { clave: "p3_7", label: "Foto 7" }, { clave: "p3_8", label: "Foto 8" }, { clave: "p3_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 4",
            slots: [
              { clave: "p4_1", label: "Foto 1" }, { clave: "p4_2", label: "Foto 2" }, { clave: "p4_3", label: "Foto 3" },
              { clave: "p4_4", label: "Foto 4" }, { clave: "p4_5", label: "Foto 5" }, { clave: "p4_6", label: "Foto 6" },
              { clave: "p4_7", label: "Foto 7" }, { clave: "p4_8", label: "Foto 8" }, { clave: "p4_9", label: "Foto 9" },
            ],
          },
        ],
      },
    ],
  },
  {
    valor: "bobina_estator_mtto",
    label: "Reporte de Bobina de Estator — Mantenimiento",
    archivoExcel: "REPORTE DE BOBINA DE ESTATOR-MTTO.xlsx",
    secciones: [
      { tipo: "campos", titulo: "Datos generales", campos: [...CAMPOS_HEADER_BOBINA, { clave: "planta", label: "Planta" }, { clave: "tecnico", label: "Técnico" }] },
      {
        tipo: "campos", titulo: "Datos del equipo — motor eléctrico",
        campos: [
          { clave: "marca", label: "Marca" }, { clave: "potencia", label: "Potencia" },
          { clave: "rpm", label: "RPM" }, { clave: "modelo", label: "Modelo" }, { clave: "nEquipo", label: "N°" },
        ],
        imagenes: [{ clave: "fotoPrincipalEquipo", label: "Foto principal del equipo" }],
      },
      // Antes era `evidencias` (grupos dinámicos sin celda mapeada — las
      // fotos quedaban sueltas al costado del Excel). Ahora 2 casilleros
      // fijos, uno por cada mitad de la caja impresa "EVIDENCIA DE LOS
      // TRABAJO" en la plantilla real.
      {
        tipo: "galeriaFija", titulo: "Evidencias de los trabajos", clave: "evidenciaTrabajosFija",
        paginas: [
          {
            titulo: "Página 1", cols: 2,
            slots: [
              { clave: "foto1", label: "Foto 1" }, { clave: "foto2", label: "Foto 2" },
            ],
          },
        ],
      },
      BULLETS_ESTANDAR("resumen", "Resumen", "¤"),
      BULLETS_ESTANDAR("recomendaciones", "Recomendaciones", "¤"),
      {
        tipo: "tabla", titulo: "Reporte de prueba de resistencia — megado de bobina", clave: "megadoBobina",
        columnas: [{ clave: "valor", label: "Valor" }],
        filas: [
          { clave: "fase1Tierra", label: "Fase uno a tierra" }, { clave: "fase2Tierra", label: "Fase dos a tierra" }, { clave: "fase3Tierra", label: "Fase tres a tierra" },
          { clave: "fase12", label: "Fase 1-2" }, { clave: "fase23", label: "Fase 2-3" }, { clave: "fase13", label: "Fase 1-3" },
        ],
      },
      // Evidencia fotográfica de cada lectura del megado — mismas 6 fases
      // que la tabla de arriba, una foto por cada una (ej. foto del display
      // del megóhmetro en el momento de la medición).
      {
        tipo: "galeriaFija", titulo: "Evidencia fotográfica — Megado de bobina", clave: "evidenciaMegado",
        paginas: [
          {
            titulo: "Página 2", cols: 2,
            slots: [
              { clave: "fase1Tierra", label: "Fase uno a tierra" }, { clave: "fase2Tierra", label: "Fase dos a tierra" },
              { clave: "fase3Tierra", label: "Fase tres a tierra" }, { clave: "fase12", label: "Fase 1-2" },
              { clave: "fase23", label: "Fase 2-3" }, { clave: "fase13", label: "Fase 1-3" },
            ],
          },
        ],
      },
    ],
  },
  {
    valor: "bobina_estator_rebo",
    label: "Reporte de Bobina de Estator — Rebobinado",
    archivoExcel: "REPORTE DE BOBINA DE ESTATOR-REBO.xlsx",
    secciones: [
      { tipo: "campos", titulo: "Datos generales", campos: [...CAMPOS_HEADER_BOBINA, { clave: "planta", label: "Planta" }, { clave: "tecnico", label: "Técnico" }] },
      {
        tipo: "campos", titulo: "Datos del equipo — motor eléctrico",
        campos: [
          { clave: "marca", label: "Marca" }, { clave: "potencia", label: "Potencia" },
          { clave: "rpm", label: "RPM" }, { clave: "modelo", label: "Modelo" }, { clave: "nEquipo", label: "N°" },
        ],
      },
      {
        tipo: "tabla", titulo: "Pruebas de resistencia", clave: "pruebasResistencia",
        columnas: [{ clave: "valor", label: "Valor" }],
        filas: [{ clave: "l14", label: "L 1-4" }, { clave: "l25", label: "L 2-5" }, { clave: "l36", label: "L 3-6" }, { clave: "tierra", label: "Tierra" }],
      },
      {
        tipo: "tabla", titulo: "Pruebas de aislamiento — ingreso", clave: "aislamientoIngreso",
        columnas: [{ clave: "valor", label: "Valor" }],
        filas: [
          { clave: "fase12", label: "Fase 1-2" }, { clave: "fase23", label: "Fase 2-3" }, { clave: "fase31", label: "Fase 3-1" },
          { clave: "f1Tierra", label: "F.1-Tierra" }, { clave: "f2Tierra", label: "F.2-Tierra" }, { clave: "f3Tierra", label: "F.3-Tierra" },
        ],
      },
      {
        tipo: "tabla", titulo: "Pruebas de aislamiento — salida", clave: "aislamientoSalida",
        columnas: [{ clave: "valor", label: "Valor" }],
        filas: [
          { clave: "fase12", label: "Fase 1-2" }, { clave: "fase23", label: "Fase 2-3" }, { clave: "fase31", label: "Fase 3-1" },
          { clave: "f1Tierra", label: "F.1-Tierra" }, { clave: "f2Tierra", label: "F.2-Tierra" }, { clave: "f3Tierra", label: "F.3-Tierra" },
        ],
      },
      {
        tipo: "campos", titulo: "Datos de bobina",
        campos: [
          { clave: "pase", label: "Pase" }, { clave: "nSalidas", label: "N° Salidas" },
          { clave: "alambre", label: "Alambre" }, { clave: "kgAlambre", label: "kg de alambre" },
          { clave: "vueltas", label: "Vueltas" }, { clave: "papelNomex", label: "Papel Nomex" },
          { clave: "conexion", label: "Conexión" },
          { clave: "gruposBobinas", label: "Grupos de Bobinas" }, { clave: "bobinasGrupo", label: "Bobinas por grupos" },
        ],
      },
      BULLETS_ESTANDAR("diagnostico", "Diagnóstico de motor", "¤"),
      BULLETS_ESTANDAR("conclusiones", "Conclusiones finales", "¤"),
      { tipo: "evidencias", titulo: "Evidencias fotográficas", clave: "evidencias" },
    ],
  },
  {
    valor: "tecnico_mantenimiento",
    label: "Informe Técnico de Mantenimiento",
    archivoExcel: "INFORME TECNICO DE MANTENIMIENTO.xlsx",
    secciones: [
      { tipo: "campos", titulo: "Datos generales", campos: [...CAMPOS_HEADER] },
      {
        tipo: "campos", titulo: "Datos técnicos",
        campos: [
          { clave: "placa", label: "Placa" }, { clave: "marca", label: "Marca" },
          { clave: "nSerie", label: "N. Serie" }, { clave: "tipoEquipo", label: "Tipo" },
        ],
      },
      {
        tipo: "checklist", titulo: "Revisión mecánica", hechoPor: true,
        items: [
          { clave: "engranaje", label: "Engranaje" }, { clave: "ejeSinFin", label: "Eje sin fin" },
          { clave: "tapasRodajes", label: "Tapas de rodajes" }, { clave: "rodamientos", label: "Rodamientos" },
          { clave: "canalChavetero", label: "Canal chavetero" }, { clave: "chaveta", label: "Chaveta" },
          { clave: "retenes", label: "Retenes" }, { clave: "tapaCiega", label: "Tapa ciega" },
        ],
        imagenes: [
          { clave: "imagenPrincipalA", label: "Imagen principal A" },
          { clave: "imagenPrincipalB", label: "Imagen principal B" },
        ],
      },
      BULLETS_ESTANDAR("observaciones", "Observaciones"),
      // Grilla fija de 31 fotos: página 1 tiene solo 4 (grilla 2x2, cajas más
      // grandes), páginas 2-4 tienen 9 cada una (grilla 3x3) — ver
      // MAPEOS.tecnico_mantenimiento.galeriaFija en informeTecnicoExcel.js.
      {
        tipo: "galeriaFija", titulo: "Evidencias fotográficas", clave: "evidenciasFijas",
        paginas: [
          {
            titulo: "Página 1", cols: 2,
            slots: [
              { clave: "p1_1", label: "Foto 1" }, { clave: "p1_2", label: "Foto 2" },
              { clave: "p1_3", label: "Foto 3" }, { clave: "p1_4", label: "Foto 4" },
            ],
          },
          {
            titulo: "Página 2",
            slots: [
              { clave: "p2_1", label: "Foto 1" }, { clave: "p2_2", label: "Foto 2" }, { clave: "p2_3", label: "Foto 3" },
              { clave: "p2_4", label: "Foto 4" }, { clave: "p2_5", label: "Foto 5" }, { clave: "p2_6", label: "Foto 6" },
              { clave: "p2_7", label: "Foto 7" }, { clave: "p2_8", label: "Foto 8" }, { clave: "p2_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 3",
            slots: [
              { clave: "p3_1", label: "Foto 1" }, { clave: "p3_2", label: "Foto 2" }, { clave: "p3_3", label: "Foto 3" },
              { clave: "p3_4", label: "Foto 4" }, { clave: "p3_5", label: "Foto 5" }, { clave: "p3_6", label: "Foto 6" },
              { clave: "p3_7", label: "Foto 7" }, { clave: "p3_8", label: "Foto 8" }, { clave: "p3_9", label: "Foto 9" },
            ],
          },
          {
            titulo: "Página 4",
            slots: [
              { clave: "p4_1", label: "Foto 1" }, { clave: "p4_2", label: "Foto 2" }, { clave: "p4_3", label: "Foto 3" },
              { clave: "p4_4", label: "Foto 4" }, { clave: "p4_5", label: "Foto 5" }, { clave: "p4_6", label: "Foto 6" },
              { clave: "p4_7", label: "Foto 7" }, { clave: "p4_8", label: "Foto 8" }, { clave: "p4_9", label: "Foto 9" },
            ],
          },
        ],
      },
      BULLETS_ESTANDAR("procesoTrabajo", "Proceso de trabajo"),
      BULLETS_ESTANDAR("recomendaciones", "Recomendaciones"),
    ],
  },
];

export const tipoInformePorValor = (valor) => TIPOS_INFORME.find((t) => t.valor === valor) || null;
