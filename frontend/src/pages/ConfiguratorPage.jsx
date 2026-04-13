import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Building2,
  Cable,
  CheckCircle2,
  FileText,
  HardHat,
  MessageCircle,
  Package,
  Server,
  ShieldAlert,
  Video,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import { OrderReviewDrawer } from "../components/OrderReviewDrawer";
import { QuantityControl } from "../components/QuantityControl";
import { SelectorButton } from "../components/SelectorButton";
import { openBomPdfPreview } from "../utils/bomPdf";
import {
  buildEngineeringBom,
  CATEGORY_LABELS,
  metricizeText,
  PROJECT_RULES,
  SPEC_LABELS,
  toMetersLabel,
} from "../utils/engineeringBom";


const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COMPANY_LOGO_URL = "/logos/company.png";
const BRAND_LOGOS = {
  siemon: "/logos/siemon.png",
  panduit: "/logos/panduit.png",
  commscope: "/logos/commscope.png",
};
const PROJECT_ICONS = {
  oficina: Building2,
  cctv: Video,
  "data-center": Server,
};
const PROJECT_ACCENTS = {
  oficina: "rgba(37, 99, 235, 0.15)",
  cctv: "rgba(56, 189, 248, 0.2)",
  "data-center": "rgba(15, 23, 42, 0.14)",
};
const BRAND_ACCENTS = {
  siemon: "rgba(37, 99, 235, 0.12)",
  panduit: "rgba(14, 165, 233, 0.12)",
  commscope: "rgba(15, 23, 42, 0.08)",
};
const INSTALLATION_OPTIONS = [
  {
    id: "nuevo",
    name: "Nuevo",
    description: "Diseño desde cero con rack y canalización nueva.",
  },
  {
    id: "ampliacion",
    name: "Ampliación",
    description: "Agregar puntos sobre una infraestructura existente.",
  },
];
const POINT_PRESETS = [12, 24, 48, 96];


const buildWhatsappText = (projectName, points, items) => {
  const itemLines = items.map((item) => `- ${item.quantity}x ${metricizeText(item.name)} | SKU: ${item.article || "-"}`).join("\n");
  return `Hola, armé un presupuesto para un proyecto de ${projectName} con ${points} puntos.\n\nItems:\n${itemLines}\n\n¿Me confirman disponibilidad y precio?`;
};


const statusStyles = {
  available: "bg-emerald-50 text-emerald-700",
  short: "bg-amber-50 text-amber-700",
  generic: "bg-slate-100 text-slate-600",
};


const sortSummaryItems = (items) => {
  return [...items].sort((left, right) => {
    const categoryCompare = (CATEGORY_LABELS[left.category] || left.category).localeCompare(
      CATEGORY_LABELS[right.category] || right.category,
    );
    if (categoryCompare !== 0) {
      return categoryCompare;
    }
    return left.name.localeCompare(right.name);
  });
};


export default function ConfiguratorPage() {
  const [configurator, setConfigurator] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedInstallationType, setSelectedInstallationType] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [pointCount, setPointCount] = useState(24);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [selectedUserCordLength, setSelectedUserCordLength] = useState("");
  const [selectedRackCordLength, setSelectedRackCordLength] = useState("");
  const [pointsConfirmed, setPointsConfirmed] = useState(false);
  const [manualItemQuantities, setManualItemQuantities] = useState({});
  const [stockSearch, setStockSearch] = useState("");
  const [selectedStockCategory, setSelectedStockCategory] = useState("all");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [includedItemIds, setIncludedItemIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/configurator`);
      setConfigurator(response.data);
    } catch (fetchError) {
      console.error(fetchError);
      setError("No pudimos cargar el stock ahora mismo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const selectedProject = configurator?.projects?.find((project) => project.id === selectedProjectId);
  const selectedBrand = configurator?.brands?.find((brand) => brand.id === selectedBrandId);
  const projectRule = selectedProjectId ? PROJECT_RULES[selectedProjectId] : null;
  const brandInventory = configurator?.inventory_by_brand?.[selectedBrandId] || [];

  useEffect(() => {
    if (!projectRule) {
      return;
    }
    setSelectedSpec(projectRule.defaultSpec);
    setSelectedUserCordLength(projectRule.defaultUserCord);
    setSelectedRackCordLength(projectRule.defaultRackCord);
  }, [projectRule]);

  const engineeringBom = useMemo(() => {
    if (!selectedProjectId || !selectedInstallationType || !pointsConfirmed || !selectedBrandId || !pointCount || !selectedSpec) {
      return null;
    }

    return buildEngineeringBom({
      projectId: selectedProjectId,
      brandId: selectedBrandId,
      points: pointCount,
      spec: selectedSpec,
      userCordLength: selectedUserCordLength,
      rackCordLength: selectedRackCordLength,
      installationType: selectedInstallationType,
      inventory: brandInventory,
    });
  }, [
    brandInventory,
    pointCount,
    selectedBrandId,
    selectedInstallationType,
    selectedProjectId,
    selectedRackCordLength,
    selectedSpec,
    selectedUserCordLength,
  ]);

  const stockCategories = useMemo(() => ["all", ...new Set(brandInventory.map((item) => item.category))], [brandInventory]);

  const filteredInventory = useMemo(() => {
    const search = stockSearch.trim().toLowerCase();
    return brandInventory.filter((item) => {
      const matchesCategory = selectedStockCategory === "all" || item.category === selectedStockCategory;
      const matchesSearch = !search
        || item.name.toLowerCase().includes(search)
        || item.article.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [brandInventory, selectedStockCategory, stockSearch]);

  const summaryItems = useMemo(() => {
    const aggregated = new Map();

    (engineeringBom?.rows || []).forEach((row) => {
      aggregated.set(row.id, {
        id: row.id,
        quantity: row.quantity,
        name: row.name,
        article: row.article,
        category: row.category,
        unit: row.unit,
      });
    });

    brandInventory.forEach((item) => {
      const quantity = manualItemQuantities[item.id] || 0;
      if (!quantity) {
        return;
      }

      const existing = aggregated.get(item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        aggregated.set(item.id, {
          id: item.id,
          quantity,
          name: metricizeText(item.name),
          article: item.article,
          category: item.category,
          unit: "Unid.",
        });
      }
    });

    return sortSummaryItems([...aggregated.values()]);
  }, [brandInventory, engineeringBom?.rows, manualItemQuantities]);

  const whatsappItems = summaryItems.filter((item) => includedItemIds.includes(item.id));
  const previewText = summaryItems.slice(0, 2).map((item) => `${item.quantity}x ${item.article}`).join(" · ");

  useEffect(() => {
    const nextIds = summaryItems.map((item) => item.id);
    setIncludedItemIds((current) => {
      if (current.length === nextIds.length && current.every((id, index) => id === nextIds[index])) {
        return current;
      }
      return nextIds;
    });
    if (!summaryItems.length) {
      setReviewOpen(false);
    }
  }, [summaryItems]);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedInstallationType("");
    setSelectedBrandId("");
    setPointCount(24);
    setPointsConfirmed(false);
    setManualItemQuantities({});
    setStockSearch("");
    setSelectedStockCategory("all");
  };

  const handleBrandSelect = (brandId) => {
    setSelectedBrandId(brandId);
    setManualItemQuantities({});
    setStockSearch("");
    setSelectedStockCategory("all");
  };

  const updatePointCount = (nextValue) => {
    setPointCount(nextValue);
    setPointsConfirmed(false);
    setSelectedBrandId("");
    setManualItemQuantities({});
  };

  const handleManualItemQuantity = (itemId, delta) => {
    setManualItemQuantities((current) => {
      const nextValue = Math.max(0, (current[itemId] || 0) + delta);
      if (!nextValue) {
        const nextState = { ...current };
        delete nextState[itemId];
        return nextState;
      }
      return { ...current, [itemId]: nextValue };
    });
  };

  const handlePreviewPdf = async () => {
    if (!summaryItems.length || !engineeringBom || !selectedProject || !selectedBrand) {
      toast.error("Completá las preguntas cortas para generar el BOM.");
      return;
    }

    await openBomPdfPreview({
      companyName: configurator.company_name,
      companyLogoUrl: COMPANY_LOGO_URL,
      projectName: selectedProject.name,
      brandName: selectedBrand.name,
      primaryProduct: engineeringBom.rows[0],
      primaryQuantity: engineeringBom.metrics.coils,
      projectedPoints: engineeringBom.metrics.points,
      projectedMeters: engineeringBom.metrics.totalCableMeters,
      rule: { patch_panel_ports: engineeringBom.metrics.patchPanelPorts },
      engineeringNotes: engineeringBom.engineeringNotes,
      items: whatsappItems.length ? whatsappItems : summaryItems,
    });
  };

  const handleOpenReview = () => {
    if (!summaryItems.length) {
      toast.error("Completá el BOM técnico antes de pasar a WhatsApp.");
      return;
    }
    setReviewOpen(true);
  };

  const handleWhatsappOrder = () => {
    if (!selectedProject || !whatsappItems.length) {
      toast.error("Elegí al menos un item para enviar por WhatsApp.");
      return;
    }
    const text = buildWhatsappText(selectedProject.name, pointCount, whatsappItems);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setReviewOpen(false);
  };

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-start justify-center px-4 py-6" data-testid="loading-screen">
        <div className="w-full max-w-7xl space-y-4">
          <div className="selector-card h-40 animate-pulse rounded-[1.75rem] bg-white/80" />
          <div className="selector-card h-64 animate-pulse rounded-[1.75rem] bg-white/80" />
          <div className="selector-card h-72 animate-pulse rounded-[1.75rem] bg-white/80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-5" data-testid="error-screen">
        <div className="selector-card max-w-md rounded-[1.75rem] border border-red-100 bg-white p-6 text-center">
          <div data-testid="error-message" className="text-lg font-semibold text-slate-900">{error}</div>
          <button
            type="button"
            onClick={fetchCatalog}
            data-testid="retry-load-button"
            className="mt-5 inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
          >
            Reintentar carga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" data-testid="configurator-page">
      <div className={`mx-auto max-w-7xl px-4 py-6 lg:px-6 ${summaryItems.length ? "pb-40 lg:pb-6" : "pb-24 lg:pb-6"}`}>
        <header className="selector-card rounded-[2rem] border border-slate-200 bg-white/90 p-6" data-testid="page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex h-20 w-28 items-center justify-center rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-sm" data-testid="company-logo-shell">
              <img src={COMPANY_LOGO_URL} alt={configurator.company_name} data-testid="company-logo-image" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div data-testid="company-name" className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                {configurator.company_name}
              </div>
              <h1 data-testid="page-title" className="mt-2 text-balance text-[2.2rem] font-bold leading-none text-slate-900 lg:text-[3.2rem]">
                {configurator.title}
              </h1>
              <p data-testid="page-subtitle" className="mt-3 max-w-3xl text-base leading-relaxed text-slate-500">
                Contestá unas preguntas cortas y te armamos un BOM técnico con criterios de preventa, stock y notas de ingeniería, usando visualización en metros.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <main className="space-y-6">
            <section className="space-y-3" data-testid="project-selector-section">
              <div>
                <div data-testid="project-step-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paso 1</div>
                <h2 data-testid="project-step-title" className="mt-1 text-lg font-semibold text-slate-900">Elegí el tipo de proyecto</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {configurator.projects.map((project) => {
                  const Icon = PROJECT_ICONS[project.id];
                  return (
                    <SelectorButton
                      key={project.id}
                      label={project.name}
                      description={project.description}
                      active={selectedProjectId === project.id}
                      Icon={Icon}
                      accent={PROJECT_ACCENTS[project.id]}
                      onClick={() => handleProjectSelect(project.id)}
                      testId={`project-option-${project.id}`}
                    />
                  );
                })}
              </div>
            </section>

            {selectedProjectId && (
              <section className="product-card rounded-[1.75rem] border border-slate-200 bg-white p-5" data-testid="questions-section">
                <div className="flex flex-col gap-6">
                  <div>
                    <div data-testid="questions-step-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paso 2</div>
                    <h2 data-testid="questions-step-title" className="mt-1 text-lg font-semibold text-slate-900">Preguntas cortas para calcular el BOM</h2>
                    <p className="mt-2 text-sm text-slate-500">El asistente desbloquea cada bloque a medida que respondés el anterior.</p>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <div className="space-y-3" data-testid="installation-type-section">
                      <div className="text-sm font-semibold text-slate-900">Tipo de instalación</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {INSTALLATION_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedInstallationType(option.id)}
                            data-testid={`installation-option-${option.id}`}
                            className={`rounded-[1.25rem] border p-4 text-left transition ${selectedInstallationType === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            <div className="flex items-center gap-2 text-slate-900">
                              <HardHat className="h-4 w-4" />
                              <span className="font-semibold">{option.name}</span>
                            </div>
                            <div className="mt-2 text-sm text-slate-500">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedInstallationType && (
                      <div className="space-y-3" data-testid="points-question-section">
                      <div className="text-sm font-semibold text-slate-900">Cantidad de puntos</div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div data-testid="points-caption" className="text-sm text-slate-500">Ingresá la cantidad total de puntos de red a dimensionar.</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {POINT_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => updatePointCount(preset)}
                                  data-testid={`points-preset-${preset}`}
                                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${pointCount === preset ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                                >
                                  {preset} puntos
                                </button>
                              ))}
                            </div>
                          </div>
                          <QuantityControl
                            value={pointCount}
                            onIncrement={() => updatePointCount(pointCount + 1)}
                            onDecrement={() => updatePointCount(Math.max(1, pointCount - 1))}
                            testIdPrefix="network-points"
                            disabledDecrement={pointCount <= 1}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPointsConfirmed(true)}
                          data-testid="confirm-points-button"
                          className="mt-4 flex min-h-[3rem] items-center justify-center rounded-[1rem] bg-slate-900 px-4 text-sm font-semibold text-white"
                        >
                          Confirmar cantidad de puntos
                        </button>
                      </div>
                      </div>
                    )}
                  </div>

                  {selectedInstallationType && pointsConfirmed && pointCount > 0 && (
                    <div className="space-y-3" data-testid="brand-selector-section">
                    <div className="text-sm font-semibold text-slate-900">Marca objetivo</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {configurator.brands.map((brand) => (
                        <SelectorButton
                          key={brand.id}
                          label={brand.name}
                          description={brand.description}
                          active={selectedBrandId === brand.id}
                          Icon={Package}
                          logoUrl={BRAND_LOGOS[brand.id]}
                          accent={BRAND_ACCENTS[brand.id]}
                          onClick={() => handleBrandSelect(brand.id)}
                          testId={`brand-option-${brand.id}`}
                        />
                      ))}
                    </div>
                    </div>
                  )}

                  {projectRule && selectedBrandId && (
                    <div className="grid gap-5 xl:grid-cols-2">
                      <div className="space-y-3" data-testid="spec-selector-section">
                        <div className="text-sm font-semibold text-slate-900">Familia técnica sugerida</div>
                        <div className="flex flex-wrap gap-2">
                          {projectRule.allowedSpecs.map((spec) => (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => setSelectedSpec(spec)}
                              data-testid={`spec-option-${spec}`}
                              className={`rounded-full px-4 py-3 text-sm font-semibold transition ${selectedSpec === spec ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                            >
                              {SPEC_LABELS[spec]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3" data-testid="patch-cords-section">
                        <div className="text-sm font-semibold text-slate-900">Patch cords sugeridos</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Lado usuario</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {projectRule.userCordOptions.map((length) => (
                                <button
                                  key={length}
                                  type="button"
                                  onClick={() => setSelectedUserCordLength(length)}
                                  data-testid={`user-cord-length-${length}`}
                                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedUserCordLength === length ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
                                >
                                  {toMetersLabel(length)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Lado rack</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {projectRule.rackCordOptions.map((length) => (
                                <button
                                  key={length}
                                  type="button"
                                  onClick={() => setSelectedRackCordLength(length)}
                                  data-testid={`rack-cord-length-${length}`}
                                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedRackCordLength === length ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
                                >
                                  {toMetersLabel(length)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {engineeringBom ? (
              <>
                <section className="product-card rounded-[1.75rem] border border-slate-200 bg-white p-5" data-testid="bom-table-section">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div data-testid="bom-step-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paso 3</div>
                      <h3 data-testid="bom-step-title" className="mt-1 text-lg font-semibold text-slate-900">BOM técnico calculado</h3>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" data-testid="bom-status-badge">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" /> Ingeniería ANSI/TIA
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.25rem] bg-slate-50 p-4" data-testid="metric-cable-meters">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metraje total</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{engineeringBom.metrics.totalCableMeters} m</div>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4" data-testid="metric-coils">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Bobinas UTP</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{engineeringBom.metrics.coils}</div>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4" data-testid="metric-panels">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Patch panels</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{engineeringBom.metrics.patchPanels}</div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto" data-testid="bom-table-wrapper">
                    <table className="min-w-full border-separate border-spacing-y-2" data-testid="bom-table">
                      <thead>
                        <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          <th className="px-3 py-2">Código sugerido</th>
                          <th className="px-3 py-2">Descripción técnica</th>
                          <th className="px-3 py-2">Cantidad</th>
                          <th className="px-3 py-2">UM</th>
                          <th className="px-3 py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engineeringBom.rows.map((row) => (
                          <tr key={row.id} data-testid={`bom-row-${row.id}`} className="rounded-[1rem] bg-slate-50 text-sm text-slate-700">
                            <td className="rounded-l-[1rem] px-3 py-3 font-semibold text-slate-900">{row.article}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-900">{row.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{CATEGORY_LABELS[row.category] || row.category}</div>
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-900">{row.quantity}</td>
                            <td className="px-3 py-3">{row.unit}</td>
                            <td className="rounded-r-[1rem] px-3 py-3">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[row.status]}`} data-testid={`bom-row-status-${row.id}`}>
                                {row.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="product-card rounded-[1.75rem] border border-slate-200 bg-white p-5" data-testid="engineering-notes-section">
                  <div data-testid="engineering-notes-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Notas de ingeniería</div>
                  <div className="mt-4 space-y-3">
                    {engineeringBom.engineeringNotes.map((note, index) => (
                      <div key={note} data-testid={`engineering-note-${index}`} className="flex gap-3 rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <section className="selector-card rounded-[1.75rem] border border-dashed border-slate-300 bg-white/85 p-6" data-testid="selection-placeholder">
                <div className="text-lg font-semibold text-slate-900">Elegí proyecto, instalación, marca y puntos</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Cuando completes esas preguntas, vas a ver el cálculo de bobinas, jacks, faceplates, patch cords, patch panels y organizadores con cruce contra stock real.
                </p>
              </section>
            )}

            {selectedBrandId && (
              <section className="product-card rounded-[1.75rem] border border-slate-200 bg-white p-5" data-testid="stock-browser-section">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div data-testid="stock-browser-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paso 4</div>
                    <h3 data-testid="stock-browser-title" className="mt-1 text-lg font-semibold text-slate-900">Agregar extras desde stock de {selectedBrand?.name}</h3>
                    <p data-testid="stock-browser-description" className="mt-2 text-sm text-slate-500">Podés sumar bandejas, racks, organizadores u otros SKU fuera del BOM automático.</p>
                  </div>
                  <div data-testid="stock-browser-count" className="w-fit rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{brandInventory.length} SKU cargados</div>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder="Buscar por SKU o descripción"
                    data-testid="stock-search-input"
                    className="min-h-[3.25rem] flex-1 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2" data-testid="stock-category-filters">
                  {stockCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedStockCategory(category)}
                      data-testid={`stock-category-${category}`}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedStockCategory === category ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {category === "all" ? "Todos" : CATEGORY_LABELS[category] || category}
                    </button>
                  ))}
                </div>

                <div className="mt-5 space-y-3" data-testid="stock-items-list">
                  {filteredInventory.length ? (
                    filteredInventory.map((item) => {
                      const currentQuantity = manualItemQuantities[item.id] || 0;
                      return (
                        <div key={item.id} data-testid={`stock-item-row-${item.id}`} className="flex flex-col gap-3 rounded-[1.3rem] border border-slate-100 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div data-testid={`stock-item-name-${item.id}`} className="text-sm font-semibold text-slate-900">{metricizeText(item.name)}</div>
                            <div data-testid={`stock-item-meta-${item.id}`} className="mt-1 text-xs text-slate-500">{item.article} · {CATEGORY_LABELS[item.category] || item.category} · {item.stock} disponibles</div>
                          </div>
                          <QuantityControl
                            value={currentQuantity}
                            onIncrement={() => handleManualItemQuantity(item.id, 1)}
                            onDecrement={() => handleManualItemQuantity(item.id, -1)}
                            testIdPrefix={`stock-item-${item.id}`}
                            disabledDecrement={currentQuantity === 0}
                            disabledIncrement={currentQuantity >= item.stock}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div data-testid="stock-empty-state" className="rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm text-slate-500">No encontramos items para ese filtro dentro del stock de la marca seleccionada.</div>
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="hidden lg:block" data-testid="desktop-summary-panel">
            <div className="sticky top-6 space-y-4">
              <section className="summary-card rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div data-testid="summary-title" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Resumen técnico</div>
                <div data-testid="summary-count" className="mt-1 text-2xl font-semibold text-slate-900">
                  {engineeringBom ? `${summaryItems.length} items en BOM` : "Esperando preguntas"}
                </div>
                <div data-testid="summary-project" className="mt-1 text-sm text-slate-500">
                  {selectedProject ? `${selectedProject.name}${selectedBrand ? ` · ${selectedBrand.name}` : ""}` : "Elegí un proyecto"}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Puntos</div>
                    <div data-testid="desktop-metric-points" className="mt-2 text-xl font-semibold text-slate-900">{engineeringBom?.metrics.points || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Bobinas</div>
                    <div data-testid="desktop-metric-coils" className="mt-2 text-xl font-semibold text-slate-900">{engineeringBom?.metrics.coils || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metros</div>
                    <div data-testid="desktop-metric-meters" className="mt-2 text-xl font-semibold text-slate-900">{engineeringBom?.metrics.totalCableMeters || 0}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2" data-testid="summary-items-list">
                  {summaryItems.length ? (
                    summaryItems.map((item) => (
                      <div key={item.id} data-testid={`summary-item-${item.id}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
                        <div className="min-w-0 pr-3">
                          <div className="truncate text-slate-700">{metricizeText(item.name)}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.article}</div>
                        </div>
                        <span className="font-semibold text-slate-900">{item.quantity}x</span>
                      </div>
                    ))
                  ) : (
                    <div data-testid="summary-empty" className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">Respondé las preguntas cortas para generar el BOM de preventa.</div>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={handlePreviewPdf}
                    data-testid="desktop-preview-pdf-button"
                    disabled={!summaryItems.length}
                    className="flex min-h-[3.4rem] w-full items-center justify-center gap-3 rounded-[1.15rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" /> Visualizar PDF del BOM
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenReview}
                    data-testid="desktop-open-review-button"
                    disabled={!summaryItems.length}
                    className="flex min-h-[3.75rem] w-full items-center justify-center gap-3 rounded-[1.2rem] bg-[#25D366] px-6 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MessageCircle className="h-5 w-5" /> Revisar y enviar por WhatsApp
                  </button>
                </div>

                <p data-testid="desktop-pdf-note" className="mt-3 text-xs leading-relaxed text-slate-500">El PDF resume cálculo, SKU sugeridos y notas de ingeniería para revisión comercial.</p>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden" data-testid="sticky-summary-shell">
        {summaryItems.length ? (
          <div className="summary-card mx-auto max-w-md rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Resumen rápido</div>
                <div data-testid="mobile-summary-count" className="mt-1 text-lg font-semibold text-slate-900">{summaryItems.length} items · {pointCount} puntos</div>
                <div data-testid="mobile-summary-preview" className="mt-1 text-sm text-slate-500">{metricizeText(previewText)}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">PDF + WA</div>
            </div>
            <div className="mt-4 grid grid-cols-[7.25rem_1fr] gap-3">
              <button type="button" onClick={handlePreviewPdf} data-testid="mobile-preview-pdf-button" className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button type="button" onClick={handleOpenReview} data-testid="send-order-whatsapp-button" className="flex min-h-[3.4rem] items-center justify-center gap-3 rounded-[1.1rem] bg-[#25D366] px-5 text-sm font-bold text-white">
                <MessageCircle className="h-4 w-4" /> Revisar WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="summary-card mx-auto max-w-md rounded-[1.5rem] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.1)] backdrop-blur-xl" data-testid="summary-empty-bar">
            <div data-testid="summary-empty-mobile" className="text-sm font-medium text-slate-600">Elegí proyecto y respondé cada bloque para generar el BOM.</div>
          </div>
        )}
      </div>

      <OrderReviewDrawer
        open={reviewOpen}
        projectName={selectedProject?.name || ""}
        items={summaryItems}
        includedItemIds={includedItemIds}
        onClose={() => setReviewOpen(false)}
        onToggleItem={(itemId) => setIncludedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])}
        onConfirm={handleWhatsappOrder}
        onPreviewPdf={handlePreviewPdf}
        canPreviewPdf={Boolean(summaryItems.length)}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}