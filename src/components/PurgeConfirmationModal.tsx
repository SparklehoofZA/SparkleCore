import React from "react";
import { Trash2, AlertTriangle, Check, ShieldCheck, X } from "lucide-react";
import { Personality } from "../types";

interface PurgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  character: Personality | null;
  isPurging?: boolean;
}

export function PurgeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  character,
  isPurging = false,
}: PurgeConfirmationModalProps) {
  if (!isOpen) return null;

  const characterName = character?.name || "Active Character";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121216] border border-[#2E2E36] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24242C] flex items-center justify-between bg-[#15151A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Trash2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">Purge Chat & Memories</h2>
              <p className="text-[11px] text-gray-400">{characterName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPurging}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202028] transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-gray-300 leading-relaxed">
            Are you sure you want to purge the current chat and memory records for{" "}
            <span className="text-amber-400 font-semibold">{characterName}</span>?
          </p>

          {/* Items that will be purged */}
          <div className="p-3 bg-red-950/20 border border-red-900/35 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-red-300 font-semibold text-[11px] uppercase tracking-wider">
              <Trash2 size={13} className="text-red-400 shrink-0" />
              <span>Will Be Purged:</span>
            </div>
            <ul className="space-y-1.5 text-gray-300 text-[11px] pl-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span><strong className="text-gray-200">Active Chat:</strong> Clears current dialogue messages</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span><strong className="text-gray-200">Chat History:</strong> Deletes saved conversation log</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span><strong className="text-gray-200">Chat Memories:</strong> Resets MemPalace loci facts & entity links learned from this chat</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span><strong className="text-gray-200">Character Quests:</strong> Purges all Quest Book desires, tasks, and in-progress tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span><strong className="text-gray-200">Spoils & Items:</strong> Purges all Quest Book inventory items and keepsakes earned in this chat</span>
              </li>
            </ul>
          </div>

          {/* Items that are NOT deleted */}
          <div className="p-3 bg-emerald-950/15 border border-emerald-900/35 rounded-xl space-y-1.5 text-emerald-300/90 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300 text-[11px] uppercase tracking-wider">
              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <span>Preserved & Safe (Not Deleted):</span>
            </div>
            <ul className="space-y-1 text-gray-300 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-gray-200">Scenarios & Worlds:</strong> All custom scenarios remain intact</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-gray-200">User Persona:</strong> Your roleplay profile remains intact</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-gray-200">Character Definition:</strong> Core personality, prompt, and settings remain intact</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#22222A] bg-[#141418] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="px-4 py-2 rounded-lg bg-[#18181F] hover:bg-[#22222B] text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPurging}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Trash2 size={13} />
            <span>{isPurging ? "Purging..." : "Purge Chat & Memories"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
