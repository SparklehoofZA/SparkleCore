import React, { useEffect, useRef } from "react";
import { Event } from "../types";
import { getTypeBadgeClass } from "./EventManagerModal";
import { Sparkles, Check, Settings, X, Plus, Zap } from "lucide-react";

interface EventSelectorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  activeEvent: Event | null;
  onSelectEvent: (event: Event) => void;
  onClearActiveEvent: () => void;
  onOpenManager: () => void;
  onQuickAutoGenerate?: () => void;
}

export const EventSelectorPopover: React.FC<EventSelectorPopoverProps> = ({
  isOpen,
  onClose,
  events,
  activeEvent,
  onSelectEvent,
  onClearActiveEvent,
  onOpenManager,
  onQuickAutoGenerate,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Capture slightly delayed to prevent triggering on the button's own click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      id="event-selection-popover"
      className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#141418] border border-[#2B2B32] rounded-xl shadow-2xl shadow-black/80 z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Popover Header */}
      <div className="px-3.5 py-2.5 bg-[#18181F] border-b border-[#26262E] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🎲</span>
          <span className="text-xs font-semibold text-gray-200">Select Event to Inject</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#22222B] text-gray-400 font-mono">
            {events.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onQuickAutoGenerate && (
            <button
              type="button"
              onClick={() => {
                onQuickAutoGenerate();
                onClose();
              }}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1 transition-colors"
              title="Quickly generate and prime a random event"
            >
              <Zap size={11} />
              <span>Surprise</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#25252E] transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Active Primed Event Notice if any */}
      {activeEvent && (
        <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={13} className="text-amber-400 shrink-0" />
            <span className="text-amber-200 truncate">
              Currently primed: <strong className="text-amber-100">{activeEvent.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearActiveEvent();
              onClose();
            }}
            className="text-[10px] px-2 py-0.5 rounded bg-[#202026] hover:bg-[#2A2A35] text-amber-300 hover:text-white border border-amber-500/30 transition-colors ml-2 shrink-0 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Events List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-[#1F1F26] p-1">
        {events.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 space-y-2">
            <p>No saved events available.</p>
            <button
              type="button"
              onClick={() => {
                onOpenManager();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={12} />
              <span>Create Event</span>
            </button>
          </div>
        ) : (
          events.map((event) => {
            const isSelected = activeEvent?.id === event.id;
            const badgeClass = getTypeBadgeClass(event.type);

            return (
              <button
                key={event.id}
                type="button"
                id={`event-popover-item-${event.id}`}
                onClick={() => {
                  onSelectEvent(event);
                  onClose();
                }}
                className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2.5 group ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-100"
                    : "hover:bg-[#1C1C22] text-gray-300 hover:text-white"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold truncate group-hover:text-amber-300 transition-colors">
                      {event.name}
                    </span>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full border shrink-0 ${badgeClass}`}
                    >
                      {event.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold">
                      <Check size={12} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#33333E] group-hover:border-amber-500/50 flex items-center justify-center text-gray-500 group-hover:text-amber-400 transition-colors text-[10px]">
                      +
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Popover Footer: Open Full Manager */}
      <div className="p-2 bg-[#16161C] border-t border-[#26262E] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onOpenManager();
            onClose();
          }}
          className="w-full py-1.5 px-2.5 rounded-lg bg-[#1E1E26] hover:bg-[#282834] text-gray-300 hover:text-amber-300 text-xs font-medium border border-[#2B2B38] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Settings size={13} />
          <span>Manage All Events & Templates</span>
        </button>
      </div>
    </div>
  );
};
