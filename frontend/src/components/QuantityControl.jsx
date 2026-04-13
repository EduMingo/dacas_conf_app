import { Minus, Plus } from "lucide-react";

export const QuantityControl = ({
  value,
  onIncrement,
  onDecrement,
  testIdPrefix,
  disabledIncrement = false,
  disabledDecrement = false,
}) => {
  return (
    <div
      data-testid={`${testIdPrefix}-control`}
      className="flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1.5"
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabledDecrement}
        data-testid={`${testIdPrefix}-decrease`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition-transform duration-200 active:scale-95 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div
        data-testid={`${testIdPrefix}-value`}
        className="min-w-[3.5rem] px-3 text-center text-lg font-bold text-slate-900"
      >
        {value}
      </div>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabledIncrement}
        data-testid={`${testIdPrefix}-increase`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition-transform duration-200 active:scale-95 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};