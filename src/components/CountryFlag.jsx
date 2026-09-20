import { flagEmoji } from "@/lib/countries";

/**
 * Flag image for an alpha-2 code. Windows has no colour flag glyphs, so the
 * emoji only serves as the alt text.
 */
export default function CountryFlag({ code, width = 22, className = "" }) {
  if (!code) return null;
  const height = Math.round((width * 3) / 4);
  return (
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt={flagEmoji(code)}
      loading="lazy"
      draggable={false}
      style={{ width, height }}
      className={`inline-block shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 ${className}`}
    />
  );
}
