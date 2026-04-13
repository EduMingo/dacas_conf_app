export const PROJECT_RULES = {
  oficina: {
    lpc: 45,
    wasteFactor: 1.1,
    coilCapacity: 305,
    allowedSpecs: ["cat6a", "cat6"],
    defaultSpec: "cat6a",
    faceplateMode: "double",
    defaultUserCord: "5ft",
    defaultRackCord: "3ft",
    userCordOptions: ["3ft", "5ft", "7ft"],
    rackCordOptions: ["1ft", "3ft", "5ft"],
    engineeringNote: "Oficina se calcula con 45 m promedio por punto y 10% de reserva de cable.",
  },
  cctv: {
    lpc: 65,
    wasteFactor: 1.1,
    coilCapacity: 305,
    allowedSpecs: ["cat5e", "cat6", "cat6a"],
    defaultSpec: "cat6",
    faceplateMode: "single",
    defaultUserCord: "3ft",
    defaultRackCord: "1ft",
    userCordOptions: ["3ft", "5ft", "7ft"],
    rackCordOptions: ["1ft", "3ft", "5ft"],
    engineeringNote: "CCTV se calcula con 65 m promedio por punto para recorridos más largos y 10% de reserva.",
  },
  "data-center": {
    lpc: 25,
    wasteFactor: 1.1,
    coilCapacity: 305,
    allowedSpecs: ["cat6a"],
    defaultSpec: "cat6a",
    faceplateMode: "single",
    defaultUserCord: "3ft",
    defaultRackCord: "1ft",
    userCordOptions: ["1ft", "3ft", "5ft"],
    rackCordOptions: ["1ft", "3ft"],
    engineeringNote: "Data Center usa 25 m promedio por punto para enlaces cortos entre racks y 10% de reserva.",
  },
};

export const SPEC_LABELS = {
  cat5e: "Cat 5e",
  cat6: "Cat 6",
  cat6a: "Cat 6A",
};

export const CATEGORY_LABELS = {
  cable: "Cableado horizontal",
  jack: "Conectividad",
  faceplate: "Faceplates",
  patch_cord: "Patch Cords",
  panel: "Patch Panels",
  organizer: "Organizadores",
  connector: "Conectores",
  rack: "Racks",
  accessory: "Accesorios",
};

const INSTALLATION_NOTES = {
  nuevo: "Proyecto nuevo: considerar holgura adicional de ordenamiento y etiquetado en rack.",
  ampliacion: "Ampliación: validar compatibilidad con patcheras existentes y puertos disponibles en rack.",
};

const BRAND_NOTES = {
  siemon: "Siemon: se priorizan líneas Z-MAX para Cat 6A y MAX para Cat 6 cuando aplica.",
  panduit: "Panduit: se sugieren líneas Mini-Com o NetKey según disponibilidad y perfil del material.",
  commscope: "CommScope: se sugieren referencias NetConnect o SYSTIMAX según el stock cargado.",
};

const normalizeText = (value) => (value || "").toString().toLowerCase();

export const parseFeet = (value) => {
  const text = normalizeText(value);
  const feetMatch = text.match(/(\d+(?:\.\d+)?)\s*ft/);
  if (feetMatch) {
    return Number(feetMatch[1]);
  }
  const metersMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);
  if (metersMatch) {
    return Math.round(Number(metersMatch[1]) * 3.28084);
  }
  return null;
};

export const toMetersLabel = (value) => {
  const feet = parseFeet(value);
  if (feet !== null) {
    const meters = feet * 0.3048;
    const rounded = meters >= 1 ? Number(meters.toFixed(1)) : Number(meters.toFixed(2));
    return `${rounded} m`;
  }

  const text = normalizeText(value);
  const metersMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);
  if (metersMatch) {
    return `${Number(metersMatch[1])} m`;
  }

  return value;
};

export const metricizeText = (value) => {
  return (value || "").replace(/(\d+(?:\.\d+)?)\s*ft/gi, (_, amount) => `${toMetersLabel(`${amount}ft`)}`);
};

const parsePatchPanelPorts = (item) => {
  const text = `${item.article} ${item.name}`;
  if (/48/.test(text)) {
    return 48;
  }
  return 24;
};

const sortByPreference = (items, spec, extraSort) => {
  return [...items].sort((left, right) => {
    const leftPriority = left.spec === spec ? 0 : 1;
    const rightPriority = right.spec === spec ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    if (extraSort) {
      const extra = extraSort(left, right);
      if (extra !== 0) {
        return extra;
      }
    }
    if (right.stock !== left.stock) {
      return right.stock - left.stock;
    }
    return left.name.localeCompare(right.name);
  });
};

const pickFirst = (items, spec, extraSort) => sortByPreference(items, spec, extraSort)[0] || null;

const buildRow = ({ id, role, quantity, unit, product, genericArticle, genericDescription, descriptionOverride, category }) => {
  const availableStock = product?.stock ?? 0;
  const hasProduct = Boolean(product);
  const isEnough = hasProduct && availableStock >= quantity;

  return {
    id,
    role,
    quantity,
    unit,
    article: product?.article || genericArticle,
    name: descriptionOverride || product?.name || genericDescription,
    category: product?.category || category,
    source_brand: product?.source_brand || "Genérico",
    stock: availableStock,
    status: hasProduct ? (isEnough ? "available" : "short") : "generic",
    statusLabel: hasProduct
      ? (isEnough ? "Disponible en stock" : `Stock corto: hay ${availableStock}`)
      : "Sin SKU exacto en stock",
  };
};

export const buildEngineeringBom = ({
  projectId,
  brandId,
  points,
  spec,
  userCordLength,
  rackCordLength,
  installationType,
  inventory,
}) => {
  const rule = PROJECT_RULES[projectId];
  if (!rule || !brandId || !points || points <= 0) {
    return null;
  }

  const totalCableMeters = Math.ceil(points * rule.lpc * rule.wasteFactor);
  const coils = Math.ceil(totalCableMeters / rule.coilCapacity);
  const jacks = Math.ceil(points * 1.05);
  const faceplates = rule.faceplateMode === "double" ? Math.ceil(points / 2) : points;

  const cableItem = pickFirst(
    inventory.filter((item) => item.category === "cable" && item.spec === spec),
    spec,
  );

  const jackItem = pickFirst(
    inventory.filter((item) => item.category === "jack"),
    spec,
  );

  const faceplateItem = pickFirst(
    inventory.filter((item) => item.category === "faceplate"),
    spec,
  );

  const userPatchItem = pickFirst(
    inventory.filter((item) => item.category === "patch_cord"),
    spec,
    (left, right) => {
      const leftDiff = Math.abs((parseFeet(`${left.name} ${left.article}`) || 999) - parseFeet(userCordLength));
      const rightDiff = Math.abs((parseFeet(`${right.name} ${right.article}`) || 999) - parseFeet(userCordLength));
      return leftDiff - rightDiff;
    },
  );

  const rackPatchItem = pickFirst(
    inventory.filter((item) => item.category === "patch_cord"),
    spec,
    (left, right) => {
      const leftDiff = Math.abs((parseFeet(`${left.name} ${left.article}`) || 999) - parseFeet(rackCordLength));
      const rightDiff = Math.abs((parseFeet(`${right.name} ${right.article}`) || 999) - parseFeet(rackCordLength));
      return leftDiff - rightDiff;
    },
  );

  const panel24 = inventory.filter((item) => item.category === "panel" && parsePatchPanelPorts(item) === 24);
  const panel48 = inventory.filter((item) => item.category === "panel" && parsePatchPanelPorts(item) === 48);
  const patchPanelItem = panel24.length ? pickFirst(panel24, spec) : pickFirst(panel48, spec);
  const patchPanelPorts = patchPanelItem ? parsePatchPanelPorts(patchPanelItem) : 24;
  const patchPanels = Math.ceil(points / patchPanelPorts);

  const organizerItem = pickFirst(
    inventory.filter((item) => item.category === "organizer"),
    spec,
  );
  const organizers = patchPanels;

  const rows = [
    buildRow({
      id: `bom-cable-${spec}`,
      role: "cable",
      quantity: coils,
      unit: "Bobinas",
      product: cableItem,
      genericArticle: `GEN-CABLE-${spec.toUpperCase()}`,
      genericDescription: `Bobina UTP ${SPEC_LABELS[spec]} 305 m`,
      category: "cable",
    }),
    buildRow({
      id: `bom-jacks-${spec}`,
      role: "jack",
      quantity: jacks,
      unit: "Unid.",
      product: jackItem,
      genericArticle: `GEN-JACK-${spec.toUpperCase()}`,
      genericDescription: `Jack hembra ${SPEC_LABELS[spec]} con 5% de reserva`,
      category: "jack",
    }),
    buildRow({
      id: `bom-faceplate-${projectId}`,
      role: "faceplate",
      quantity: faceplates,
      unit: "Unid.",
      product: faceplateItem,
      genericArticle: `GEN-FP-${projectId.toUpperCase()}`,
      genericDescription: rule.faceplateMode === "double" ? "Faceplate doble" : "Faceplate simple / biscotto",
      category: "faceplate",
    }),
    buildRow({
      id: `bom-user-pc-${spec}`,
      role: "user_patch_cord",
      quantity: points,
      unit: "Unid.",
      product: userPatchItem,
      genericArticle: `GEN-PC-USER-${spec.toUpperCase()}`,
      genericDescription: `Patch cord lado usuario ${SPEC_LABELS[spec]} ${toMetersLabel(userCordLength)}`,
      descriptionOverride: `${metricizeText(userPatchItem?.name || `Patch cord lado usuario ${SPEC_LABELS[spec]} ${toMetersLabel(userCordLength)}`)} · lado usuario ${toMetersLabel(userCordLength)}`,
      category: "patch_cord",
    }),
    buildRow({
      id: `bom-rack-pc-${spec}`,
      role: "rack_patch_cord",
      quantity: points,
      unit: "Unid.",
      product: rackPatchItem,
      genericArticle: `GEN-PC-RACK-${spec.toUpperCase()}`,
      genericDescription: `Patch cord lado rack ${SPEC_LABELS[spec]} ${toMetersLabel(rackCordLength)}`,
      descriptionOverride: `${metricizeText(rackPatchItem?.name || `Patch cord lado rack ${SPEC_LABELS[spec]} ${toMetersLabel(rackCordLength)}`)} · lado rack ${toMetersLabel(rackCordLength)}`,
      category: "patch_cord",
    }),
    buildRow({
      id: `bom-panel-${patchPanelPorts}`,
      role: "patch_panel",
      quantity: patchPanels,
      unit: "Unid.",
      product: patchPanelItem,
      genericArticle: `GEN-PP-${patchPanelPorts}`,
      genericDescription: `Patch Panel ${patchPanelPorts} puertos`,
      category: "panel",
    }),
    buildRow({
      id: `bom-organizer-${patchPanelPorts}`,
      role: "organizer",
      quantity: organizers,
      unit: "Unid.",
      product: organizerItem,
      genericArticle: `GEN-ORG-1U`,
      genericDescription: "Organizador horizontal 1U",
      category: "organizer",
    }),
  ];

  const engineeringNotes = [
    `${points} puntos × ${rule.lpc} m promedio = ${points * rule.lpc} m base.`,
    `Se aplicó 10% de desperdicio para un total de ${totalCableMeters} m de cable.`,
    `Se recomienda dejar holgura de servicio y ordenamiento en rack para mantenimiento.`,
    INSTALLATION_NOTES[installationType] || INSTALLATION_NOTES.nuevo,
    BRAND_NOTES[brandId] || "Se sugiere validar línea comercial exacta según disponibilidad.",
  ];

  return {
    metrics: {
      points,
      totalCableMeters,
      coils,
      jacks,
      faceplates,
      patchPanels,
      patchPanelPorts,
      organizers,
    },
    rows,
    engineeringNotes,
  };
};