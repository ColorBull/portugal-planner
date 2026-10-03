import { useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { TripNote, TripPhoto } from "@/api/entities";
import { saveGoogleDoc } from "@/api/drive";
import { tripUploadFolder } from "@/api/tripFolders";
import { isOnline } from "@/api/offline";
import { buildTripHtml, tripDocName } from "@/lib/tripExport";
import { t, localeTag } from "@/lib/i18n";

// Export a trip to one Google Doc in the shared Drive folder, for NotebookLM.
// The doc is overwritten on every export, so its link never changes and the
// NotebookLM source only needs "sync with Drive" to catch up.
// No open animation: see CLAUDE.md (black frame).

const primary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#1d3b5c] px-4 py-2 text-sm font-medium " +
  "text-white transition hover:bg-[#16304b] disabled:opacity-50";

const secondary =
  "rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-800 " +
  "disabled:opacity-50";

export default function TripExportDialog({ trip, days, onSaved, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const docId = trip.export_doc_id || null;
  const docUrl = docId ? `https://docs.google.com/document/d/${docId}/edit` : "";
  const when = trip.export_date ? new Date(trip.export_date).toLocaleString(localeTag()) : null;

  const run = async () => {
    if (!isOnline()) return setError(t("Нет подключения к интернету."));
    setBusy(true);
    setError(null);
    try {
      const [notes, photos] = await Promise.all([TripNote.filter(), TripPhoto.filter()]);
      const html = buildTripHtml({ trip, days, notes, photos });
      const folderId = await tripUploadFolder(trip);
      const saved = await saveGoogleDoc({ fileId: docId, name: tripDocName(trip), html, folderId });
      await onSaved(saved.id);
    } catch (err) {
      console.error(err);
      setError(err?.message || t("Не удалось выгрузить поездку."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(docUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t("Скопируйте ссылку:"), docUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60" onClick={busy ? undefined : onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ backgroundColor: "#fbf7f0" }}
      >
        <div className="flex items-center gap-2 text-[#1d3b5c]">
          <BookOpen className="h-4 w-4" />
          <h2 className="font-display text-xl font-semibold">{t("Выгрузка для NotebookLM")}</h2>
        </div>

        {!docId ? (
          <p className="mt-2 text-sm text-stone-600">
            {t("Весь план поездки — дни, цены, заметки и ссылки на документы — будет сохранён одним Google-документом в общей папке Drive.")}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-600">
              {t("Документ уже создан{when}. После изменений в плане нажмите «Обновить» — ссылка останется той же.", {
                when: when ? ` (${t("обновлён {date}", { date: when })})` : "",
              })}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500" dir="ltr">
                {docUrl}
              </span>
              <button
                type="button"
                onClick={copy}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                aria-label={t("Скопировать ссылку")}
                title={t("Скопировать ссылку")}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                aria-label={t("Открыть документ")}
                title={t("Открыть документ")}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <ol className="mt-3 list-decimal space-y-1 ps-5 text-xs text-stone-500">
              <li>
                {t("В NotebookLM: «Добавить источник» → «Google Диск» → выберите этот документ (он лежит в общей папке поездок).")}
              </li>
              <li>
                {t("Позже, после «Обновить» здесь: в NotebookLM откройте источник и нажмите «Синхронизировать с Google Диском».")}
              </li>
            </ol>
          </>
        )}

        {error && <p className="mt-3 text-sm text-[#a8451f]">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={secondary}>
            {t("Закрыть")}
          </button>
          <button type="button" onClick={run} disabled={busy} className={primary}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : docId ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {docId ? t("Обновить") : t("Создать документ")}
          </button>
        </div>
      </div>
    </div>
  );
}
