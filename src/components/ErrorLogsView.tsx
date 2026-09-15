import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Server,
  MessageSquare,
  Search,
  Trash2,
  Download,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Sparkles,
  Bug,
  Terminal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { ErrorLogEntry, ErrorLogSource } from "../types";

interface ErrorLogsViewProps {
  onBackToChat?: () => void;
}

export function ErrorLogsView({ onBackToChat }: ErrorLogsViewProps) {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<"all" | ErrorLogSource>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/error-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (e) {
      console.error("Failed to fetch error logs", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (entry: ErrorLogEntry) => {
    const text = `[${entry.source.toUpperCase()} ERROR] ${entry.title}\nTime: ${entry.timestamp}\nModel: ${entry.model || "N/A"}\nEndpoint: ${entry.endpoint || "N/A"}\nStatus: ${entry.status || "N/A"}\nMessage: ${entry.message}\n\nDetails / Stack:\n${entry.details || "No additional trace provided"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/error-logs?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete error log", e);
    }
  };

  const handleClearLogs = async (source?: "all" | ErrorLogSource) => {
    const targetDesc = source === "server" ? "all Server errors" : source === "chat" ? "all Chat errors" : "all logged errors";

    try {
      const query = source && source !== "all" ? `?source=${source}` : "";
      const res = await fetch(`/api/error-logs${query}`, { method: "DELETE" });
      if (res.ok) {
        if (!source || source === "all") {
          setLogs([]);
        } else {
          setLogs((prev) => prev.filter((l) => l.source !== source));
        }
        setFeedbackMessage(`Cleared ${targetDesc}`);
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (e) {
      console.error("Failed to clear error logs", e);
    }
  };

  const handleSimulate = async (type: "server" | "chat") => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/error-logs/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setLogs((prev) => [data.log, ...prev]);
          // Automatically expand newly simulated log
          setExpandedLogIds((prev) => ({ ...prev, [data.log.id]: true }));
          setFeedbackMessage(`Simulated new ${type === "server" ? "Server" : "Chat"} error log`);
          setTimeout(() => setFeedbackMessage(null), 3500);
        }
      }
    } catch (e) {
      console.error("Failed to simulate error", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs based on category and search query
  const filteredLogs = logs.filter((log) => {
    if (selectedSource !== "all" && log.source !== selectedSource) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesTitle = log.title?.toLowerCase().includes(q);
      const matchesMsg = log.message?.toLowerCase().includes(q);
      const matchesModel = log.model?.toLowerCase().includes(q);
      const matchesEndpoint = log.endpoint?.toLowerCase().includes(q);
      const matchesDetails = log.details?.toLowerCase().includes(q);
      const matchesPersona = log.personalityName?.toLowerCase().includes(q);
      return matchesTitle || matchesMsg || matchesModel || matchesEndpoint || matchesDetails || matchesPersona;
    }
    return true;
  });

  const serverCount = logs.filter((l) => l.source === "server").length;
  const chatCount = logs.filter((l) => l.source === "chat").length;

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      let relative = "";
      if (diffSec < 60) relative = "Just now";
      else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
      else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
      else relative = `${Math.floor(diffSec / 86400)}d ago`;

      return {
        formatted: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        full: date.toLocaleString(),
        relative,
      };
    } catch {
      return { formatted: iso, full: iso, relative: "" };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2E] pb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Bug size={18} className="text-red-400" />
            System & Chat Error Logs
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time diagnostic log viewer for backend inference servers, Gemini API rate limits, and chat dialogue errors.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-[#18181D] hover:bg-[#222228] text-gray-300 hover:text-white border border-[#2E2E36] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Refresh logs from server"
          >
            <RefreshCw size={13} className={`${isLoading ? "animate-spin text-amber-400" : "text-gray-400"}`} />
            <span>Refresh</span>
          </button>

          {/* Simulate error buttons for quick navigation and testing */}
          <div className="flex items-center rounded-lg border border-[#2E2E36] bg-[#141418] p-0.5">
            <button
              onClick={() => handleSimulate("server")}
              disabled={isSimulating}
              className="px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 rounded transition-colors flex items-center gap-1"
              title="Add a simulated server error log to test navigation"
            >
              <Server size={11} />
              <span>+ Test Server Log</span>
            </button>
            <div className="w-[1px] h-3.5 bg-[#2E2E36] my-auto" />
            <button
              onClick={() => handleSimulate("chat")}
              disabled={isSimulating}
              className="px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded transition-colors flex items-center gap-1"
              title="Add a simulated chat error log to test navigation"
            >
              <MessageSquare size={11} />
              <span>+ Test Chat Log</span>
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#18181D] hover:bg-[#222228] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white border border-[#2E2E36] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download error logs as JSON"
          >
            <Download size={13} className="text-gray-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => {
              if (showClearConfirm) {
                handleClearLogs(selectedSource);
                setShowClearConfirm(false);
              } else {
                setShowClearConfirm(true);
                setTimeout(() => setShowClearConfirm(false), 3000);
              }
            }}
            disabled={logs.length === 0}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showClearConfirm
                ? "bg-red-600 hover:bg-red-500 text-white border-red-500"
                : "bg-red-950/30 hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 border-red-800/40"
            }`}
            title="Clear error logs"
          >
            <Trash2 size={13} className={showClearConfirm ? "text-white" : "text-red-400"} />
            <span>
              {showClearConfirm
                ? "Click to Confirm"
                : `Clear ${selectedSource !== "all" ? (selectedSource === "server" ? "Server" : "Chat") : "All"}`}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback banner if an action occurred */}
      {feedbackMessage && (
        <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Navigation bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111115] p-3 rounded-xl border border-[#2A2A2E]">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSource("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              selectedSource === "all"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1C1C22] border border-transparent"
            }`}
          >
            <Filter size={12} />
            <span>All Logs</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#1E1E26] text-gray-300 border border-[#2E2E38]">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedSource("server")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              selectedSource === "server"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1C1C22] border border-transparent"
            }`}
          >
            <Server size={12} className="text-amber-400" />
            <span>Server Logs</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#1E1E26] text-amber-400/90 border border-[#2E2E38]">
              {serverCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedSource("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              selectedSource === "chat"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1C1C22] border border-transparent"
            }`}
          >
            <MessageSquare size={12} className="text-rose-400" />
            <span>Chat Logs</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#1E1E26] text-rose-400/90 border border-[#2E2E38]">
              {chatCount}
            </span>
          </button>
        </div>

        {/* Search filter input */}
        <div className="relative min-w-[220px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search error messages, models, endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#0E0E12] border border-[#2A2A32] focus:border-amber-500/50 focus:outline-none text-xs text-gray-200 placeholder-gray-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Log Entries List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#111115] border border-[#2A2A2E] rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#181820] border border-[#2A2A30] flex items-center justify-center mx-auto text-emerald-400">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">
            {searchQuery ? "No matching errors found" : "No Errors Recorded"}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? `No error records match "${searchQuery}". Try modifying your query or clear the search filter.`
              : "All neural server connections, model inferences, and chat dialogues are executing smoothly without errors."}
          </p>
          {!searchQuery && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => handleSimulate("server")}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#1A1A22] hover:bg-[#242430] text-amber-300 border border-[#2E2E3A] transition-colors flex items-center gap-1.5"
              >
                <Server size={13} />
                <span>Simulate Server Error</span>
              </button>
              <button
                onClick={() => handleSimulate("chat")}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#1A1A22] hover:bg-[#242430] text-rose-300 border border-[#2E2E3A] transition-colors flex items-center gap-1.5"
              >
                <MessageSquare size={13} />
                <span>Simulate Chat Error</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span>
              Showing <span className="font-mono text-gray-300">{filteredLogs.length}</span> of{" "}
              <span className="font-mono text-gray-300">{logs.length}</span> recorded logs
            </span>
            <span>Click any log card to expand stack trace & diagnostics</span>
          </div>

          {filteredLogs.map((log) => {
            const isExpanded = !!expandedLogIds[log.id];
            const timeInfo = formatTimestamp(log.timestamp);
            const isServer = log.source === "server";
            const isRateLimit = log.status === 429 || log.message?.includes("429") || log.title?.includes("Rate Limit");

            return (
              <div
                key={log.id}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  isExpanded
                    ? "bg-[#131318] border-[#383842] shadow-md ring-1 ring-white/5"
                    : "bg-[#111115] hover:bg-[#15151B] border-[#25252C] hover:border-[#33333C]"
                }`}
              >
                {/* Log Header Summary row */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-3.5 cursor-pointer flex items-start sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Expand icon */}
                    <div className="pt-0.5 sm:pt-0 text-gray-500 shrink-0">
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>

                    {/* Source Pill */}
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${
                        isServer
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {isServer ? <Server size={10} /> : <MessageSquare size={10} />}
                      <span>{log.source}</span>
                    </span>

                    {/* Status Code badge if present */}
                    {log.status && (
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isRateLimit
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {log.status}
                      </span>
                    )}

                    {/* Model badge */}
                    {log.model && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-[#181820] border border-[#2A2A34] truncate max-w-[140px]" title={log.model}>
                        {log.model}
                      </span>
                    )}

                    {/* Title and message */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-gray-200 truncate">{log.title}</h4>
                        {log.personalityName && (
                          <span className="text-[10px] text-gray-400 truncate hidden md:inline">
                            • Character: {log.personalityName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5 font-mono">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  {/* Right side: Timestamp & individual actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-[11px] text-gray-400 block font-mono" title={timeInfo.full}>
                        {timeInfo.formatted}
                      </span>
                      <span className="text-[9px] text-gray-400 block">
                        {timeInfo.relative}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteOne(log.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete this log entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Diagnostics View */}
                {isExpanded && (
                  <div className="border-t border-[#262630] bg-[#0C0C10] p-4 space-y-3.5 animate-in fade-in duration-100">
                    {/* Metadata pills bar */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161C] border border-[#282832] text-gray-300">
                        <Clock size={12} className="text-amber-400" />
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="font-mono text-gray-200">{timeInfo.full}</span>
                      </div>

                      {log.endpoint && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161C] border border-[#282832] text-gray-300">
                          <Terminal size={12} className="text-amber-400" />
                          <span className="text-gray-400">Endpoint:</span>
                          <span className="font-mono text-gray-200">{log.endpoint}</span>
                        </div>
                      )}

                      {log.model && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161C] border border-[#282832] text-gray-300">
                          <Server size={12} className="text-amber-400" />
                          <span className="text-gray-400">Model:</span>
                          <span className="font-mono text-amber-300">{log.model}</span>
                        </div>
                      )}

                      {log.personalityName && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161C] border border-[#282832] text-gray-300">
                          <MessageSquare size={12} className="text-rose-400" />
                          <span className="text-gray-400">Persona:</span>
                          <span className="font-medium text-gray-200">{log.personalityName}</span>
                        </div>
                      )}

                      <div className="ml-auto">
                        <button
                          onClick={() => handleCopy(log)}
                          className="px-2.5 py-1 rounded-md bg-[#1D1D26] hover:bg-[#262632] text-gray-300 hover:text-white border border-[#2E2E3A] text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                          title="Copy error details to clipboard"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} className="text-gray-400" />
                              <span>Copy Diagnostics</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Primary Error Message */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">
                        Error Message
                      </span>
                      <div className="p-3 rounded-lg bg-[#14141A] border border-red-900/30 text-red-200 text-xs font-mono leading-relaxed select-text">
                        {log.message}
                      </div>
                    </div>

                    {/* Detailed stack trace or payload */}
                    {log.details && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">
                          Stack Trace / Payload Details
                        </span>
                        <pre className="p-3 rounded-lg bg-[#08080A] border border-[#22222A] text-gray-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56 select-text whitespace-pre-wrap">
                          {log.details}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
