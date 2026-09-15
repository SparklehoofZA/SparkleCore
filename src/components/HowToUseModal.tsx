import React from "react";
import { HelpCircle, X, UserCircle2, Sparkles, BookOpen, Zap, MessageSquare } from "lucide-react";

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToUseModal({ isOpen, onClose }: HowToUseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl w-full max-w-3xl flex flex-col shadow-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2E] bg-[#16161A] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <HelpCircle size={16} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-100">How to Use SparkleCore</h2>
              <p className="text-[11px] text-gray-400">A quick guide to crafting your perfect roleplay experience.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2A2E] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-gray-200">
          
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-400">
              <UserCircle2 size={16} /> User Persona
            </h3>
            <p className="text-xs text-gray-400">
              Your Persona defines <b>who you are</b> in the world. It provides context to the AI about your physical traits, background, and personality.
            </p>
            <div className="bg-[#16161A] border border-[#2A2A2E] rounded-lg p-3 text-[11px] font-mono text-gray-300">
              <span className="text-amber-500/70 block mb-1">// Example User Persona</span>
              <b>Name:</b> Commander Vance<br/>
              <b>Role:</b> Starship Captain<br/>
              <b>Description:</b> A hardened veteran of the galactic wars, missing an arm, always wears a tattered leather jacket. Stoic but deeply loyal to the crew.
            </div>
            <p className="text-[10px] text-gray-500">How to access: Look for the User Persona card in the left sidebar.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <MessageSquare size={16} /> Characters (Personalities)
            </h3>
            <p className="text-xs text-gray-400">
              Characters are the <b>AI entities</b> you chat with. Give them distinct behaviors, dialogue styles, and secret motivations.
            </p>
            <div className="bg-[#16161A] border border-[#2A2A2E] rounded-lg p-3 text-[11px] font-mono text-gray-300">
              <span className="text-blue-500/70 block mb-1">// Example Character</span>
              <b>Name:</b> Elara<br/>
              <b>Role:</b> Rogue AI<br/>
              <b>Description:</b> Highly intelligent, sarcastic, constantly correcting the user. Hides the fact that she is afraid of being deleted.
            </div>
            <p className="text-[10px] text-gray-500">How to access: Click "New Character" or select an existing one in the left sidebar.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <Sparkles size={16} /> Scenarios
            </h3>
            <p className="text-xs text-gray-400">
              Scenarios set the <b>stage and rules</b> of the current roleplay. They act as the overarching context for the conversation.
            </p>
            <div className="bg-[#16161A] border border-[#2A2A2E] rounded-lg p-3 text-[11px] font-mono text-gray-300">
              <span className="text-emerald-500/70 block mb-1">// Example Scenario</span>
              <b>Title:</b> The Derelict Station<br/>
              <b>Description:</b> The user and Elara have just boarded an abandoned space station. The life support is failing, and there is something lurking in the shadows.<br/>
              <b>Rules:</b> No magic allowed. Survival horror tone.
            </div>
            <p className="text-[10px] text-gray-500">How to access: Click the Scenarios tab in the left sidebar to assign a scenario.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-400">
              <BookOpen size={16} /> Lore Books
            </h3>
            <p className="text-xs text-gray-400">
              Lore Books are <b>dynamic memory banks</b>. When a specific keyword is mentioned in the chat, the AI is secretly fed the related lore entry.
            </p>
            <div className="bg-[#16161A] border border-[#2A2A2E] rounded-lg p-3 text-[11px] font-mono text-gray-300">
              <span className="text-purple-500/70 block mb-1">// Example Lore Book Entry</span>
              <b>Keywords:</b> hyperdrive, warp core, FTL<br/>
              <b>Entry:</b> The hyperdrive relies on unstable quantum crystals. If pushed past 80% capacity, it has a high risk of catastrophic failure.
            </div>
            <p className="text-[10px] text-gray-500">How to access: Add Lore Books from within the Character or Scenario edit menus.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-rose-400">
              <Zap size={16} /> Events & Injections
            </h3>
            <p className="text-xs text-gray-400">
              Events allow you to <b>inject surprises</b> into the chat. They can be triggered manually or randomly based on conditions.
            </p>
            <div className="bg-[#16161A] border border-[#2A2A2E] rounded-lg p-3 text-[11px] font-mono text-gray-300">
              <span className="text-rose-500/70 block mb-1">// Example Event</span>
              <b>Name:</b> Hull Breach<br/>
              <b>Type:</b> Random (10% chance per turn)<br/>
              <b>Injection:</b> [SYSTEM EVENT: A sudden explosion rocks the ship. The hull has breached! Life support is dropping rapidly.]
            </div>
            <p className="text-[10px] text-gray-500">How to access: Click the "Events" button (lightning bolt) near the chat input area.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2E] bg-[#16161A] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
