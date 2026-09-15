import React, { useEffect } from "react";
import { X, Download, ExternalLink, Sparkles } from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl max-h-[92vh] flex flex-col items-center animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Container */}
        <div className="w-full max-w-full bg-[#121217] border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/90 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="w-full px-4 py-3 border-b border-[#22222B] bg-[#16161D] flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              {title && (
                <h3 className="text-sm sm:text-base font-bold text-amber-200 truncate flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-400 shrink-0" />
                  <span className="truncate">{title}</span>
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 break-words leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-[#1F1F28] hover:bg-[#2A2A36] text-gray-300 hover:text-white transition-colors border border-[#2E2E3C]"
                title="Open original in new tab"
              >
                <ExternalLink size={14} />
              </a>
              <a
                href={imageUrl}
                download={title ? `${title.replace(/\s+/g, "_").toLowerCase()}_portrait.jpg` : "portrait.jpg"}
                className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 transition-colors border border-amber-500/35"
                title="Download Image"
              >
                <Download size={14} />
              </a>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close Lightbox"
                className="p-1.5 rounded-lg bg-[#22222C] hover:bg-[#323240] text-gray-300 hover:text-white transition-colors border border-[#353545] cursor-pointer ml-1 shadow-sm"
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="w-full flex-1 min-h-0 p-3 sm:p-5 flex items-center justify-center overflow-hidden bg-[#0A0A0E]/60">
            <img
              src={imageUrl}
              alt={title || "Character Portrait"}
              className="max-h-[58vh] sm:max-h-[66vh] w-auto max-w-full rounded-xl object-contain shadow-xl border border-[#2A2A35]"
            />
          </div>

          {/* Footer note */}
          <div className="w-full px-4 py-2 border-t border-[#1C1C24] bg-[#0E0E12] text-center shrink-0">
            <span className="text-[11px] text-gray-500">
              Click anywhere outside or press <kbd className="px-1.5 py-0.5 bg-[#1C1C24] rounded text-gray-400 font-mono text-[10px]">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
