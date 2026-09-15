import React, { useState, useRef } from "react";
import {
  X,
  Plus,
  Zap,
  Trash2,
  Sparkles,
  Check,
  RotateCcw,
  Calendar,
  AlertCircle,
  Play
} from "lucide-react";
import { Event, EventType } from "../types";
import { generateRandomEvent, DEFAULT_SAMPLE_EVENTS } from "../eventsEngine";
import { insertRoleplayMacro } from "../roleplayTemplate";

interface EventManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  onSaveEvent: (newEvent: Omit<Event, "id" | "created_at">) => void;
  onDeleteEvent: (id: string) => void;
  onAutoGenerateEvent: (guideline?: string) => Promise<any> | void;
  onSelectActiveEvent?: (event: Event) => void;
  activeEventId?: string;
  onRestoreDefaults?: () => void;
}

const EVENT_TYPE_OPTIONS: { label: string; value: EventType; colorClass: string }[] = [
  {
    label: "Environmental",
    value: "Environmental",
    colorClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    label: "Character Action",
    value: "Character Action",
    colorClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  {
    label: "System Interrupt",
    value: "System Interrupt",
    colorClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  {
    label: "Custom",
    value: "Custom",
    colorClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
];

export function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "Environmental":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Character Action":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "System Interrupt":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "Custom":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    default:
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  }
}

export const EventManagerModal: React.FC<EventManagerModalProps> = ({
  isOpen,
  onClose,
  events,
  onSaveEvent,
  onDeleteEvent,
  onAutoGenerateEvent,
  onSelectActiveEvent,
  activeEventId,
  onRestoreDefaults,
}) => {
  // Manual Creator state
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("Environmental");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All");

  // Auto-Generate guideline state
  const [guideline, setGuideline] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleAutoGenerate = async (explicitGuideline?: string) => {
    setIsGenerating(true);
    setValidationError(null);
    const targetGuideline = typeof explicitGuideline === "string" ? explicitGuideline : guideline;
    try {
      const generated = await onAutoGenerateEvent(targetGuideline);
      if (generated && generated.name) {
        setShowSuccessToast(`Auto-generated event "${generated.name}" created!`);
        setName(generated.name);
        setType(generated.type || "Environmental");
        setDescription(generated.description || "");
      } else {
        setShowSuccessToast(`New event generated and added to your list!`);
      }
      setGuideline("");
      setTimeout(() => setShowSuccessToast(null), 3000);
    } catch (err: any) {
      setValidationError(err?.message || "Failed to auto-generate event");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("Event name is required");
      return;
    }
    if (!description.trim()) {
      setValidationError("Event description (prompt instruction) is required");
      return;
    }

    setValidationError(null);
    onSaveEvent({
      name: name.trim(),
      type,
      description: description.trim(),
    });

    setName("");
    setDescription("");
    setType("Environmental");

    setShowSuccessToast(`Event "${name.trim()}" created successfully!`);
    setTimeout(() => setShowSuccessToast(null), 2500);
  };

  const filteredEvents =
    filterType === "All"
      ? events
      : events.filter((ev) => ev.type.toLowerCase() === filterType.toLowerCase());

  return (
    <div
      id="event-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#111114] border border-[#2A2A2E] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242428] flex items-center justify-between bg-[#141418] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shadow-sm">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-100">Event Manager</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1C1C24] text-amber-300/90 border border-[#2E2E38] font-mono">
                  {events.length} {events.length === 1 ? "Event" : "Events"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Create and manage scene triggers, environmental changes, and narrative interruptions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202026] transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Auto-Generate Guideline Box */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#16161B] border border-amber-500/35 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <h4 className="text-xs font-semibold text-gray-200">Auto-Generate Event</h4>
            </div>
            <span className="text-[10px] text-amber-300/80 font-mono">Optional Guideline</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="event-guideline-input"
              type="text"
              value={guideline}
              onChange={(e) => setGuideline(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAutoGenerate();
                }
              }}
              placeholder="Provide a guideline for the event (e.g., sudden power outage, mysterious visitor, thunderstorm, confession)..."
              className="flex-1 bg-[#101014] border border-[#2B2B33] focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
            />
            <button
              id="auto-generate-event-guideline-btn"
              type="button"
              onClick={() => handleAutoGenerate()}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-xs shadow-md shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              title="Generate event based on guideline"
            >
              <Zap size={14} className={isGenerating ? "animate-spin text-white" : "fill-current text-white"} />
              <span>{isGenerating ? "Generating..." : "⚡ Auto-Generate Event"}</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="mx-6 mt-3 px-3.5 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>{showSuccessToast}</span>
          </div>
        )}

        {/* Body content: split grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Manual Event Creator Panel (STEP 2.1 REMOVED) */}
            <div className="lg:col-span-5 bg-[#16161B] border border-[#26262C] rounded-xl p-4 sm:p-5 flex flex-col space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[#26262C] pb-2.5">
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Manual Event Creator</h3>
                </div>
              </div>

              {validationError && (
                <div className="px-3 py-2 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3.5 flex-1 flex flex-col">
                {/* Event Name */}
                <div>
                  <label
                    htmlFor="event-name-input"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    Event Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="event-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Sudden Power Outage, Cryptic Message"
                    className="w-full bg-[#111114] border border-[#2B2B33] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label
                    htmlFor="event-type-select"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    Event Type
                  </label>
                  <select
                    id="event-type-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full bg-[#111114] border border-[#2B2B33] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60 transition-colors cursor-pointer"
                  >
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#16161B] text-gray-200">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Description (Textarea) */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="event-desc-textarea"
                      className="block text-xs font-semibold text-gray-300"
                    >
                      Event Description (AI Narrative Instructions){" "}
                      <span className="text-amber-400">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500 font-medium">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{char}}', description, setDescription, descTextareaRef.current)}
                        className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{char}}\""}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{user}}', description, setDescription, descTextareaRef.current)}
                        className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{user}}\""}
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={descTextareaRef}
                    id="event-desc-textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='Describe what happens in the scene and instruct how {{char}} should react (e.g. "A sudden thunderstorm erupts; {{char}} looks startled while {{user}} takes shelter...")'
                    className="w-full flex-1 bg-[#111114] border border-[#2B2B33] rounded-lg p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/60 transition-colors resize-y min-h-[90px]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Use <code className="text-amber-400 font-mono">{"{{char}}"}</code> and <code className="text-cyan-400 font-mono">{"{{user}}"}</code> macros for dynamic actor resolution. Injected as{" "}
                    <code className="text-amber-400 font-mono">[SYSTEM EVENT INJECTION: ...]</code>.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    id="save-event-btn"
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30"
                  >
                    <Plus size={14} />
                    <span>Save Event</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setName("");
                      setDescription("");
                      setType("Environmental");
                      setValidationError(null);
                    }}
                    className="py-2 px-3 rounded-lg bg-[#1F1F26] hover:bg-[#282832] text-gray-400 hover:text-gray-200 text-xs transition-colors"
                    title="Clear form"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* 2.3 Event List View */}
            <div className="lg:col-span-7 flex flex-col space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242428] pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-200">Saved Events</h3>
                  <span className="text-xs text-gray-500">({filteredEvents.length})</span>
                </div>

                {/* Type Filter Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  {["All", "Environmental", "Character Action", "System Interrupt", "Custom"].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterType(cat)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          filterType === cat
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-[#16161B] text-gray-400 hover:text-gray-200 border border-[#2A2A30]"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Event Cards Container */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center bg-[#15151A] rounded-xl border border-dashed border-[#2B2B35] space-y-3">
                    <p className="text-sm text-gray-400">No events found matching this filter.</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAutoGenerate()}
                        disabled={isGenerating}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow disabled:opacity-50"
                      >
                        <Zap size={13} className={isGenerating ? "animate-spin" : ""} />
                        <span>{isGenerating ? "Generating..." : "Generate Random Event"}</span>
                      </button>
                      {onRestoreDefaults && (
                        <button
                          type="button"
                          onClick={onRestoreDefaults}
                          className="px-3 py-1.5 rounded-lg bg-[#202028] hover:bg-[#2A2A35] text-gray-300 text-xs font-medium flex items-center gap-1.5"
                        >
                          <RotateCcw size={13} />
                          <span>Restore Defaults</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredEvents.map((ev) => {
                    const isSelected = activeEventId === ev.id;
                    const badgeClass = getTypeBadgeClass(ev.type);

                    return (
                      <div
                        key={ev.id}
                        id={`event-card-${ev.id}`}
                        className={`p-4 rounded-xl bg-[#16161B] border transition-all space-y-2 group shadow-sm ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-950/10 ring-1 ring-amber-500/40"
                            : "border-[#25252C] hover:border-[#35353E]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-semibold text-gray-100 break-words">
                                {ev.name}
                              </h4>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}
                              >
                                {ev.type}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Check size={10} /> Active for Next Message
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {ev.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onSelectActiveEvent && (
                              <button
                                type="button"
                                onClick={() => onSelectActiveEvent(ev)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-amber-500 text-black font-bold"
                                    : "bg-[#202028] hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-[#2B2B36]"
                                }`}
                                title={
                                  isSelected
                                    ? "This event is primed for the next message"
                                    : "Select and prime this event for the next message"
                                }
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={12} /> Primed
                                  </>
                                ) : (
                                  <>
                                    <Play size={11} className="fill-current" /> Prime Event
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              id={`delete-event-btn-${ev.id}`}
                              onClick={() => onDeleteEvent(ev.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Event"
                              aria-label={`Delete event ${ev.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {ev.created_at && (
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 pt-1 border-t border-[#202026]">
                            <Calendar size={10} />
                            <span>
                              Created: {new Date(ev.created_at).toLocaleDateString()}{" "}
                              {new Date(ev.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Restore Defaults button if needed */}
              {onRestoreDefaults && (
                <div className="pt-2 flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Auto-generated events persist locally across sessions in your browser.
                  </span>
                  <button
                    type="button"
                    onClick={onRestoreDefaults}
                    className="text-[11px] text-gray-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    <span>Restore Sample Events</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#242428] bg-[#141418] flex items-center justify-between shrink-0 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono text-[11px]">System Injections</span>
            <span>Events trigger spontaneous narrative turns without breaking character immersion.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#282830] text-gray-200 hover:text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
