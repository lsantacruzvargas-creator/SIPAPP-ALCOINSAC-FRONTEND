import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportarCotizacionPdf = (cotizacion) => {
  const doc = new jsPDF();
  const empresa = cotizacion.empresa;
  let y = 18;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Alcoinsac", 105, y, { align: "center" });
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`COTIZACIÓN N° ${cotizacion.codigo}`, 105, y, { align: "center" });
  y += 10;

  if (empresa) {
    doc.setFont("helvetica", "bold");
    doc.text(empresa.razonSocial, 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (empresa.ruc) { doc.text(`RUC: ${empresa.ruc}`, 14, y); y += 5; }
    if (empresa.direccion) { doc.text(empresa.direccion, 14, y); y += 5; }
    if (empresa.telefono) { doc.text(`Tel: ${empresa.telefono}`, 14, y); y += 5; }
  }

  y += 2;
  doc.setFontSize(9);
  const fechaStr = new Date(cotizacion.fecha).toLocaleDateString("es-PE");
  doc.text(`Fecha: ${fechaStr}`, 14, y);
  doc.text(`Condición de pago: ${cotizacion.condicionPago}`, 196, y, { align: "right" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(cotizacion.titulo, 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["#", "Descripción", "Cant.", "F. Entrega", "Precio", "Mon.", "Subtotal"]],
    body: cotizacion.items.map((item, i) => {
      let desc = item.descripcion;
      if (item.subItems?.length > 0) {
        desc += "\n" + item.subItems.map((s) => `  • ${s}`).join("\n");
      }
      return [
        i + 1,
        desc,
        item.cantidad,
        item.fechaEntrega ? new Date(item.fechaEntrega).toLocaleDateString("es-PE") : "-",
        Number(item.precio).toFixed(2),
        item.moneda === "PEN" ? "S/" : "$",
        Number(item.subtotal).toFixed(2),
      ];
    }),
    foot: [
      ["", "", "", "", "", "", "Subtotal:", Number(cotizacion.subtotal).toFixed(2)],
      ["", "", "", "", "", "", "IGV 18%:", Number(cotizacion.igv).toFixed(2)],
      ["", "", "", "", "", "", "TOTAL:", Number(cotizacion.total).toFixed(2)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30], fontSize: 8 },
    footStyles: { fontStyle: "bold", fillColor: [245, 245, 245], textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 22, halign: "right" },
    },
  });

  doc.save(`${cotizacion.codigo}.pdf`);
};
