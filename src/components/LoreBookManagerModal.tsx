import React, { useState, useEffect, useRef } from "react";
import { X, Save, Trash2, Plus, Edit2, BookOpen, Sparkles, Check } from "lucide-react";
import { LoreBook, LoreEntry, Scenario } from "../types";
import { insertRoleplayMacro } from "../roleplayTemplate";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Scenario[];
  onLoreBooksChange: () => void;
}

export function LoreBookManagerModal({ isOpen, onClose, scenarios, onLoreBooksChange }: Props) {
  const [loreBooks, setLoreBooks] = useState<LoreBook[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  
  // Entry editing
  const entryContentRef = useRef<HTMLTextAreaElement>(null);
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null);
  const [entryName, setEntryName] = useState("");
  const [entryKeywords, setEntryKeywords] = useState("");
  const [entryContent, setEntryContent] = useState("");

  // Lore Entry Auto-generation state
  const [loreGuideline, setLoreGuideline] = useState("");
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [loreStatusMsg, setLoreStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [bookDeleteError, setBookDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLoreBooks();
    } else {
      setEditingId(null);
      setConfirmDeleteBookId(null);
      setBookDeleteError(null);
      resetForm();
    }
  }, [isOpen]);

  const fetchLoreBooks = async () => {
    try {
      const res = await fetch("/api/lorebooks");
      if (res.ok) setLoreBooks(await res.json());
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setScenarioId("");
    setEntries([]);
    setEditingEntry(null);
    setEntryName("");
    setEntryKeywords("");
    setEntryContent("");
    setLoreGuideline("");
    setLoreStatusMsg(null);
  };

  const startEdit = (lb: LoreBook) => {
    setEditingId(lb.id);
    setConfirmDeleteBookId(null);
    setBookDeleteError(null);
    setName(lb.name);
    setDescription(lb.description || "");
    setScenarioId(lb.scenarioId || "");
    setEntries(lb.entries || []);
    setEditingEntry(null);
    setEntryName("");
    setEntryKeywords("");
    setEntryContent("");
  };

  const startNew = () => {
    setEditingId("new");
    setConfirmDeleteBookId(null);
    setBookDeleteError(null);
    resetForm();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setConfirmDeleteBookId(null);
    setBookDeleteError(null);
    resetForm();
  };

  const handleSaveLoreBook = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const payload = { name, description, scenarioId: scenarioId || null, entries };
      let res;
      if (editingId && editingId !== "new") {
        res = await fetch(`/api/lorebooks/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/lorebooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        await onLoreBooksChange();
        await fetchLoreBooks();
        cancelEdit();
      }
    } finally { setIsSaving(false); }
  };

  const handleDeleteBook = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDeletingBook(true);
    setBookDeleteError(null);
    try {
      const res = await fetch(`/api/lorebooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === id) {
          cancelEdit();
        } else {
          setConfirmDeleteBookId(null);
        }
        await onLoreBooksChange();
        await fetchLoreBooks();
      } else {
        const err = await res.json().catch(() => ({}));
        setBookDeleteError(err.error || "Failed to delete lore book");
      }
    } catch (err: any) {
      console.error("Failed to delete lore book:", err);
      setBookDeleteError(err?.message || "Failed to delete lore book");
    } finally {
      setIsDeletingBook(false);
    }
  };

  const handleDeleteEntry = (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEntries(prev => prev.filter(item => item.id !== entryId));
    if (editingEntry?.id === entryId) {
      setEditingEntry(null);
      setEntryName("");
      setEntryKeywords("");
      setEntryContent("");
    }
  };

  const handleCancelEntryEdit = () => {
    setEditingEntry(null);
    setEntryName("");
    setEntryKeywords("");
    setEntryContent("");
  };

  const handleSaveEntry = () => {
    if (!entryName.trim() || !entryContent.trim()) return;
    const newEntry: LoreEntry = {
        id: editingEntry?.id || Math.random().toString(36).substring(7),
        name: entryName,
        keywords: entryKeywords,
        content: entryContent
    };
    
    if (editingEntry) {
        setEntries(entries.map(e => e.id === newEntry.id ? newEntry : e));
    } else {
        setEntries([...entries, newEntry]);
    }
    setEditingEntry(null);
    setEntryName("");
    setEntryKeywords("");
    setEntryContent("");
  };

  const handleAutoGenerateLoreEntry = async () => {
    setIsGeneratingLore(true);
    setLoreStatusMsg(null);
    try {
      const activeScenario = scenarios.find((s) => s.id === scenarioId);
      const res = await fetch("/api/generate-lore-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideline: loreGuideline.trim(),
          bookName: name.trim(),
          bookDescription: description.trim(),
          scenarioContext: activeScenario?.context || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name && data.content) {
          const generatedEntry: LoreEntry = {
            id: Math.random().toString(36).substring(7),
            name: data.name,
            keywords: data.keywords || "",
            content: data.content,
          };
          setEntries((prev) => [...prev, generatedEntry]);
          setEditingEntry(generatedEntry);
          setEntryName(data.name);
          setEntryKeywords(data.keywords || "");
          setEntryContent(data.content);
          setLoreStatusMsg({ type: "success", text: `Generated entry "${data.name}" added to list!` });
          setLoreGuideline("");
          setTimeout(() => setLoreStatusMsg(null), 4000);
        } else {
          setLoreStatusMsg({ type: "error", text: "Invalid response format from generator." });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setLoreStatusMsg({ type: "error", text: err.error || "Failed to auto-generate lore entry." });
      }
    } catch (e: any) {
      console.error(e);
      setLoreStatusMsg({ type: "error", text: e?.message || "Failed to auto-generate lore entry." });
    } finally {
      setIsGeneratingLore(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <BookOpen className="text-emerald-500" size={18} />
            <h2 className="text-lg font-semibold text-gray-200">Lore Books</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#2A2A2E] rounded text-gray-400"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-6">
          <div className={`md:w-1/3 flex flex-col gap-2 ${editingId ? 'hidden md:flex' : 'flex'}`}>
            <button onClick={startNew} className="py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg text-sm font-medium transition-colors hover:bg-emerald-500/20 flex items-center justify-center gap-2"><Plus size={16} /> New Book</button>
            <div className="space-y-2">
                {loreBooks.map(lb => (
                    <div key={lb.id} onClick={() => startEdit(lb)} className={`p-3 rounded-lg border cursor-pointer transition-all ${editingId === lb.id ? "bg-[#25252A] border-emerald-500/50" : "bg-[#18181C] border-[#2A2A2E] hover:border-[#3A3A40]"}`}>
                        <div className="flex justify-between items-start">
                            <h3 className="text-sm font-medium text-gray-200 line-clamp-1">{lb.name}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteBookId(confirmDeleteBookId === lb.id ? null : lb.id);
                                }}
                                className="text-gray-400 hover:text-red-400 p-1 rounded-md hover:bg-black/30 transition-colors"
                                title="Delete lore book"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                        </div>
                        {lb.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lb.description}</p>}
                        <div className="mt-1 text-[10px] text-gray-500 font-mono">
                          {lb.entries?.length || 0} {(lb.entries?.length === 1) ? "entry" : "entries"}
                        </div>

                        {/* Inline Delete Confirmation */}
                        {confirmDeleteBookId === lb.id && (
                          <div
                            className="mt-2 p-2.5 bg-red-950/80 border border-red-500/40 rounded-lg text-xs space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-red-200 text-[11px] font-medium block">
                              Permanently delete this lore book?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteBook(lb.id, e)}
                                disabled={isDeletingBook}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                              >
                                {isDeletingBook ? "Deleting..." : "Confirm Delete"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteBookId(null);
                                }}
                                className="px-2 py-1 bg-[#25252D] hover:bg-[#30303A] text-gray-300 rounded text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                ))}
                {loreBooks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 italic">No lore books yet.</p>
                )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {editingId ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Book Name</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Book Name" className="bg-[#111114] border border-[#2A2A2E] focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 w-full outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Attached Scenario (Optional)</label>
                      <select value={scenarioId} onChange={e => setScenarioId(e.target.value)} className="bg-[#111114] border border-[#2A2A2E] focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 w-full outline-none">
                          <option value="">No Scenario Attached</option>
                          {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Overview or setting of this lore book..." className="bg-[#111114] border border-[#2A2A2E] focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 w-full outline-none" />
                </div>
                
                <div className="border border-[#2A2A2E] rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase">Entries ({entries.length})</h4>
                    </div>

                    {/* Auto-Generate Lore Entry with optional guideline */}
                    <div className="p-3 bg-[#131317] border border-emerald-500/35 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-400" />
                          <span className="text-xs font-semibold text-gray-200">Auto-Generate Lore Entry</span>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 font-mono">Optional Guideline</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="lore-guideline-input"
                          type="text"
                          value={loreGuideline}
                          onChange={(e) => setLoreGuideline(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAutoGenerateLoreEntry();
                            }
                          }}
                          placeholder="Guideline (e.g., ancient obsidian dagger, forbidden royal vault, celestial dragon cult)..."
                          className="flex-1 bg-[#101014] border border-[#2B2B33] focus:border-emerald-500/60 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
                        />
                        <button
                          id="auto-generate-lore-entry-btn"
                          type="button"
                          onClick={handleAutoGenerateLoreEntry}
                          disabled={isGeneratingLore}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-sm"
                          title="Generate a lore entry based on optional guideline"
                        >
                          <Sparkles size={13} className={isGeneratingLore ? "animate-spin" : ""} />
                          <span>{isGeneratingLore ? "Generating..." : "⚡ Auto-Generate Entry"}</span>
                        </button>
                      </div>
                      {loreStatusMsg && (
                        <p className={`text-[11px] flex items-center gap-1 ${loreStatusMsg.type === "success" ? "text-emerald-300" : "text-rose-400"}`}>
                          {loreStatusMsg.type === "success" ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                          {loreStatusMsg.text}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {entries.map(e => (
                            <div key={e.id} className="flex justify-between items-center bg-[#111114] p-2.5 rounded-lg border border-[#23232A] text-sm text-gray-300">
                                <div className="pr-2">
                                  <div className="font-medium text-gray-200">{e.name}</div>
                                  {e.keywords && <div className="text-[10px] text-emerald-400/80 mt-0.5">Keywords: {e.keywords}</div>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingEntry(e); setEntryName(e.name); setEntryKeywords(e.keywords); setEntryContent(e.content); }}
                                    className="text-gray-400 hover:text-emerald-400 p-1.5 rounded hover:bg-black/30 transition-colors"
                                    title="Edit entry"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(ev) => handleDeleteEntry(e.id, ev)}
                                    className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-black/30 transition-colors"
                                    title="Delete entry"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                            </div>
                        ))}
                        {entries.length === 0 && (
                          <div className="text-xs text-gray-500 italic py-2 text-center">No entries yet. Add entries below or auto-generate one!</div>
                        )}
                    </div>

                    {/* Entry Form */}
                    <div className="space-y-2 pt-2 border-t border-[#2A2A2E]">
                        <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                          <span>{editingEntry ? `Editing Entry: "${editingEntry.name}"` : "Add New Entry"}</span>
                          {editingEntry && (
                            <button
                              type="button"
                              onClick={handleCancelEntryEdit}
                              className="text-gray-400 hover:text-gray-200 text-xs"
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                        <input value={entryName} onChange={e => setEntryName(e.target.value)} placeholder="Entry Name (e.g. Royal Academy of Magic)" className="bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 w-full outline-none focus:border-emerald-500/50"/>
                        <input value={entryKeywords} onChange={e => setEntryKeywords(e.target.value)} placeholder="Keywords (comma separated, e.g. academy, magic, spellcraft, mages)" className="bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 w-full outline-none focus:border-emerald-500/50"/>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400 font-medium">Lore Content</label>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-gray-500 font-medium">Insert:</span>
                            <button
                              type="button"
                              onClick={() => insertRoleplayMacro('{{char}}', entryContent, setEntryContent, entryContentRef.current)}
                              className="px-1.5 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded font-mono text-[10px] transition-colors"
                            >
                              +{"\"{{char}}\""}
                            </button>
                            <button
                              type="button"
                              onClick={() => insertRoleplayMacro('{{user}}', entryContent, setEntryContent, entryContentRef.current)}
                              className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                            >
                              +{"\"{{user}}\""}
                            </button>
                          </div>
                        </div>
                        <textarea ref={entryContentRef} value={entryContent} onChange={e => setEntryContent(e.target.value.substring(0, 2000))} placeholder='Lore content (max 2000 chars, e.g. {{char}} knows the secret passages of the city that {{user}} seeks...)' className="bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 w-full h-24 outline-none focus:border-emerald-500/50" maxLength={2000}/>
                        <button
                          type="button"
                          onClick={handleSaveEntry}
                          disabled={!entryName.trim() || !entryContent.trim()}
                          className="w-full py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                        >
                          {editingEntry ? "Update Entry in Book" : "+ Add Entry to Book"}
                        </button>
                    </div>
                </div>

                {bookDeleteError && (
                  <div className="p-2.5 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-lg flex items-center justify-between">
                    <span>{bookDeleteError}</span>
                    <button type="button" onClick={() => setBookDeleteError(null)} className="text-gray-400 hover:text-gray-200 text-xs">✕</button>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2E]">
                  <div>
                    {editingId && editingId !== "new" && (
                      confirmDeleteBookId === editingId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 font-medium">Delete lore book?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(editingId)}
                            disabled={isDeletingBook}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            {isDeletingBook ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBookId(null)}
                            className="px-2.5 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteBookId(editingId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete Lore Book</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 bg-[#2A2A2E] hover:bg-[#3A3A40] rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLoreBook}
                      disabled={isSaving || !name.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      <Save size={14} /> {isSaving ? "Saving..." : "Save Lore Book"}
                    </button>
                  </div>
                </div>
                </>
            ) : (
                <div className="text-gray-500 text-sm italic text-center py-20">Select a book or create new</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
