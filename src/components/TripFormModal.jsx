import { useState } from "react";
import CountrySelect from "@/components/CountrySelect";
import Sheet, { SheetButton, SheetGroup, SheetRow, SheetSwitch, sheetInput } from "@/components/Sheet";
import { CURRENCIES, DEFAULT_CURRENCY, EXTRAS, tripExtras } from "@/lib/money";
import { t } from "@/lib/i18n";

const emptyTrip = {
  country: "",
  countryCode: "",
  city: "",
  startDate: "",
  endDate: "",
  currency: DEFAULT_CURRENCY,
};

// { insurance: true, sim: false } — which first-day extras the trip uses.
const extrasOf = (trip) => Object.fromEntries(EXTRAS.map(({ key }) => [key, tripExtras(trip).some((x) => x.key === key)]));

export default function TripFormModal({ trip, onSave, onClose }) {
  const [form, setForm] = useState({ ...emptyTrip, ...(trip || {}), extras: extrasOf(trip) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCountry = ({ code, name }) => {
    setForm((prev) => ({ ...prev, country: name, countryCode: code }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const country = form.country.trim();
    const city = form.city.trim();

    if (!country || !city) return setError(t("Укажите страну и город."));
    if (!form.startDate || !form.endDate) return setError(t("Укажите даты поездки."));
    // The year comes from the dates (the start year; the label shows
    // "2026-2027" when the trip runs into the next one).
    const year = Number(form.startDate.slice(0, 4));
    if (!year || year < 1900 || year > 2999) return setError(t("Проверьте даты поездки."));
    if (form.endDate < form.startDate)
      return setError(t("Дата возвращения раньше даты вылета."));

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
        currency: form.currency || DEFAULT_CURRENCY,
        // Switching one off only hides it; what was entered stays on day 1.
        extras: form.extras,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("Не удалось сохранить поездку."));
      setSaving(false);
    }
  };

  return (
    <Sheet
      as="form"
      onSubmit={submit}
      onClose={onClose}
      busy={saving}
      title={trip ? t("Изменить поездку") : t("Новая поездка")}
      subtitle={t("Куда летим?")}
      footer={
        <SheetButton type="submit" busy={saving}>
          {t("Сохранить")}
        </SheetButton>
      }
    >
      <SheetGroup>
        <SheetRow label={t("Страна")} htmlFor="trip-country">
          <CountrySelect id="trip-country" value={form.countryCode} fallbackName={form.country} onChange={setCountry} plain />
        </SheetRow>
        <SheetRow label={t("Город")} htmlFor="trip-city">
          <input id="trip-city" className={sheetInput} value={form.city} onChange={set("city")} placeholder={t("Краков")} />
        </SheetRow>
      </SheetGroup>

      <SheetGroup>
        <SheetRow label={t("Вылет")} htmlFor="trip-start">
          <input id="trip-start" type="date" className={sheetInput} value={form.startDate} onChange={set("startDate")} />
        </SheetRow>
        <SheetRow label={t("Возвращение")} htmlFor="trip-end">
          <input id="trip-end" type="date" className={sheetInput} value={form.endDate} onChange={set("endDate")} />
        </SheetRow>
      </SheetGroup>

      <SheetGroup>
        <SheetRow label={t("Валюта расходов")} htmlFor="trip-currency">
          <select
            id="trip-currency"
            className={sheetInput}
            value={form.currency || DEFAULT_CURRENCY}
            onChange={set("currency")}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </SheetRow>
      </SheetGroup>

      <SheetGroup label={t("Перед поездкой")}>
        {EXTRAS.map(({ key, title }) => (
          <SheetSwitch
            key={key}
            label={t(title)}
            checked={form.extras[key]}
            onChange={(on) => setForm((prev) => ({ ...prev, extras: { ...prev.extras, [key]: on } }))}
          />
        ))}
      </SheetGroup>

      {error && <p className="px-4 text-[15px] text-[#a8451f]">{error}</p>}
    </Sheet>
  );
}
