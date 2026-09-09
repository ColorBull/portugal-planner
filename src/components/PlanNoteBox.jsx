import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Link2, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { openExternal } from "@/lib/openExternal";

const normalizeLink = (l) => {
  if (!l) return "";
  return /^https?:\/\//i.test(l) ? l : `https://${l}`;
};

export default function PlanNoteBox({ itemId, dayKey }) {
  const [note, setNote] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: "", link: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const records = await base44.entities.TripNote.filter({
        day_key: dayKey,
        item_id: itemId
      });
      setNote(records[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, [dayKey, itemId]);

  const startAdd = () => {
    setDraft({ text: "", link: "" });
    setEditing(true);
  };

  const startEdit = () => {
    setDraft({ text: note?.text || "", link: note?.link || "" });
    setEditing(true);
  };

  const save = async () => {
    const text = draft.text.trim();
    const link = draft.link.trim();
    if (!text && !link) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (note) {
        await base44.entities.TripNote.update(note.id, { text, link });
      } else {
        await base44.entities.TripNote.create({
          day_key: dayKey,
          item_id: itemId,
          text,
          link
        });
      }
      setEditing(false);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note) return;
    try {
      await base44.entities.TripNote.delete(note.id);
      setNote(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (editing) {
    return (
      <div className="mt-3 ml-1 rounded-2xl bg-white/70 ring-1 ring-stone-200 p-3">
        <textarea
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="Свободный текст…"
          rows={2}
          className="w-full resize-none rounded-lg bg-white ring-1 ring-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-stone-400"
        />
        <div className="mt-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            value={draft.link}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="Ссылка (https://…)"
            className="flex-1 rounded-lg bg-white ring-1 ring-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-stone-400"
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full text-stone-500 hover:text-stone-700 transition"
          >
            <X className="h-3.5 w-3.5" /> Отмена
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-stone-800 text-white hover:bg-stone-700 transition disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Сохранить
          </button>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="mt-3 ml-1">
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Заметка / ссылка
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 ml-1 rounded-2xl bg-white/70 ring-1 ring-stone-200 p-3">
      {note.text && (
        <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
          {note.text}
        </p>
      )}
      {note.link && (
        <a
          href={normalizeLink(note.link)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            openExternal(normalizeLink(note.link));
          }}
          className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 break-all"
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <span className="underline decoration-dotted underline-offset-2">
            {note.link}
          </span>
        </a>
      )}
      <div className="mt-2 flex gap-1.5">
        <button
          onClick={startEdit}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition"
        >
          <Pencil className="h-3.5 w-3.5" /> Изменить
        </button>
        <button
          onClick={remove}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-red-500 hover:bg-red-50 transition"
        >
          <Trash2 className="h-3.5 w-3.5" /> Удалить
        </button>
      </div>
    </div>
  );
}