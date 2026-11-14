import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import Sheet, { SheetButton, SheetGroup } from "@/components/Sheet";
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
    <Sheet
      onClose={onClose}
      busy={busy}
      title={t("Выгрузка для NotebookLM")}
      subtitle={
        !docId
          ? t("Весь план поездки — дни, цены, заметки и ссылки на документы — будет сохранён одним Google-документом в общей папке Drive.")
          : t("Документ уже создан{when}. После изменений в плане нажмите «Обновить» — ссылка останется той же.", {
              when: when ? ` (${t("обновлён {date}", { date: when })})` : "",
            })
      }
      footer={
        <SheetButton type="button" onClick={run} busy={busy}>
          {docId ? t("Обновить") : t("Создать документ")}
        </SheetButton>
      }
    >
      {docId && (
        <>
          <SheetGroup>
            <div className="flex min-h-[48px] items-center gap-1 ps-4 pe-2">
              <span className="min-w-0 flex-1 truncate text-[15px] text-stone-500" dir="ltr">
                {docUrl}
              </span>
              <button
                type="button"
                onClick={copy}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#2c5f8a] transition hover:bg-black/5"
                aria-label={t("Скопировать ссылку")}
                title={t("Скопировать ссылку")}
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#2c5f8a] transition hover:bg-black/5"
                aria-label={t("Открыть документ")}
                title={t("Открыть документ")}
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </SheetGroup>
          <ol className="list-decimal space-y-1 ps-9 pe-4 text-[13px] leading-snug text-stone-500">
            <li>
              {t("В NotebookLM: «Добавить источник» → «Google Диск» → выберите этот документ (он лежит в общей папке поездок).")}
            </li>
            <li>
              {t("Позже, после «Обновить» здесь: в NotebookLM откройте источник и нажмите «Синхронизировать с Google Диском».")}
            </li>
          </ol>
        </>
      )}

      {error && <p className="mt-3 px-4 text-[15px] text-[#a8451f]">{error}</p>}
    </Sheet>
  );
}
