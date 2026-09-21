import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { ICON_OPTIONS, iconFor, styleFor } from "@/data/planStyles";
import AddressInput from "@/components/AddressInput";
import { uid } from "@/api/trips";

const input =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 " +
  "outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20";

const hint = "block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1";

export const emptySection = () => ({
  id: uid("sec"),
  title: "",
  icon: "MapPin",
  mapUrl: "",
  items: [emptyItem()],
});

export const emptyItem = () => ({ id: uid("item"), text: "", address: "", mapUrl: "" });

const move = (list, from, to) => {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export default function DayPlanEditor({ value, onChange }) {
  const sections = value.sections || [];

  const setSections = (next) => onChange({ ...value, sections: next });

  const patchSection = (index, patch) =>
    setSections(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const patchItem = (sIndex, iIndex, patch) =>
    patchSection(sIndex, {
      items: sections[sIndex].items.map((it, i) =>
        i === iIndex ? { ...it, ...patch } : it
      ),
    });

  const removeSection = (index) => setSections(sections.filter((_, i) => i !== index));

  const removeItem = (sIndex, iIndex) =>
    patchSection(sIndex, {
      items: sections[sIndex].items.filter((_, i) => i !== iIndex),
    });

  const addItem = (sIndex) =>
    patchSection(sIndex, { items: [...(sections[sIndex].items || []), emptyItem()] });

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "section") {
      if (source.index === destination.index) return;
      return setSections(move(sections, source.index, destination.index));
    }

    // type === "item": droppableId is the owning section's id.
    const from = sections.findIndex((s) => s.id === source.droppableId);
    const to = sections.findIndex((s) => s.id === destination.droppableId);
    if (from < 0 || to < 0) return;

    if (from === to) {
      if (source.index === destination.index) return;
      return patchSection(from, {
        items: move(sections[from].items, source.index, destination.index),
      });
    }

    const fromItems = [...sections[from].items];
    const [moved] = fromItems.splice(source.index, 1);
    const toItems = [...sections[to].items];
    toItems.splice(destination.index, 0, moved);
    setSections(
      sections.map((s, i) => {
        if (i === from) return { ...s, items: fromItems };
        if (i === to) return { ...s, items: toItems };
        return s;
      })
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={hint} htmlFor="day-city">Город этого дня</label>
        <input
          id="day-city"
          className={input}
          value={value.city || ""}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          placeholder="Например, Порту"
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(dropSections) => (
            <div
              ref={dropSections.innerRef}
              {...dropSections.droppableProps}
              className="space-y-4"
            >
              {sections.map((section, sIndex) => {
                const Icon = iconFor(section.icon);
                const style = styleFor(section.icon);
                return (
                  <Draggable key={section.id} draggableId={section.id} index={sIndex}>
                    {(dragSection, snapshot) => (
                      <div
                        ref={dragSection.innerRef}
                        {...dragSection.draggableProps}
                        className={`rounded-2xl border bg-white p-4 ${
                          snapshot.isDragging ? "shadow-xl" : "shadow-sm"
                        }`}
                        style={{ borderColor: "#ece3d4", ...dragSection.draggableProps.style }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            {...dragSection.dragHandleProps}
                            className="grid h-9 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-stone-400 hover:bg-stone-100 active:cursor-grabbing"
                            aria-label="Переместить блок"
                          >
                            <GripVertical className="h-5 w-5" />
                          </span>

                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                            style={{ backgroundColor: style.bg, color: style.fg }}
                          >
                            <Icon className="h-5 w-5" />
                          </span>

                          <input
                            className={input}
                            value={section.title}
                            onChange={(e) => patchSection(sIndex, { title: e.target.value })}
                            placeholder="Название блока — например, «Утро»"
                          />

                          <button
                            type="button"
                            onClick={() => removeSection(sIndex)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-[#f7e9e3] hover:text-[#a8451f]"
                            aria-label="Удалить блок"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 sm:max-w-[50%]">
                          <div>
                            <label className={hint}>Иконка</label>
                            <select
                              className={input}
                              value={section.icon}
                              onChange={(e) => patchSection(sIndex, { icon: e.target.value })}
                            >
                              {ICON_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <Droppable droppableId={section.id} type="item">
                          {(dropItems) => (
                            <div
                              ref={dropItems.innerRef}
                              {...dropItems.droppableProps}
                              className="mt-3 space-y-2"
                            >
                              {(section.items || []).map((item, iIndex) => (
                                <Draggable key={item.id} draggableId={item.id} index={iIndex}>
                                  {(dragItem, itemSnapshot) => (
                                    <div
                                      ref={dragItem.innerRef}
                                      {...dragItem.draggableProps}
                                      className={`rounded-xl p-2.5 ${
                                        itemSnapshot.isDragging ? "shadow-lg" : ""
                                      }`}
                                      style={{
                                        backgroundColor: "#faf6ef",
                                        ...dragItem.draggableProps.style,
                                      }}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span
                                          {...dragItem.dragHandleProps}
                                          className="mt-1 grid h-8 w-6 shrink-0 cursor-grab place-items-center rounded-lg text-stone-400 hover:bg-stone-200/60 active:cursor-grabbing"
                                          aria-label="Переместить пункт"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </span>

                                        <div className="min-w-0 flex-1 space-y-2">
                                          <textarea
                                            rows={2}
                                            className={input}
                                            value={item.text}
                                            onChange={(e) =>
                                              patchItem(sIndex, iIndex, { text: e.target.value })
                                            }
                                            placeholder="Что делаем"
                                          />
                                          <AddressInput
                                            className={input}
                                            value={item.address || ""}
                                            onChange={(patch) =>
                                              patchItem(sIndex, iIndex, patch)
                                            }
                                            placeholder="Адрес (необязательно)"
                                          />
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => removeItem(sIndex, iIndex)}
                                          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-[#f7e9e3] hover:text-[#a8451f]"
                                          aria-label="Удалить пункт"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {dropItems.placeholder}
                            </div>
                          )}
                        </Droppable>

                        <button
                          type="button"
                          onClick={() => addItem(sIndex)}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                        >
                          <Plus className="h-4 w-4" />
                          Добавить пункт
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {dropSections.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        type="button"
        onClick={() => setSections([...sections, emptySection()])}
        className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-3 text-stone-500 transition hover:border-[#1d3b5c] hover:text-[#1d3b5c] inline-flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="h-5 w-5" />
        Добавить блок
      </button>
    </div>
  );
}
