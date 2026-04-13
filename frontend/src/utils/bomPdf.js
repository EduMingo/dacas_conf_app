import { jsPDF } from "jspdf";


const safeText = (value) => (value || "-").toString();
const CATEGORY_LABELS = {
  cable: "Cables",
  jack: "Jacks",
  faceplate: "Faceplates",
  patch_cord: "Patch Cords",
  panel: "Patcheras",
  connector: "Conectores",
  organizer: "Organizadores",
  rack: "Racks",
  accessory: "Accesorios",
};


const toDataUrl = async (imageUrl) => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


const drawTableHeader = (doc, y) => {
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(42, y, 512, 26, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SKU", 52, y + 17);
  doc.text("Descripción", 150, y + 17);
  doc.text("Cant.", 505, y + 17);
};


export const openBomPdfPreview = ({
  companyName,
  companyLogoUrl,
  projectName,
  brandName,
  primaryProduct,
  primaryQuantity,
  projectedPoints,
  projectedMeters,
  rule,
  engineeringNotes,
  items,
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let cursorY = 56;

  return (async () => {
    if (companyLogoUrl) {
      try {
        const logoData = await toDataUrl(companyLogoUrl);
        doc.addImage(logoData, "PNG", 42, 40, 74, 42);
      } catch (error) {
        console.error("No se pudo cargar el logo para PDF", error);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(safeText(companyName), 126, cursorY);

    cursorY += 26;
    doc.setFontSize(16);
    doc.text("BOM del Configurador de Stock Rápido", 126, cursorY);

    cursorY += 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Proyecto: ${safeText(projectName)}`, 42, cursorY);
    doc.text(`Marca: ${safeText(brandName)}`, 300, cursorY);

    cursorY += 18;
    doc.text(`Bobina principal: ${safeText(primaryProduct?.name)}`, 42, cursorY);

    cursorY += 18;
    doc.text(`Cantidad de bobinas: ${safeText(primaryQuantity)}`, 42, cursorY);
    doc.text(`Puntos proyectados: ${safeText(projectedPoints)}`, 300, cursorY);

    cursorY += 18;
    doc.text(`Metros cubiertos: ${safeText(projectedMeters)} m`, 42, cursorY);
    doc.text(`Patchera cada ${safeText(rule?.patch_panel_ports)} puntos`, 300, cursorY);

    cursorY += 28;
    doc.setFont("helvetica", "bold");
    doc.text("Items del BOM", 42, cursorY);

    cursorY += 20;
    drawTableHeader(doc, cursorY);
    cursorY += 38;

    const sortedItems = [...items].sort((left, right) => {
      const leftCategory = CATEGORY_LABELS[left.category] || left.category || "";
      const rightCategory = CATEGORY_LABELS[right.category] || right.category || "";
      const categoryCompare = leftCategory.localeCompare(rightCategory);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return left.name.localeCompare(right.name);
    });

    sortedItems.forEach((item) => {
      const description = `${safeText(item.name)} (${CATEGORY_LABELS[item.category] || safeText(item.category)})`;
      const skuLines = doc.splitTextToSize(safeText(item.article), 85);
      const descriptionLines = doc.splitTextToSize(description, 320);
      const rowHeight = Math.max(skuLines.length, descriptionLines.length, 1) * 13 + 10;

      if (cursorY + rowHeight > 760) {
        doc.addPage();
        cursorY = 56;
        drawTableHeader(doc, cursorY);
        cursorY += 38;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(skuLines, 52, cursorY);
      doc.text(descriptionLines, 150, cursorY);
      doc.text(String(item.quantity), 515, cursorY);
      doc.setDrawColor(226, 232, 240);
      doc.line(42, cursorY + rowHeight - 6, 554, cursorY + rowHeight - 6);
      cursorY += rowHeight;
    });

    cursorY += 18;
    if (engineeringNotes?.length) {
      if (cursorY > 700) {
        doc.addPage();
        cursorY = 56;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Notas de Ingeniería", 42, cursorY);
      cursorY += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      engineeringNotes.forEach((note) => {
        const noteLines = doc.splitTextToSize(`• ${note}`, 500);
        if (cursorY + noteLines.length * 12 > 760) {
          doc.addPage();
          cursorY = 56;
        }
        doc.text(noteLines, 42, cursorY);
        cursorY += noteLines.length * 12 + 6;
      });
    }

    cursorY += 12;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Este PDF fue generado para revisión visual y adjunto manual por WhatsApp.", 42, cursorY);

    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
  })();
};