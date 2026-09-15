import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Personality, CharacterState } from '../types';
import {
  Heart,
  Battery,
  AlertCircle,
  MapPin,
  Activity,
  Shirt,
  Users,
  Smile,
  Sparkles,
  Flame,
  Zap,
  RefreshCw,
  Edit3,
  X,
  Check,
  Plus,
  ShieldAlert,
  Sliders,
  Compass,
  Eye,
  Search,
  Maximize2
} from 'lucide-react';
import { ImageLightboxModal } from './ImageLightboxModal';
import { ensureCharacterState } from '../characterStateEngine';
import {
  MOOD_CATEGORIES,
  COMMON_MOOD_PRESETS,
  ALL_MOOD_PRESETS,
  getMoodStyling,
} from '../moodPresets';

interface Props {
  personality: Personality | null;
  onUpdatePersonality?: (updated: Personality) => void;
  onViewAvatar?: (url: string, title?: string, subtitle?: string) => void;
  userPersonaName?: string;
  selectedModel?: string;
  customApiKey?: string;
}

export const CharacterStateDisplay: React.FC<Props> = ({
  personality,
  onUpdatePersonality,
  onViewAvatar,
  userPersonaName = "User",
  selectedModel,
  customApiKey,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInternalLightboxOpen, setIsInternalLightboxOpen] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [overallBondScore, setOverallBondScore] = useState<number>(0);
  const [selectedMoodCategory, setSelectedMoodCategory] = useState<string>('all');
  const [moodSearchTerm, setMoodSearchTerm] = useState<string>('');
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const rawState = personality ? ensureCharacterState(personality) : null;

  // Local state for the tuner modal
  const [editState, setEditState] = useState<CharacterState>(
    rawState || {
      health: 100,
      stamina: 100,
      statusEffects: [],
      trust: 50,
      mood: 'Neutral',
      stress: 0,
      location: 'Unknown',
      activity: 'Idle',
      outfit: 'Casual attire',
    }
  );
  const [newEffectInput, setNewEffectInput] = useState('');

  // Fetch relationship metrics when personality changes or modal opens
  useEffect(() => {
    if (personality?.id) {
      fetch(`/api/mempalace/${personality.id}/relationship-metrics`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.metrics?.overallBondScore !== undefined) {
            setOverallBondScore(data.metrics.overallBondScore);
          }
        })
        .catch(() => {});
    }
  }, [personality?.id, isModalOpen]);

  // Sync editState when personality changes
  useEffect(() => {
    if (personality) {
      setEditState(ensureCharacterState(personality));
    }
  }, [personality?.id, personality?.state]);

  // Ensure modal body is scrolled to the very top when opened and handle Escape key
  useEffect(() => {
    if (isModalOpen) {
      const resetScroll = () => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = 0;
        }
      };
      resetScroll();
      const raf = requestAnimationFrame(resetScroll);
      const timer = setTimeout(resetScroll, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isModalOpen]);

  if (!personality) return null;

  const state = rawState || editState;

  const moodStyle = getMoodStyling(state.mood, state.stress);
  const MoodIcon = moodStyle.icon;

  const handleOpenModal = () => {
    setEditState(ensureCharacterState(personality));
    setFeedbackMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveState = async () => {
    if (!personality) return;
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/personalities/${personality.id}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: editState }),
      });
      if (!res.ok) throw new Error('Failed to update character state');
      const data = await res.json();
      if (data.personality && onUpdatePersonality) {
        onUpdatePersonality(data.personality);
      }
      setFeedbackMsg({ type: 'success', text: 'Dynamic status saved & active in scene!' });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 700);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Error saving state' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReevaluate = async () => {
    if (!personality) return;
    setIsReevaluating(true);
    setFeedbackMsg(null);
    try {
      const activeModel = selectedModel || localStorage.getItem("ACTIVE_INFERENCE_MODEL") || localStorage.getItem("selected_model") || "";
      const activeKey = customApiKey || localStorage.getItem("USER_GEMINI_API_KEY") || "";
      const res = await fetch(`/api/personalities/${personality.id}/infer-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeKey ? { 'x-gemini-api-key': activeKey } : {}),
        },
        body: JSON.stringify({
          model: activeModel,
          customApiKey: activeKey,
        }),
      });
      if (!res.ok) throw new Error('Failed to re-evaluate state from chat');
      const data = await res.json();
      if (data.state) {
        setEditState(data.state);
      }
      if (data.personality && onUpdatePersonality) {
        onUpdatePersonality(data.personality);
      }
      const shiftCount = Array.isArray(data.shifts) ? data.shifts.length : 0;
      setFeedbackMsg({
        type: 'info',
        text: shiftCount > 0
          ? `Updated from chat! (${shiftCount} shift${shiftCount > 1 ? 's' : ''} detected)`
          : 'Status verified against latest conversation context.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Re-evaluation failed' });
    } finally {
      setIsReevaluating(false);
    }
  };

  const handleAddEffect = (effect: string) => {
    const trimmed = effect.trim();
    if (!trimmed) return;
    if (!editState.statusEffects.includes(trimmed)) {
      setEditState((prev) => ({
        ...prev,
        statusEffects: [...prev.statusEffects, trimmed],
      }));
    }
    setNewEffectInput('');
  };

  const handleRemoveEffect = (effect: string) => {
    setEditState((prev) => ({
      ...prev,
      statusEffects: prev.statusEffects.filter((e) => e !== effect),
    }));
  };

  const commonEffectsPresets = [
    'Excited',
    'Scared',
    'Terrified',
    'Trembling',
    'Adrenaline Spike',
    'Blushing',
    'Flustered',
    'Caffeinated',
    'Exhausted',
    'Injured',
    'Resting',
    'Alert',
  ];

  const displayedMoods = React.useMemo(() => {
    let list: string[] = [];
    if (selectedMoodCategory === 'all') {
      list = ALL_MOOD_PRESETS;
    } else if (selectedMoodCategory === 'featured') {
      list = COMMON_MOOD_PRESETS;
    } else {
      const cat = MOOD_CATEGORIES.find((c) => c.id === selectedMoodCategory);
      list = cat ? cat.moods : COMMON_MOOD_PRESETS;
    }

    if (moodSearchTerm.trim()) {
      const query = moodSearchTerm.toLowerCase().trim();
      return ALL_MOOD_PRESETS.filter((m) => m.toLowerCase().includes(query));
    }
    return list;
  }, [selectedMoodCategory, moodSearchTerm]);

  const handleSelectMood = (m: string) => {
    const low = m.toLowerCase();
    const isPeril = ['scared', 'terrified', 'panicked', 'trembling'].some((k) => low.includes(k));
    const isConflict = ['angry', 'furious', 'enraged', 'frustrated'].some((k) => low.includes(k));
    const isCalm = ['calm', 'peaceful', 'serene', 'content', 'relaxed'].some((k) => low.includes(k));
    const isJoy = ['excited', 'thrilled', 'ecstatic', 'elated', 'joyful'].some((k) => low.includes(k));
    const isSad = ['melancholy', 'somber', 'heartbroken', 'sorrowful'].some((k) => low.includes(k));

    setEditState((prev) => ({
      ...prev,
      mood: m,
      stress: isPeril
        ? Math.max(75, prev.stress)
        : isConflict
        ? Math.max(60, prev.stress)
        : isSad
        ? Math.max(40, prev.stress)
        : isCalm
        ? Math.min(15, prev.stress)
        : isJoy
        ? Math.min(20, prev.stress)
        : prev.stress,
    }));
  };

  return (
    <>
      {/* Dynamic Status Strip - Grouped for side card reading & fully contained */}
      <div className="flex flex-col gap-2.5 w-full max-w-full overflow-hidden select-none box-border">
        {/* Top of Vitals: 2 blocks by 2 blocks (Health & Energy on top; Stress under Health, Trust under Energy) */}
        <div
          onClick={handleOpenModal}
          className="w-full max-w-full grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#141418] border border-[#24242D] hover:border-amber-500/40 cursor-pointer transition-colors shadow-xs group box-border"
          title="Health, Energy, Stress & Trust — Click to tune vitals"
        >
          {/* Row 1, Col 1: Health */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 min-w-0 max-w-full text-center">
            <Heart size={18} className="text-rose-400 shrink-0 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300/90 leading-tight">Health</span>
            <span className="text-xs font-mono font-bold text-rose-200 mt-0.5">{state.health}%</span>
            <div className="w-full bg-[#1C1C24] rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, state.health))}%` }} />
            </div>
          </div>

          {/* Row 1, Col 2: Energy */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 min-w-0 max-w-full text-center">
            <Battery size={18} className="text-emerald-400 shrink-0 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300/90 leading-tight">Energy</span>
            <span className="text-xs font-mono font-bold text-emerald-200 mt-0.5">{state.stamina}%</span>
            <div className="w-full bg-[#1C1C24] rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, state.stamina))}%` }} />
            </div>
          </div>

          {/* Row 2, Col 1: Stress (under Health) */}
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${state.stress >= 70 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/25'} border min-w-0 max-w-full text-center`}>
            <AlertCircle size={18} className={`${state.stress >= 70 ? 'text-rose-400' : 'text-amber-400'} shrink-0 mb-1 group-hover:scale-110 transition-transform`} />
            <span className={`text-[10px] uppercase font-bold tracking-wider ${state.stress >= 70 ? 'text-rose-300/90' : 'text-amber-300/90'} leading-tight`}>Stress</span>
            <span className={`text-xs font-mono font-bold ${state.stress >= 70 ? 'text-rose-200' : 'text-amber-200'} mt-0.5`}>{state.stress}%</span>
            <div className="w-full bg-[#1C1C24] rounded-full h-1 mt-1.5 overflow-hidden">
              <div className={`${state.stress >= 70 ? 'bg-rose-500' : 'bg-amber-500'} h-full rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, state.stress))}%` }} />
            </div>
          </div>

          {/* Row 2, Col 2: Trust (under Energy) */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/25 min-w-0 max-w-full text-center">
            <Users size={18} className="text-purple-400 shrink-0 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300/90 leading-tight">Trust</span>
            <span className="text-xs font-mono font-bold text-purple-200 mt-0.5">{state.trust}%</span>
            <div className="w-full bg-[#1C1C24] rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, state.trust))}%` }} />
            </div>
          </div>
        </div>

        {/* Mood & Composure Card - Full text, no shortening */}
        <div
          onClick={handleOpenModal}
          className="w-full max-w-full flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#141418] border border-[#24242D] hover:border-amber-500/40 cursor-pointer transition-colors group shadow-xs box-border overflow-hidden"
          title="Mood & Composure — Click to tune"
        >
          <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            <span className="flex items-center gap-1 min-w-0">
              <Activity size={12} className="text-amber-400 shrink-0" />
              <span>Mood & Composure:</span>
            </span>
            {state.stress > 0 && (
              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold shrink-0 ${
                state.stress >= 70 ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {state.stress}% Stress
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-lg border font-medium ${moodStyle.bg} min-w-0 max-w-full overflow-hidden`}
            title={`Current Mood: ${state.mood}${state.stress > 0 ? ` (${state.stress}% stress)` : ''}`}
          >
            <MoodIcon size={14} className={`${moodStyle.iconColor} ${moodStyle.pulse ? 'animate-pulse' : ''} shrink-0`} />
            <span className="text-xs font-semibold break-words whitespace-normal leading-snug">{state.mood}</span>
          </div>
        </div>

        {/* Scene & Context Card - Full text for Location, Activity, Outfit without shortening */}
        <div
          onClick={handleOpenModal}
          className="w-full max-w-full flex flex-col gap-2 p-2.5 rounded-xl bg-[#141418] border border-[#24242D] hover:border-amber-500/40 cursor-pointer transition-colors group shadow-xs box-border overflow-hidden"
          title="Scene & Context — Click to tune setting"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            <Compass size={12} className="text-emerald-400 shrink-0" />
            <span>Scene & Setting:</span>
          </div>

          {/* Location - Full text, never shortened */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 min-w-0 max-w-full box-border" title="Scene Location">
            <MapPin size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block text-[9px] uppercase font-mono tracking-wider text-emerald-400/80 font-bold">Location</span>
              <span className="text-xs font-medium text-emerald-100 break-words whitespace-normal leading-relaxed block">
                {state.location && state.location !== 'Unknown' ? state.location : 'Default Location'}
              </span>
            </div>
          </div>

          {/* Activity - Full text, never shortened */}
          {state.activity && state.activity !== 'Idle' && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 min-w-0 max-w-full box-border" title="Current Activity">
              <Activity size={13} className="text-sky-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="block text-[9px] uppercase font-mono tracking-wider text-sky-400/80 font-bold">Current Activity</span>
                <span className="text-xs font-medium text-sky-100 break-words whitespace-normal leading-relaxed block">
                  {state.activity}
                </span>
              </div>
            </div>
          )}

          {/* Attire / Outfit - Full text, never shortened */}
          {state.outfit && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-300 min-w-0 max-w-full box-border" title="Attire / Outfit">
              <Shirt size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="block text-[9px] uppercase font-mono tracking-wider text-purple-400/80 font-bold">Attire & Outfit</span>
                <span className="text-xs font-medium text-purple-100 break-words whitespace-normal leading-relaxed block">
                  {state.outfit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status Effects Card - Full text, never shortened */}
        <div
          onClick={handleOpenModal}
          className="w-full max-w-full flex flex-col gap-2 p-2.5 rounded-xl bg-[#141418] border border-[#24242D] hover:border-amber-500/40 cursor-pointer transition-colors group shadow-xs box-border overflow-hidden"
          title="Active Status Effects — Click to tune"
        >
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            <span className="flex items-center gap-1 min-w-0">
              <AlertCircle size={12} className="text-amber-400 shrink-0" />
              <span>Active Status Effects:</span>
            </span>
            <span className="text-[9px] font-mono text-gray-500 shrink-0">{state.statusEffects.length} active</span>
          </div>

          {state.statusEffects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 w-full max-w-full min-w-0">
              {state.statusEffects.map((effect, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 font-medium break-words whitespace-normal max-w-full text-left leading-relaxed box-border"
                >
                  <Zap size={11} className="text-amber-400 shrink-0" />
                  <span className="break-words">{effect}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-[#181820] border border-[#24242C] text-[11px] text-gray-400 italic">
              Stable (No active status conditions)
            </div>
          )}
        </div>

        {/* Action: Tune Status Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal();
          }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 py-2 px-3 rounded-xl border border-amber-500/35 transition-colors shadow-xs cursor-pointer box-border"
          title="Open Status & Scene Tuner"
        >
          <Sliders size={12} className="text-amber-400" />
          <span>Tune Vitals & Status</span>
        </button>
      </div>

      {/* Interactive Character Status Inspector & Scene Tuner Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5 pt-14 sm:pt-16 pb-8 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="bg-[#111115] border border-[#2A2A32] rounded-2xl w-full max-w-xl max-h-[82vh] sm:max-h-[86vh] flex flex-col shadow-2xl overflow-hidden shrink-0">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#16161B] shrink-0 relative">
              <div className="flex items-center gap-3 w-full pr-8">
                {personality.avatar ? (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewAvatar) {
                        onViewAvatar(personality.avatar!, personality.name, "Dynamic Scene & Status");
                      } else {
                        setIsInternalLightboxOpen(true);
                      }
                    }}
                    className="w-10 h-10 rounded-lg bg-[#16161B] border border-amber-500/30 overflow-hidden shrink-0 hover:ring-2 hover:ring-amber-500/50 hover:border-amber-400 transition-all cursor-zoom-in group relative"
                    title="Click to view full portrait"
                  >
                    <img 
                      src={personality.avatar} 
                      alt={personality.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 size={13} className="text-amber-200 drop-shadow-md" />
                    </div>
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Activity size={18} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                    <span>{personality.name}'s Dynamic Scene & Status</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${moodStyle.badge}`}>
                      {editState.mood}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Live roleplay condition, location, emotions, and memory synchronization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-200 hover:bg-[#22222A] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body with ref and overscroll containment */}
            <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs overscroll-contain">
              {feedbackMsg && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : feedbackMsg.type === 'error'
                      ? 'bg-red-950/40 border-red-800/60 text-red-300'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Check size={14} />
                    {feedbackMsg.text}
                  </span>
                  <button onClick={() => setFeedbackMsg(null)} className="opacity-70 hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Lock Warning */}
              {!(overallBondScore >= 35 || state.trust >= 30) && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-semibold text-red-300">Tuner Locked</h4>
                    <p className="text-[10px] text-red-200/70 mt-0.5">
                      You must achieve a Harmonic Bond of 35% or a Trust Score of 30% to manually tune {personality.name}'s status. Keep chatting to build your connection!
                    </p>
                  </div>
                </div>
              )}

              <fieldset disabled={!(overallBondScore >= 35 || state.trust >= 30)} className="space-y-4">
              {/* Real-time Meters (Health, Stamina, Trust, Stress) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Health */}
                <div className="p-2.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1 text-rose-300 font-medium">
                      <Heart size={12} /> Vitality
                    </span>
                    <span className="font-mono font-bold text-gray-100">{editState.health}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editState.health}
                    onChange={(e) => setEditState({ ...editState, health: parseInt(e.target.value, 10) })}
                    className="w-full accent-rose-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${editState.health}%` }}
                    />
                  </div>
                </div>

                {/* Stamina */}
                <div className="p-2.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1 text-emerald-300 font-medium">
                      <Battery size={12} /> Energy
                    </span>
                    <span className="font-mono font-bold text-gray-100">{editState.stamina}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editState.stamina}
                    onChange={(e) => setEditState({ ...editState, stamina: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${editState.stamina}%` }}
                    />
                  </div>
                </div>

                {/* Trust */}
                <div className="p-2.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1 text-purple-300 font-medium">
                      <Users size={12} /> Trust/Bond
                    </span>
                    <span className="font-mono font-bold text-gray-100">{editState.trust}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editState.trust}
                    onChange={(e) => setEditState({ ...editState, trust: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${editState.trust}%` }}
                    />
                  </div>
                </div>

                {/* Stress */}
                <div className="p-2.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1 text-amber-300 font-medium">
                      <ShieldAlert size={12} /> Stress
                    </span>
                    <span className="font-mono font-bold text-gray-100">{editState.stress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editState.stress}
                    onChange={(e) => setEditState({ ...editState, stress: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        editState.stress >= 70
                          ? 'bg-rose-500'
                          : editState.stress >= 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${editState.stress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Mood & Sentiment Controls */}
              <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Smile size={13} className="text-amber-400" />
                    Current Character Mood
                  </label>
                  <span className="text-[10px] text-gray-400">
                    60+ Mood Palette (AI infers dynamically from chat)
                  </span>
                </div>

                {/* Active Mood Input & Visual Preview */}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editState.mood}
                      onChange={(e) => setEditState({ ...editState, mood: e.target.value })}
                      placeholder="Type custom mood or pick from palette below..."
                      className="flex-1 bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:border-amber-500 focus:outline-hidden"
                    />
                    {editState.mood && (
                      <button
                        type="button"
                        onClick={() => setEditState({ ...editState, mood: 'Neutral' })}
                        className="px-2 py-1 text-[11px] text-gray-400 hover:text-gray-200 bg-[#1C1C22] border border-[#2A2A32] rounded-lg transition-colors"
                        title="Reset to Neutral"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Visual Preview Badge */}
                  {(() => {
                    const currentPreview = getMoodStyling(editState.mood, editState.stress);
                    const PreviewIcon = currentPreview.icon;
                    return (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 ${currentPreview.bg}`}>
                        <PreviewIcon size={12} className={`${currentPreview.iconColor} ${currentPreview.pulse ? 'animate-pulse' : ''}`} />
                        <span className="truncate max-w-[130px]">{editState.mood || 'Neutral'}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Mood Categories & Search Bar */}
                <div className="space-y-2 pt-2 border-t border-[#23232A]">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedMoodCategory('featured'); setMoodSearchTerm(''); }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                          selectedMoodCategory === 'featured' && !moodSearchTerm
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                            : 'bg-[#18181D] text-gray-400 border-[#262630] hover:text-gray-200'
                        }`}
                      >
                        Featured
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedMoodCategory('all'); setMoodSearchTerm(''); }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                          selectedMoodCategory === 'all' && !moodSearchTerm
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                            : 'bg-[#18181D] text-gray-400 border-[#262630] hover:text-gray-200'
                        }`}
                      >
                        All (60+)
                      </button>
                      {MOOD_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setSelectedMoodCategory(cat.id); setMoodSearchTerm(''); }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                            selectedMoodCategory === cat.id && !moodSearchTerm
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                              : 'bg-[#18181D] text-gray-400 border-[#262630] hover:text-gray-200'
                          }`}
                        >
                          {cat.name.split('&')[0].trim()}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-36">
                      <Search size={10} className="absolute left-2 top-2 text-gray-500" />
                      <input
                        type="text"
                        value={moodSearchTerm}
                        onChange={(e) => setMoodSearchTerm(e.target.value)}
                        placeholder="Filter moods..."
                        className="w-full bg-[#111114] border border-[#2A2A32] rounded-md pl-6 pr-2 py-0.5 text-[10px] text-gray-200 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Mood Buttons Grid */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 pt-1 scrollbar-thin scrollbar-thumb-[#2E2E38]">
                    {displayedMoods.map((m) => {
                      const isSelected = editState.mood.toLowerCase() === m.toLowerCase();
                      const itemStyle = getMoodStyling(m, 0);
                      const ItemIcon = itemStyle.icon;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMood(m)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                            isSelected
                              ? 'bg-amber-500 text-black font-semibold border-amber-400 shadow-xs'
                              : 'bg-[#18181F] text-gray-300 border-[#2A2A35] hover:border-amber-500/40 hover:text-white'
                          }`}
                        >
                          <ItemIcon size={10} className={isSelected ? 'text-black' : itemStyle.iconColor} />
                          <span>{m}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Location & Scene Activity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-400" />
                    Current Scene Location
                  </label>
                  <input
                    type="text"
                    value={editState.location}
                    onChange={(e) => setEditState({ ...editState, location: e.target.value })}
                    placeholder="e.g. Local Coffee Haven, Underground Cellar"
                    className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-400" />
                    Current Activity
                  </label>
                  <input
                    type="text"
                    value={editState.activity}
                    onChange={(e) => setEditState({ ...editState, activity: e.target.value })}
                    placeholder="e.g. Brewing espresso, Trembling behind User"
                    className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Current Outfit */}
              <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-1.5">
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <Shirt size={13} className="text-purple-400" />
                  Attire / Outfit
                </label>
                <input
                  type="text"
                  value={editState.outfit}
                  onChange={(e) => setEditState({ ...editState, outfit: e.target.value })}
                  placeholder="e.g. Floral sundress and dark green barista apron"
                  className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Status Effects Manager */}
              <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#262630] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-400" />
                    Active Status Effects & Conditions
                  </label>
                  <span className="text-[10px] text-gray-400">Temporary mental & physical modifiers</span>
                </div>

                {/* Current Active Badges */}
                <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-[#111114] rounded-lg border border-[#2A2A32]">
                  {editState.statusEffects.length === 0 ? (
                    <span className="text-[11px] text-gray-500 italic">No active conditions (Stable)</span>
                  ) : (
                    editState.statusEffects.map((eff, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-300"
                      >
                        {eff}
                        <button
                          type="button"
                          onClick={() => handleRemoveEffect(eff)}
                          className="hover:text-red-300 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add Custom Tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEffectInput}
                    onChange={(e) => setNewEffectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEffect(newEffectInput);
                      }
                    }}
                    placeholder="Add custom condition (e.g. 'Heart Racing', 'Adrenaline Spike')"
                    className="flex-1 bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:border-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEffect(newEffectInput)}
                    className="px-3 py-1.5 bg-[#22222A] hover:bg-[#2C2C36] text-gray-200 rounded-lg text-xs font-medium border border-[#33333E] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] text-gray-500 mr-1 self-center">Presets:</span>
                  {commonEffectsPresets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleAddEffect(p)}
                      disabled={editState.statusEffects.includes(p)}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors border ${
                        editState.statusEffects.includes(p)
                          ? 'opacity-40 border-transparent text-gray-600 cursor-default'
                          : 'bg-[#1C1C22] hover:bg-[#282832] text-gray-400 border-[#2A2A34] hover:text-gray-200'
                      }`}
                    >
                      +{p}
                    </button>
                  ))}
                </div>
              </div>
              </fieldset>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#25252E] flex items-center justify-between bg-[#16161B]">
              <button
                type="button"
                onClick={handleReevaluate}
                disabled={isReevaluating || !(overallBondScore >= 35 || state.trust >= 30)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30 rounded-xl transition-colors disabled:opacity-50"
                title="Scan latest conversation and update status automatically"
              >
                <RefreshCw size={13} className={isReevaluating ? 'animate-spin' : ''} />
                <span>{isReevaluating ? 'Syncing...' : 'Sync from Chat'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveState}
                  disabled={isSaving || !(overallBondScore >= 35 || state.trust >= 30)}
                  className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={13} />
                  <span>{isSaving ? 'Applying...' : 'Apply Status'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Internal Image Lightbox for Character Portrait */}
      <ImageLightboxModal
        isOpen={isInternalLightboxOpen}
        onClose={() => setIsInternalLightboxOpen(false)}
        imageUrl={personality?.avatar || null}
        title={personality?.name}
        subtitle="Dynamic Scene & Status"
      />
    </>
  );
};
