import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  CalendarDays,
  Clock,
  ExternalLink,
  Pencil,
  Loader2,
  Check,
} from "lucide-react";
import { TripPhoto } from "@/api/entities";
import PlanPhotoGrid from "@/components/PlanPhotoGrid";
import PlanNoteBox from "@/components/PlanNoteBox";
import DayPlanEditor, { emptySection } from "@/components/DayPlanEditor";
import { iconFor, styleFor } from "@/data/planStyles";
import { openMapUrl } from "@/lib/mapsLink";

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
      className="mt-1.5 flex max-w-full items-start gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition"
    >
      <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: bar }} />
      <span className="min-w-0 break-words underline decoration-dotted underline-offset-2">
        {item.address || "Открыть на карте"}
      </span>
      <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" />
    </a>
  );
}

export default function DayPlanModal({ plan, dayInfo, trip, onSave, onClose }) {
  const sections = useMemo(() => plan?.sections || [], [plan]);
  const hasPlan = sections.length > 0;

  const [photosByItem, setPhotosByItem] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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

  // Hold the page still behind the modal. Only `overflow` is touched: pinning
  // the body with `position: fixed` forces a full repaint, which Chrome has
  // been seen to flash as a black frame while the modal opens. The scrims are
  // plain translucent black for the same reason — a backdrop-filter gets
  // re-rasterised whenever the page behind it repaints, and Chrome paints that
  // gap black. Whether you saw it depended on which trip was open.
  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, []);

  const startEditing = (seed = false) => {
    setSaveError(null);
    setDraft({
      city: plan?.city || trip?.city || "",
      sections: seed && !hasPlan ? [emptySection()] : sections.map(cloneSection),
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(null);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(cleanPlan(draft));
      setEditing(false);
      setDraft(null);
    } catch (err) {
      console.error(err);
      setSaveError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const headerCity = plan?.city || trip?.city || "";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-stone-950/60 animate-in fade-in duration-200"
        onClick={editing ? undefined : onClose}
      />

      <motion.div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
        style={{ backgroundColor: "#fbf7f0" }}
        initial={false}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* Header band */}
        <div
          className="relative px-5 sm:px-7 pt-7 pb-6 shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #1d3b5c 0%, #2c5f8a 55%, #3a7ca5 100%)",
          }}
        >
          <div className="absolute top-5 right-5 flex gap-2">
            {!editing && (
              <button
                onClick={() => startEditing(true)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
                aria-label="Редактировать день"
                title="Редактировать день"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={editing ? cancelEditing : onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold tracking-widest uppercase">
            <CalendarDays className="h-4 w-4" />
            День {dayInfo?.dayNumber ?? "—"}
          </div>

          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-white">
            {editing ? "Редактирование дня" : headerCity || "План скоро появится"}
          </h2>
          <div className="mt-1.5 flex items-center gap-1.5 text-white/75 text-sm">
            {trip?.country && (
              <>
                <MapPin className="h-4 w-4" />
                {trip.country}
                <span className="mx-1.5 text-white/30">·</span>
              </>
            )}
            {dayInfo?.weekday}, {dayInfo?.label}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overscroll-contain px-4 sm:px-7 py-6 flex-1">
          {editing ? (
            <DayPlanEditor value={draft} onChange={setDraft} />
          ) : hasPlan ? (
            <div className="space-y-7">
              {sections.map((section, i) => {
                const Icon = iconFor(section.icon);
                const style = styleFor(section.icon);

                return (
                  <motion.div
                    key={section.id || section.title || i}
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

                    <ul
                      className="ml-2 sm:ml-5 pl-6 border-l-2 space-y-3"
                      style={{ borderColor: style.bar }}
                    >
                      {section.items.map((item) => (
                        <li key={item.id} className="relative min-w-0">
                          {/* centred on the 2px rule, level with the first text line */}
                          <span
                            className="absolute h-2.5 w-2.5 rounded-full"
                            style={{
                              left: "-30px",
                              top: "8px",
                              backgroundColor: style.bar,
                              boxShadow: `0 0 0 4px ${style.bg}`,
                            }}
                          />
                          <div className="text-stone-700 leading-relaxed break-words">
                            {item.text}
                          </div>
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
              <button
                type="button"
                onClick={() => startEditing(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition"
                style={{ backgroundColor: "#1d3b5c" }}
              >
                <Pencil className="h-4 w-4" />
                Составить план
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {editing ? (
          <div
            className="shrink-0 px-4 sm:px-7 py-4 flex items-center justify-end gap-2 border-t"
            style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
          >
            {saveError && (
              <span className="mr-auto text-sm text-[#a8451f]">{saveError}</span>
            )}
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-xl px-4 py-2.5 text-stone-600 font-medium transition hover:bg-stone-200/60"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition disabled:opacity-60"
              style={{ backgroundColor: "#1d3b5c" }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Сохранить
            </button>
          </div>
        ) : (
          <div
            className="shrink-0 px-4 sm:px-7 py-3.5 flex items-center gap-1.5 text-stone-400 text-xs border-t"
            style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
          >
            <Clock className="h-3.5 w-3.5" />
            {trip ? `${trip.city} ${trip.year}` : ""} · {dayInfo?.label}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Editing works on a copy, so cancelling really cancels.
function cloneSection(section) {
  return {
    id: section.id || `sec-${Math.random().toString(36).slice(2, 10)}`,
    title: section.title || "",
    icon: section.icon || "MapPin",
    mapUrl: section.mapUrl || "",
    items: (section.items || []).map((it) => ({
      id: it.id || `item-${Math.random().toString(36).slice(2, 10)}`,
      text: it.text || "",
      address: it.address || "",
      mapUrl: it.mapUrl || "",
    })),
  };
}

// Drops blank rows so a half-filled form doesn't leave empty bullets behind.
function cleanPlan(draft) {
  return {
    city: (draft.city || "").trim(),
    sections: (draft.sections || [])
      .map((s) => ({
        id: s.id,
        title: (s.title || "").trim(),
        icon: s.icon || "MapPin",
        mapUrl: (s.mapUrl || "").trim(),
        items: (s.items || [])
          .map((it) => ({
            id: it.id,
            text: (it.text || "").trim(),
            address: (it.address || "").trim(),
            mapUrl: (it.mapUrl || "").trim(),
          }))
          .filter((it) => it.text || it.address || it.mapUrl),
      }))
      .filter((s) => s.title || s.items.length),
  };
}
