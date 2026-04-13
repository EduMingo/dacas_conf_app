import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, MessageCircle, X } from "lucide-react";

export const OrderReviewDrawer = ({
  open,
  projectName,
  items,
  includedItemIds,
  onClose,
  onToggleItem,
  onConfirm,
  onPreviewPdf,
  canPreviewPdf,
}) => {
  const selectedCount = items.filter((item) => includedItemIds.includes(item.id)).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="whatsapp-review-overlay"
            className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm"
          />

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.24 }}
            className="fixed bottom-0 left-0 right-0 z-[61] px-3 pb-3"
            data-testid="whatsapp-review-drawer"
          >
            <div className="mx-auto max-w-md rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_-20px_50px_rgba(15,23,42,0.22)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div data-testid="review-drawer-label" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Ventana de envío por WhatsApp
                  </div>
                  <h3 data-testid="review-drawer-title" className="mt-1 text-xl font-semibold text-slate-900">
                    Elegí los items que querés incluir
                  </h3>
                  <p data-testid="review-drawer-project" className="mt-1 text-sm text-slate-500">
                    {projectName ? `Proyecto ${projectName}` : "Sin proyecto seleccionado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="close-review-button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div data-testid="review-selected-count" className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedCount ? `${selectedCount} items irán al mensaje final.` : "Marcá al menos un item para continuar."}
              </div>

              <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-1" data-testid="review-items-list">
                {items.map((item) => {
                  const active = includedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleItem(item.id)}
                      data-testid={`review-item-toggle-${item.id}`}
                      className={`flex w-full items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div
                        data-testid={`review-item-checkbox-${item.id}`}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div data-testid={`review-item-name-${item.id}`} className="truncate text-sm font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div data-testid={`review-item-quantity-${item.id}`} className="mt-1 text-xs text-slate-500">
                          {item.quantity}x seleccionado
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onPreviewPdf}
                  data-testid="preview-pdf-button"
                  disabled={!canPreviewPdf}
                  className="flex min-h-[3.4rem] w-full items-center justify-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Visualizar PDF
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  data-testid="confirm-whatsapp-button"
                  disabled={!selectedCount}
                  className="flex min-h-[3.75rem] w-full items-center justify-center gap-3 rounded-[1.2rem] bg-[#25D366] px-6 text-base font-bold text-white transition-transform duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-5 w-5" />
                  Enviar a WhatsApp
                </button>
              </div>
              <p data-testid="review-drawer-note" className="mt-3 text-xs leading-relaxed text-slate-500">
                El PDF se abre aparte para revisarlo y adjuntarlo manualmente si lo necesitás.
              </p>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
};