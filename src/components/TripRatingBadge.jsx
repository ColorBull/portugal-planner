import { Star } from "lucide-react";
import { tripIsOver, tripRating } from "@/lib/tripSummary";
import { localeTag, t } from "@/lib/i18n";

const STAR = "#e0a06f";

// The family's score of a trip (the average of everyone's stars on its summary
// page), shown next to its name in the trip list and the trip header. A trip
// that is over and not rated yet gets a "Оценить" chip instead. `onRate` opens
// the summary page; without it the badge is just a label.
export default function TripRatingBadge({ trip, onRate, size = "sm", className = "" }) {
  const { avg, count } = tripRating(trip);
  if (avg === null && !(onRate && tripIsOver(trip))) return null;

  const big = size === "lg";
  const body =
    avg === null ? (
      <>
        <Star className={big ? "h-4 w-4" : "h-3.5 w-3.5"} style={{ color: STAR }} />
        {t("Оценить")}
      </>
    ) : (
      <>
        <Star className={big ? "h-4 w-4" : "h-3.5 w-3.5"} style={{ color: STAR, fill: STAR }} />
        {avg.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        <span className="font-normal text-stone-400">({count})</span>
      </>
    );
  const title =
    avg === null
      ? t("Поездка закончилась — поставьте ей оценку")
      : t("Оценка семьи: {avg} из 5 · оценили: {n}", {
          avg: avg.toLocaleString(localeTag(), { maximumFractionDigits: 1 }),
          n: count,
        });
  const cls = `inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#fbf1e6] font-semibold tabular-nums text-stone-700 ring-1 ring-[#f0dcc6] ${
    big ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs"
  } ${className}`;

  if (!onRate) {
    return (
      <span dir={avg === null ? undefined : "ltr"} className={cls} title={title}>
        {body}
      </span>
    );
  }
  // Also used inside the trip card's own button, so it is a span with the
  // role of a button rather than a nested <button>.
  return (
    <span
      role="button"
      tabIndex={0}
      dir={avg === null ? undefined : "ltr"}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onRate();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        onRate();
      }}
      className={`${cls} cursor-pointer transition hover:bg-[#f7e6d3]`}
    >
      {body}
    </span>
  );
}
