import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plane,
  Car,
  Bus,
  Train,
  TramFront,
  BedDouble,
  Ship,
  UtensilsCrossed,
  MapPin,
  CalendarDays,
  Clock,
  Wine,
  Compass,
  Camera,
  Landmark,
  Church,
  Castle,
  Building2,
  Trees,
  Waves,
  Coffee,
  Sun,
  ExternalLink
} from "lucide-react";
import { TripPhoto } from "@/api/entities";
import PlanPhotoGrid from "@/components/PlanPhotoGrid";
import PlanNoteBox from "@/components/PlanNoteBox";
import { openMapUrl } from "@/lib/mapsLink";

const iconMap = {
  Plane,
  Car,
  Bus,
  Train,
  TramFront,
  BedDouble,
  Ship,
  UtensilsCrossed,
  Wine,
  Compass,
  Camera,
  Landmark,
  Church,
  Castle,
  Building2,
  Trees,
  Waves,
  Coffee,
  Sun,
  MapPin
};

const categoryStyle = {
  Plane: { bg: "#e7eff7", fg: "#1d3b5c", bar: "#3a7ca5" },
  Car: { bg: "#eaf1ec", fg: "#2f6b4f", bar: "#5b9a78" },
  Bus: { bg: "#e6f0f0", fg: "#226b6b", bar: "#4a9a9a" },
  Train: { bg: "#e9e8f4", fg: "#3a4a8a", bar: "#5a6db8" },
  TramFront: { bg: "#e6f1f4", fg: "#22617a", bar: "#3a8fa5" },
  BedDouble: { bg: "#f3ece4", fg: "#8a5a2b", bar: "#c49a5e" },
  Ship: { bg: "#e9eef6", fg: "#27557f", bar: "#4f86b8" },
  UtensilsCrossed: { bg: "#f7e9e3", fg: "#a8451f", bar: "#c4623a" },
  Wine: { bg: "#f1e6ef", fg: "#7a3a6b", bar: "#a85a8f" },
  Compass: { bg: "#eceef2", fg: "#4a5468", bar: "#6b7a8f" },
  Camera: { bg: "#f5e9ee", fg: "#9a3a5a", bar: "#b85a7a" },
  Landmark: { bg: "#f1ece2", fg: "#7a5a2a", bar: "#a8843a" },
  Church: { bg: "#efe9f4", fg: "#5a3a7a", bar: "#7a5a9a" },
  Castle: { bg: "#f0e8e2", fg: "#7a4a2a", bar: "#9a6a4a" },
  Building2: { bg: "#e9eef2", fg: "#3a5a7a", bar: "#4a6a8a" },
  Trees: { bg: "#eaf1ea", fg: "#2f6b3f", bar: "#5a9a5a" },
  Waves: { bg: "#e8f0f6", fg: "#27557f", bar: "#4a8ab8" },
  Coffee: { bg: "#f0e8e2", fg: "#7a5a3a", bar: "#8a6a4a" },
  Sun: { bg: "#f7ece0", fg: "#a86a1f", bar: "#d99a3a" },
  MapPin: { bg: "#e7eff7", fg: "#1d3b5c", bar: "#3a7ca5" }
};

function MapLink({ item, bar }) {
  if (!item.address && !item.mapUrl) return null;
  const href =
    item.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openMapUrl(href);
      }}
      className="mt-1.5 inline-flex items-start gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition"
    >
      <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: bar }} />
      <span className="underline decoration-dotted underline-offset-2">
        {item.address || "Открыть на карте"}
      </span>
      <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" />
    </a>
  );
}

export default function DayPlanModal({ plan, dayInfo, onClose }) {
  const hasPlan = !!plan;
  const [photosByItem, setPhotosByItem] = useState({});

  const loadPhotos = async () => {
    if (!dayInfo) return;
    try {
      const records = await TripPhoto.filter({ day_key: dayInfo.key });
      const grouped = {};
      records.forEach((r) => {
        if (!grouped[r.item_id]) grouped[r.item_id] = [];
        grouped[r.item_id].push(r);
      });
      setPhotosByItem(grouped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [dayInfo?.key]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-stone-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
        style={{ backgroundColor: "#fbf7f0" }}
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* Header band */}
        <div
          className="relative px-7 pt-7 pb-6 shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #1d3b5c 0%, #2c5f8a 55%, #3a7ca5 100%)"
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold tracking-widest uppercase">
            <CalendarDays className="h-4 w-4" />
            День {hasPlan ? plan.dayNumber : "—"}
          </div>

          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-white">
            {hasPlan ? plan.city : "План скоро появится"}
          </h2>
          {hasPlan ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-white/75 text-sm">
              <MapPin className="h-4 w-4" />
              {plan.country}
              <span className="mx-1.5 text-white/30">·</span>
              {dayInfo?.weekday}, {dayInfo?.label}
            </div>
          ) : (
            <div className="mt-1.5 text-white/70 text-sm">
              {dayInfo?.weekday}, {dayInfo?.label}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-7 py-6 flex-1">
          {hasPlan ? (
            <div className="space-y-7">
              {plan.sections.map((section, i) => {
                const Icon = iconMap[section.icon] || MapPin;
                const style = categoryStyle[section.icon] || categoryStyle.MapPin;
                const isTimeline = section.icon === "Plane";

                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.07 }}
                  >
                    <div className="flex items-center gap-3 mb-3.5">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl shrink-0"
                        style={{ backgroundColor: style.bg, color: style.fg }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-semibold text-stone-800 leading-tight">
                          {section.title}
                        </h3>
                        <span
                          className="block h-0.5 w-10 rounded-full mt-1"
                          style={{ backgroundColor: style.bar }}
                        />
                        {section.mapUrl && (
                          <a
                            href={section.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              openMapUrl(section.mapUrl);
                            }}
                            className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition"
                          >
                            <MapPin className="h-4 w-4 shrink-0" style={{ color: style.bar }} />
                            <span className="underline decoration-dotted underline-offset-2">
                              Открыть на карте
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>

                    {isTimeline ? (
                      <ul className="ml-5 pl-6 border-l-2 space-y-3" style={{ borderColor: style.bar }}>
                        {section.items.map((item) => (
                          <li key={item.id} className="relative">
                            <span
                              className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: style.bar,
                                boxShadow: `0 0 0 4px ${style.bg}`
                              }}
                            />
                            <div className="text-stone-700 leading-relaxed">{item.text}</div>
                            <MapLink item={item} bar={style.bar} />
                            <PlanPhotoGrid
                              itemId={item.id}
                              dayKey={dayInfo.key}
                              photos={photosByItem[item.id] || []}
                              onChanged={loadPhotos}
                            />
                            <PlanNoteBox itemId={item.id} dayKey={dayInfo.key} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="ml-1 space-y-3">
                        {section.items.map((item) => (
                          <li key={item.id}>
                            <div className="flex items-start gap-2.5 text-stone-700 leading-relaxed">
                              <span
                                className="mt-2 h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: style.bar }}
                              />
                              <span className="flex-1">
                                {item.text}
                                <MapLink item={item} bar={style.bar} />
                              </span>
                            </div>
                            <PlanPhotoGrid
                              itemId={item.id}
                              dayKey={dayInfo.key}
                              photos={photosByItem[item.id] || []}
                              onChanged={loadPhotos}
                            />
                            <PlanNoteBox itemId={item.id} dayKey={dayInfo.key} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl mb-4"
                style={{ backgroundColor: "#e8ddd0", color: "#1d3b5c" }}
              >
                <CalendarDays className="h-7 w-7" />
              </span>
              <p className="text-stone-600 font-medium">План на этот день ещё не составлен</p>
              <p className="text-stone-400 text-sm mt-1">Вернитесь позже — мы наполним его деталями</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-7 py-3.5 flex items-center gap-1.5 text-stone-400 text-xs border-t"
          style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
        >
          <Clock className="h-3.5 w-3.5" />
          Португалия 2026 · {dayInfo?.label}
        </div>
      </motion.div>
    </motion.div>
  );
}