import { CalendarDays, Receipt } from "lucide-react";
import { t } from "@/lib/i18n";

// Where a price is counted (lib/money.js): "Расход дня" — in that day's total;
// "Общий расход" — the trip's as a whole (flights, hotels, car rental,
// insurance…), left out of the day and added up in the trip's summary.
// `value` is `fixed` (true = general). Asked whenever a price is entered.
//
// An iOS segmented control: the chosen one a white segment on grey.
// The buttons never take focus (mousedown is cancelled), so picking one while
// typing a price doesn't blur the field and save it half-way.
export default function ExpenseScope({ value, onChange, className = "" }) {
  const option = (fixed, Icon, label) => {
    const on = !!value === fixed;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          if (!on) onChange(fixed);
        }}
        className={`inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-[13px] font-medium transition sm:flex-none ${
          on ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );
  };
  return (
    <div
      role="radiogroup"
      aria-label={t("Как учитывать расход")}
      data-no-swipe
      className={`inline-flex items-center gap-0.5 rounded-[9px] bg-stone-200 p-0.5 ${className}`}
    >
      {option(false, CalendarDays, t("Расход дня"))}
      {option(true, Receipt, t("Общий расход"))}
    </div>
  );
}
