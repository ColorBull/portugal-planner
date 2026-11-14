import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Trash2, FileText, FileType, File, Mic, Square, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TripPhoto } from "@/api/entities";
import {
  uploadToDrive,
  deleteFromDrive,
  driveImageUrl,
  driveViewUrl,
  hasDriveAccess,
  downloadDriveFile,
} from "@/api/drive";
import { isOnline } from "@/api/offline";
import { tripUploadFolder } from "@/api/tripFolders";
import { useTrips } from "@/lib/TripContext";
import { Image } from "@/components/ui/image";
import PhotoLightbox from "@/components/PhotoLightbox";
import { openExternal } from "@/lib/openExternal";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";

const LONG_PRESS_MS = 450;

const isDocument = (p) => p.kind === "document";
const isAudio = (p) => p.kind === "audio";

// Drive's download links refuse to play in an <audio> on another site. So: the
// bytes through the API where this account may read them (its own uploads), else
// Drive's own embeddable player (anyone with the link).
function AudioPlayer({ fileId }) {
  const [src, setSrc] = useState(null); // blob: URL, or "embed"
  const [loading, setLoading] = useState(false);
  useEffect(() => () => src?.startsWith("blob:") && URL.revokeObjectURL(src), [src]);
  const load = async () => {
    setLoading(true);
    try {
      setSrc(URL.createObjectURL(await downloadDriveFile(fileId)));
    } catch {
      setSrc("embed");
    } finally {
      setLoading(false);
    }
  };
  if (src === "embed")
    return (
      <iframe
        src={`https://drive.google.com/file/d/${fileId}/preview`}
        title={t("Голосовая запись")}
        allow="autoplay"
        className="h-24 min-w-0 flex-1 rounded-xl ring-1 ring-stone-200"
      />
    );
  if (src) return <audio controls autoPlay src={src} className="h-9 min-w-0 max-w-full flex-1" />;
  return (
    <button
      type="button"
      onClick={load}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200 transition hover:ring-stone-300 disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
      {t("Слушать")}
    </button>
  );
}

const audioExt = (type = "") => (type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm");

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const fileExt = (name = "") => {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
};

const docIconFor = (name) => {
  const ext = fileExt(name);
  if (ext === "pdf") return FileText;
  if (ext === "doc" || ext === "docx") return FileType;
  return File;
};

const openDocument = (record) => {
  openExternal(driveViewUrl(record.drive_file_id));
};

// The add-photo / add-document buttons live in the item's "⋯" menu (DayPlanModal);
// it reaches them through this ref: ref.current.pickPhoto() / .pickDocument() /
// .startRecording().
const PlanPhotoGrid = forwardRef(function PlanPhotoGrid(
  { itemId, dayKey, photos = [], onChanged },
  ref
) {
  const { ensureDriveAccess } = useAuth();
  const { trip } = useTrips();
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [tapAgain, setTapAgain] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [recSeconds, setRecSeconds] = useState(null); // null = not recording
  const recRef = useRef(null); // { recorder, stream, timer, cancelled }

  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const menuTriggeredRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const images = photos.filter((p) => !isDocument(p) && !isAudio(p));
  const audios = photos.filter(isAudio);
  const docs = photos.filter(isDocument);
  const activeRecord = photos.find((p) => p.id === menuFor);

  const clearPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Chrome on Android decides to select text about half a second into a press,
  // wherever the finger happens to be — by then that is this component's own
  // menu. Marking the menu unselectable is too late, so selection is switched
  // off document-wide for as long as the press and its menu last.
  const lockSelection = () => document.body.classList.add("no-long-press");
  const unlockSelection = () => document.body.classList.remove("no-long-press");

  useEffect(() => {
    if (!menuFor) unlockSelection();
  }, [menuFor]);

  useEffect(() => unlockSelection, []);

  // Leaving the day mid-recording drops it and releases the microphone.
  useEffect(() => () => stopRecording(true), []);

  const startPress = (e, record) => {
    const t = e.touches ? e.touches[0] : e;
    movedRef.current = false;
    menuTriggeredRef.current = false;
    startRef.current = { x: t.clientX, y: t.clientY };
    lockSelection();
    clearPress();
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        menuTriggeredRef.current = true;
        window.getSelection()?.removeAllRanges();
        const w = 168;
        const h = 52;
        const x = Math.min(
          Math.max(startRef.current.x - w / 2, 8),
          window.innerWidth - w - 8
        );
        const y = Math.min(
          Math.max(startRef.current.y - h / 2, 8),
          window.innerHeight - h - 8
        );
        setMenuPos({ x, y });
        setMenuFor(record.id);
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }, LONG_PRESS_MS);
  };

  const movePress = (e) => {
    const t = e.touches ? e.touches[0] : e;
    if (
      Math.abs(t.clientX - startRef.current.x) > 10 ||
      Math.abs(t.clientY - startRef.current.y) > 10
    ) {
      movedRef.current = true;
      clearPress();
      unlockSelection();
    }
  };

  // The browser took the touch over for scrolling: it was not a press.
  const cancelPress = () => {
    clearPress();
    if (!menuTriggeredRef.current) unlockSelection();
  };

  const endPress = (e, record, isImage) => {
    clearPress();
    if (!movedRef.current && !menuTriggeredRef.current) {
      if (isImage) setLightbox(record.drive_file_id);
      else openDocument(record);
    }
    if (!menuTriggeredRef.current) unlockSelection();
    if (e.preventDefault) e.preventDefault();
  };

  // Drive tokens last ~1h. Renew before the file picker opens, while the tap
  // still counts as a user gesture — afterwards mobile browsers block the
  // Google dialog and the upload dies with "authorization was cancelled".
  const pickFile = async (ref) => {
    if (!isOnline()) {
      alert(t("Нет подключения к интернету. Загрузить файл можно, когда появится сеть."));
      return;
    }
    if (!hasDriveAccess()) {
      const ok = await ensureDriveAccess();
      if (!ok) return;
      setTapAgain(true);
    }
    ref.current?.click();
  };

  const startRecording = async () => {
    if (recRef.current) return;
    if (!isOnline()) {
      alert(t("Нет подключения к интернету. Загрузить файл можно, когда появится сеть."));
      return;
    }
    if (!hasDriveAccess()) {
      const ok = await ensureDriveAccess();
      if (!ok) return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alert(t("Этот браузер не умеет записывать звук."));
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error(err);
      alert(t("Нет доступа к микрофону. Разрешите его в настройках браузера."));
      return;
    }
    setTapAgain(false);
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    const rec = { recorder, stream, cancelled: false };
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearInterval(rec.timer);
      recRef.current = null;
      setRecSeconds(null);
      if (rec.cancelled || !chunks.length) return;
      const type = recorder.mimeType || chunks[0].type || "audio/webm";
      const now = new Date();
      const stamp = `${now.getHours()}-${String(now.getMinutes()).padStart(2, "0")}`;
      const file = new window.File(chunks, `${t("Запись")} ${dayKey} ${stamp}.${audioExt(type)}`, { type });
      uploadFile(file, "audio");
    };
    const started = Date.now();
    rec.timer = setInterval(() => setRecSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    recRef.current = rec;
    setRecSeconds(0);
    recorder.start();
  };

  function stopRecording(cancel = false) {
    const rec = recRef.current;
    if (!rec) return;
    rec.cancelled = cancel;
    if (rec.recorder.state !== "inactive") rec.recorder.stop();
  }

  useImperativeHandle(ref, () => ({
    pickPhoto: () => pickFile(imgInputRef),
    pickDocument: () => pickFile(docInputRef),
    startRecording,
  }));

  const uploadFile = async (file, kind) => {
    setTapAgain(false);
    setUploading(true);
    try {
      // The trip's own folder in the shared one (api/tripFolders.js).
      const folderId = trip ? await tripUploadFolder(trip) : undefined;
      const fileId = await uploadToDrive(file, { folderId });
      await TripPhoto.create({
        day_key: dayKey,
        item_id: itemId,
        drive_file_id: fileId,
        drive_folder_id: folderId,
        kind,
        file_name: kind !== "photo" ? file.name : undefined,
      });
      onChanged();
    } catch (err) {
      console.error(err);
      alert(t("Не удалось загрузить файл. ") + (err?.message || ""));
    } finally {
      setUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDelete = async (record) => {
    setMenuFor(null);
    if (!confirm(t("Удалить этот файл?"))) return;
    try {
      await TripPhoto.delete(record.id);
      deleteFromDrive(record.drive_file_id);
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={docs.length || images.length || audios.length || uploading || tapAgain || recSeconds !== null ? "mt-3 ms-1" : ""}>
      {audios.length > 0 && (
        <div className="flex flex-col gap-2 mb-2.5">
          {audios.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 select-none">
              {/* Hold (right-click) the label to delete; tap opens it in Drive. */}
              <button
                type="button"
                onTouchStart={(e) => startPress(e, a)}
                onTouchMove={movePress}
                onTouchEnd={(e) => endPress(e, a, false)}
                onTouchCancel={cancelPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuFor(a.id);
                }}
                onClick={() => {
                  if (menuTriggeredRef.current) {
                    menuTriggeredRef.current = false;
                    return;
                  }
                  openDocument(a);
                }}
                className="no-long-press grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800 touch-pan-y"
                aria-label={a.file_name || t("Голосовая запись")}
                title={a.file_name || t("Голосовая запись")}
              >
                <Mic className="h-4 w-4" />
              </button>
              <AudioPlayer fileId={a.drive_file_id} />
              <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  className=" grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={t("Удалить")}
                  title={t("Удалить")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
            </div>
          ))}
        </div>
      )}

      {recSeconds !== null && (
        <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600 ring-1 ring-stone-200">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          {t("Запись")} {clock(recSeconds)}
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-white transition hover:bg-red-700"
          >
            <Square className="h-3 w-3 fill-current" /> {t("Стоп и сохранить")}
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="grid h-7 w-7 place-items-center rounded-full text-red-600 transition hover:bg-red-50"
            aria-label={t("Отмена")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {docs.map((d) => {
            const Icon = docIconFor(d.file_name);
            return (
              <div key={d.id} className="relative flex items-center select-none">
                <button
                  type="button"
                  onTouchStart={(e) => startPress(e, d)}
                  onTouchMove={movePress}
                  onTouchEnd={(e) => endPress(e, d, false)}
                  onTouchCancel={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(d.id);
                  }}
                  onClick={() => {
                    if (menuTriggeredRef.current) {
                      menuTriggeredRef.current = false;
                      return;
                    }
                    openDocument(d);
                  }}
                  className="no-long-press flex items-center gap-2 max-w-[230px] px-3 py-2 rounded-xl bg-white ring-1 ring-stone-200 hover:ring-stone-300 transition text-start touch-pan-y"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-700 truncate">
                      {d.file_name || t("Документ")}
                    </span>
                    <span className="block text-[11px] text-stone-400 uppercase tracking-wide">
                      {fileExt(d.file_name) || t("файл")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(d)}
                  className=" grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={t("Удалить")}
                  title={t("Удалить")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {images.map((p) => (
            <div key={p.id} className="relative aspect-square select-none">
              <div className="relative h-full w-full rounded-xl overflow-hidden ring-1 ring-stone-200">
                <button
                  type="button"
                  onTouchStart={(e) => startPress(e, p)}
                  onTouchMove={movePress}
                  onTouchEnd={(e) => endPress(e, p, true)}
                  onTouchCancel={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(p.id);
                  }}
                  onClick={() => {
                    if (menuTriggeredRef.current) {
                      menuTriggeredRef.current = false;
                      return;
                    }
                    setLightbox(p.drive_file_id);
                  }}
                  className="no-long-press block h-full w-full touch-pan-y"
                  aria-label={t("Просмотреть фото")}
                >
                  <Image
                    src={driveImageUrl(p.drive_file_id, 600)}
                    alt={p.caption || t("Место из плана")}
                    className="h-full w-full object-cover pointer-events-none select-none"
                    fittingType="fill"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  className="absolute end-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white transition hover:bg-red-600"
                  aria-label={t("Удалить")}
                  title={t("Удалить")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f, "photo");
        }}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f, "document");
        }}
        className="hidden"
      />

      {uploading && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-3.5 py-2 text-[13px] font-medium text-stone-500 sm:px-3 sm:py-1.5 sm:text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("Загрузка…")}
        </div>
      )}

      {tapAgain && !uploading && (
        <p className="mt-1.5 text-[11px] text-stone-500">
          {t("Google Drive подключён — откройте меню «⋯» и выберите действие ещё раз.")}
        </p>
      )}

      <AnimatePresence>
        {activeRecord && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuFor(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.14 }}
              style={{ position: "fixed", left: menuPos.x, top: menuPos.y, zIndex: 50 }}
              className="no-long-press w-40 rounded-xl bg-white shadow-2xl ring-1 ring-stone-200 overflow-hidden"
            >
              <button
                onClick={() => handleDelete(activeRecord)}
                className="no-long-press flex w-full items-center gap-2 px-3.5 py-3 text-sm text-red-600 hover:bg-red-50 transition text-start"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("Удалить")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* No enter/exit animation: fading a full-screen layer makes Chrome
          paint a black frame (see CLAUDE.md). */}
      {lightbox && (
        <PhotoLightbox
          src={driveImageUrl(lightbox, 1600)}
          previewSrc={driveImageUrl(lightbox, 600)}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
});

export default PlanPhotoGrid;
