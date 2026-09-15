import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RoleplayMessageProps {
  content: string;
  isUser: boolean;
  characterName?: string;
  themeSettings?: any;
}

/**
 * Helper to highlight quoted spoken dialogue ("...") with distinct visual emphasis
 */
function renderFormattedDialogue(text: string, isUser: boolean, themeSettings?: any): React.ReactNode {
  const parts = text.split(/(["“][^"”]+["”])/g);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith('“') && part.endsWith('”'))) {
      return (
        <span
          key={index}
          className="font-medium text-white tracking-normal drop-shadow-sm select-text"
          style={{
            color: isUser ? (themeSettings?.userTextColor || '#f1f5f9') : (themeSettings?.botTextColor || '#ffffff'),
          }}
        >
          {part}
        </span>
      );
    }
    return (
      <span key={index} className="opacity-95">
        {part}
      </span>
    );
  });
}

/**
 * Roleplay Message Formatter:
 * - Spoken dialogue: Words between " " rendered in crisp, high-clarity font
 * - Thoughts, actions & narration: Content between * * rendered in distinct styled light blue/italic with preserved asterisks
 */
export const RoleplayMessage: React.FC<RoleplayMessageProps> = ({ content, isUser, themeSettings }) => {
  // Check if message contains a system event injection directive
  const eventMatch = content?.match(/^\[SYSTEM EVENT INJECTION:\s*([\s\S]*?)\](?:\n\n|\n)?([\s\S]*)$/);
  const injectedEventText = eventMatch ? eventMatch[1].trim() : null;

  // Check if message contains a system action steering prompt (e.g. quest click proposal)
  const actionMatch = content?.match(/^\[SYSTEM ACTION:\s*([\s\S]*?)\](?:\n\n|\n)?([\s\S]*)$/);
  const injectedActionText = actionMatch ? actionMatch[1].trim() : null;

  const remainingContent = eventMatch ? eventMatch[2].trim() : actionMatch ? actionMatch[2].trim() : content;

  // Extract friendly quest name if this was a quest proposal action
  const questNameMatch = injectedActionText?.match(/The user clicked on the quest "([^"]+)"/i);
  const proposedQuestTitle = questNameMatch ? questNameMatch[1] : null;

  return (
    <div
      className={`prose prose-invert max-w-none w-full leading-relaxed break-words ${
        isUser ? "text-gray-100" : "text-white"
      } prose-p:leading-relaxed prose-pre:bg-[#111114] prose-pre:border prose-pre:border-[#2A2A2E] prose-pre:whitespace-pre-wrap prose-img:rounded-lg prose-img:border prose-img:border-[#2A2A2E] prose-img:shadow-2xl`}
    >
      {injectedActionText && (
        <div className="not-prose mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#181822] to-amber-950/20 border border-amber-500/40 text-xs text-amber-200 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
            <span className="text-sm">📜</span>
            <span className="uppercase tracking-wider text-[10px] font-mono">Quest Inquired</span>
            {proposedQuestTitle && (
              <span className="text-amber-400 font-bold ml-1 font-sans text-xs">“{proposedQuestTitle}”</span>
            )}
          </div>
          <p className="leading-relaxed text-amber-100/80 italic text-[11px]">
            {proposedQuestTitle
              ? `Discussing ${proposedQuestTitle}. Waiting for verbal response in character.`
              : injectedActionText}
          </p>
        </div>
      )}

      {injectedEventText && (
        <div className="not-prose mb-3 p-3 rounded-xl bg-amber-950/25 border border-amber-500/35 text-xs text-amber-200 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
            <span className="text-sm">🎲</span>
            <span className="uppercase tracking-wider text-[10px] font-mono">System Event Injected</span>
          </div>
          <p className="leading-relaxed text-amber-100/90 italic">
            "{injectedEventText}"
          </p>
        </div>
      )}

      {remainingContent ? (
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
          p: ({ children }) => {
            const formattedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return renderFormattedDialogue(child, isUser, themeSettings);
              }
              return child;
            });
            return (
              <p className="mb-3 last:mb-0 leading-relaxed font-normal" style={{ color: isUser ? themeSettings?.userTextColor : themeSettings?.botTextColor }}>
                {formattedChildren}
              </p>
            );
          },
          em: ({ children }) => (
            <span className="italic font-normal tracking-wide transition-colors" style={{ color: themeSettings?.systemTextColor || '#7dd3fc' }}>
              *{children}*
            </span>
          ),
          i: ({ children }) => (
            <span className="italic font-normal tracking-wide transition-colors" style={{ color: themeSettings?.systemTextColor || '#7dd3fc' }}>
              *{children}*
            </span>
          ),
          strong: ({ children }) => (
            <strong className="font-bold" style={{ color: isUser ? themeSettings?.userTextColor : themeSettings?.botTextColor }}>{children}</strong>
          ),
          b: ({ children }) => (
            <strong className="font-bold" style={{ color: isUser ? themeSettings?.userTextColor : themeSettings?.botTextColor }}>{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 py-1 my-2 rounded-r italic" style={{ borderLeftColor: themeSettings?.systemTextColor || '#38bdf8', color: themeSettings?.systemTextColor || '#bae6fd', backgroundColor: `${themeSettings?.systemTextColor || '#0c4a6e'}20` }}>
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || "Scene illustration"}
              className="rounded-xl border border-[#2A2A2E] shadow-2xl my-3 max-w-full h-auto object-cover max-h-[520px]"
              referrerPolicy="no-referrer"
            />
          ),
          code: ({ children }) => (
            <code className="bg-[#161619] text-amber-300 px-1.5 py-0.5 rounded text-sm font-mono border border-[#2A2A2E]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-[#111114] border border-[#2A2A2E] p-3 rounded-lg overflow-x-auto my-2 text-sm text-gray-200 font-mono">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-sky-400 underline hover:text-sky-300 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {remainingContent}
      </Markdown>
      ) : null}
    </div>
  );
};
