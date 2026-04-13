export const SelectorButton = ({
  label,
  description,
  active,
  Icon,
  logoUrl,
  onClick,
  testId,
  accent,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`selector-card min-h-[7.75rem] rounded-[1.4rem] border p-4 text-left transition-all duration-200 ${
        active
          ? "border-blue-600 bg-blue-50 text-slate-900 shadow-lg shadow-blue-500/10"
          : "border-slate-200 bg-white/95 text-slate-600"
      }`}
    >
      <div
        data-testid={`${testId}-icon`}
        className={`mb-4 flex ${logoUrl ? "h-14 w-full justify-center rounded-[1rem] bg-white px-3" : "h-12 w-12 justify-center rounded-2xl"} items-center`}
        style={{ backgroundColor: accent }}
      >
        {logoUrl ? (
          <div className="flex h-8 w-28 items-center justify-center" data-testid={`${testId}-logo-frame`}>
            <img
              src={logoUrl}
              alt={label}
              data-testid={`${testId}-logo`}
              className="max-h-8 max-w-28 object-contain"
            />
          </div>
        ) : (
          <Icon className="h-6 w-6 text-slate-900" />
        )}
      </div>
      <div data-testid={`${testId}-label`} className="text-base font-semibold text-slate-900">
        {label}
      </div>
      <div
        data-testid={`${testId}-description`}
        className="mt-1 text-sm leading-snug text-slate-500"
      >
        {description}
      </div>
      <div data-testid={`${testId}-status`} className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]">
        {active ? "Seleccionado" : "Tocar para elegir"}
      </div>
    </button>
  );
};