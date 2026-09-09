import { useRef, useState } from "react";
import { Plus, Loader2, Trash2, FileText, FileType, File } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import PhotoLightbox from "@/components/PhotoLightbox";
import { openExternal } from "@/lib/openExternal";

const LONG_PRESS_MS = 450;

const isDocument = (p) => p.kind === "document";

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

const openDocument = (url) => {
  const viewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`;
  openExternal(viewer);
};

export default function PlanPhotoGrid({ itemId, dayKey, photos = [], onChanged }) {
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const menuTriggeredRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const images = photos.filter((p) => !isDocument(p));
  const docs = photos.filter(isDocument);
  const activeRecord = photos.find((p) => p.id === menuFor);

  const clearPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPress = (e, record) => {
    const t = e.touches ? e.touches[0] : e;
    movedRef.current = false;
    menuTriggeredRef.current = false;
    startRef.current = { x: t.clientX, y: t.clientY };
    clearPress();
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        menuTriggeredRef.current = true;
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
    }
  };

  const endPress = (e, record, isImage) => {
    clearPress();
    if (!movedRef.current && !menuTriggeredRef.current) {
      if (isImage) setLightbox(record.photo_url);
      else openDocument(record.photo_url);
    }
    if (e.preventDefault) e.preventDefault();
  };

  const uploadFile = async (file, kind) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TripPhoto.create({
        day_key: dayKey,
        item_id: itemId,
        photo_url: file_url,
        kind,
        file_name: kind === "document" ? file.name : undefined
      });
      onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    setMenuFor(null);
    try {
      await base44.entities.TripPhoto.delete(id);
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mt-3 ml-1">
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {docs.map((d) => {
            const Icon = docIconFor(d.file_name);
            return (
              <div key={d.id} className="relative select-none">
                <button
                  type="button"
                  onTouchStart={(e) => startPress(e, d)}
                  onTouchMove={movePress}
                  onTouchEnd={(e) => endPress(e, d, false)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(d.id);
                  }}
                  onClick={() => {
                    if (menuTriggeredRef.current) {
                      menuTriggeredRef.current = false;
                      return;
                    }
                    openDocument(d.photo_url);
                  }}
                  className="flex items-center gap-2 max-w-[230px] px-3 py-2 rounded-xl bg-white ring-1 ring-stone-200 hover:ring-stone-300 transition text-left touch-none"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-700 truncate">
                      {d.file_name || "Документ"}
                    </span>
                    <span className="block text-[11px] text-stone-400 uppercase tracking-wide">
                      {fileExt(d.file_name) || "файл"}
                    </span>
                  </span>
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(p.id);
                  }}
                  onClick={() => {
                    if (menuTriggeredRef.current) {
                      menuTriggeredRef.current = false;
                      return;
                    }
                    setLightbox(p.photo_url);
                  }}
                  className="block h-full w-full touch-none"
                  aria-label="Просмотреть фото"
                >
                  <Image
                    src={p.photo_url}
                    alt={p.caption || "Место из плана"}
                    className="h-full w-full object-cover pointer-events-none select-none"
                    fittingType="fill"
                  />
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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => imgInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {images.length > 0 ? "Ещё фото" : "Фото"}
        </button>
        <button
          onClick={() => docInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Загрузка…
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              {docs.length > 0 ? "Ещё документ" : "Документ"}
            </>
          )}
        </button>
      </div>

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
              className="w-40 rounded-xl bg-white shadow-2xl ring-1 ring-stone-200 overflow-hidden"
            >
              <button
                onClick={() => handleDelete(activeRecord.id)}
                className="flex w-full items-center gap-2 px-3.5 py-3 text-sm text-red-600 hover:bg-red-50 transition text-left"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Удалить
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}