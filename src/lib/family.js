// Who made a trip, for trips whose name is hidden behind a PIN (the other
// family members see only "Private trip", so this is what tells two of them
// apart). Keep the e-mails in step with ALLOWED_EMAILS in config.js.

import { getLang } from "@/lib/i18n";

const NAMES = {
  "yoffedani@gmail.com": { ru: "Даниэль", en: "Daniel", he: "דניאל" },
  "yoffeleonid@gmail.com": { ru: "Леон", en: "Leon", he: "לאוניד" },
  "yoffelena@gmail.com": { ru: "Лена", en: "Lena", he: "לנה" },
};

export function ownerName(trip) {
  const email = String(trip?.created_by || "").toLowerCase();
  if (!email) return "";
  return NAMES[email]?.[getLang()] || email.split("@")[0];
}
