import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Globe2 } from "lucide-react";
import CountrySelect from "@/components/CountrySelect";

const field =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-stone-800 " +
  "outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20";

const label = "block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5";

const emptyTrip = {
  country: "",
  countryCode: "",
  city: "",
  year: new Date().getFullYear(),
  startDate: "",
  endDate: "",
};

export default function TripFormModal({ trip, onSave, onClose }) {
  const [form, setForm] = useState({ ...emptyTrip, ...(trip || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Picking a start date settles the year too.
      if (key === "startDate" && /^\d{4}-/.test(value)) {
        next.year = Number(value.slice(0, 4));
      }
      return next;
    });
  };

  const setCountry = ({ code, name }) => {
    setForm((prev) => ({ ...prev, country: name, countryCode: code }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const country = form.country.trim();
    const city = form.city.trim();
    const year = Number(form.year);

    if (!country || !city) return setError("Укажите страну и город.");
    if (!year || year < 1900 || year > 2999) return setError("Укажите год поездки.");
    if (!form.startDate || !form.endDate) return setError("Укажите даты поездки.");
    if (form.endDate < form.startDate)
      return setError("Дата возвращения раньше даты вылета.");

    setSaving(true);
    setError(null);
    try {
      await onSave({
        country,
        countryCode: form.countryCode || "",
        city,
        year,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить поездку.");
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-stone-950/60" onClick={onClose} />

      <motion.form
        onSubmit={submit}
        className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
        style={{ backgroundColor: "#fbf7f0" }}
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div
          className="relative px-7 py-6"
          style={{
            background: "linear-gradient(135deg, #1d3b5c 0%, #2c5f8a 55%, #3a7ca5 100%)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold tracking-widest uppercase">
            <Globe2 className="h-4 w-4" />
            {trip ? "Изменить поездку" : "Новая поездка"}
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">
            Куда летим?
          </h2>
        </div>

        <div className="px-7 py-6 space-y-4">
          <div>
            <label className={label} htmlFor="trip-country">Страна</label>
            <CountrySelect
              id="trip-country"
              value={form.countryCode}
              fallbackName={form.country}
              onChange={setCountry}
            />
          </div>

          <div>
            <label className={label} htmlFor="trip-city">Город</label>
            <input
              id="trip-city"
              className={field}
              value={form.city}
              onChange={set("city")}
              placeholder="Краков"
            />
          </div>

          <div>
            <label className={label} htmlFor="trip-year">Год</label>
            <input
              id="trip-year"
              type="number"
              className={field}
              value={form.year}
              onChange={set("year")}
              min="1900"
              max="2999"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="trip-start">Вылет</label>
              <input
                id="trip-start"
                type="date"
                className={field}
                value={form.startDate}
                onChange={set("startDate")}
              />
            </div>
            <div>
              <label className={label} htmlFor="trip-end">Возвращение</label>
              <input
                id="trip-end"
                type="date"
                className={field}
                value={form.endDate}
                onChange={set("endDate")}
              />
            </div>
          </div>

          {error && <p className="text-sm text-[#a8451f]">{error}</p>}
        </div>

        <div
          className="px-7 py-4 flex justify-end gap-2 border-t"
          style={{ borderColor: "#ece3d4", backgroundColor: "#f7f1e6" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-stone-600 font-medium transition hover:bg-stone-200/60"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition disabled:opacity-60"
            style={{ backgroundColor: "#1d3b5c" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
