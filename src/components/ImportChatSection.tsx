import React, { useState } from "react";
import { Upload, RefreshCw, FileText, CheckCircle2, ChevronRight, AlertTriangle, MessageSquare, Info } from "lucide-react";
import { Personality } from "../types";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ParsedMessage {
  speaker: string;
  text: string;
}

export function ImportChatSection({
  personalities,
  selectedModel
}: {
  personalities: Personality[];
  selectedModel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  
  const [destCharacterId, setDestCharacterId] = useState<string>("");
  const [userSpeaker, setUserSpeaker] = useState<string>("");
  const [charSpeaker, setCharSpeaker] = useState<string>("");
  const [unformattedDefault, setUnformattedDefault] = useState<"dialogue" | "action">("dialogue");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [importSuccess, setImportSuccess] = useState(false);
  
  const extractTextFromDocx = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      // Use Mammoth to preserve color styling by mapping inline styles
      const options = {
         styleMap: [
            "r[style-name='Emphasis'] => em",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh"
         ]
      };
      // For Mammoth, getting the raw color requires custom XML parsing, but Mammoth strips color by default.
      // However, we can use the raw XML from docx if we really need color, but let's just stick to what Mammoth gives us
      // For now, mammoth doesn't expose color directly to HTML without writing a custom XML parser for the run nodes.
      // We'll rely on italics mapping for docx as that's standard for action.
      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      let html = result.value;
      
      // Preserve italics as actions
      html = html.replace(/<em[^>]*>/gi, ' *');
      html = html.replace(/<\/em>/gi, '* ');
      html = html.replace(/<i[^>]*>/gi, ' *');
      html = html.replace(/<\/i>/gi, '* ');
      
      const div = document.createElement('div');
      div.innerHTML = html;
      
      // We want to preserve paragraphs as newlines
      let out = "";
      const paragraphs = div.querySelectorAll("p");
      if (paragraphs.length > 0) {
         paragraphs.forEach(p => {
             out += p.textContent + "\n";
         });
         return out;
      }
      
      return div.textContent || "";
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
       const arrayBuffer = await file.arrayBuffer();
       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
       let fullText = '';
       
       for (let i = 1; i <= pdf.numPages; i++) {
           const page = await pdf.getPage(i);
           const textContent = await page.getTextContent();
           
           let lastY = -1;
           let currentLine = '';
           let lastItemX = -1;
           let lastItemWidth = -1;
           
           for (const item of textContent.items) {
               if (!('str' in item)) continue;
               
               const y = item.transform[5];
               const x = item.transform[4];
               const width = item.width || 0;

               // Start new line if Y coordinate changes significantly
               if (lastY !== -1 && Math.abs(lastY - y) > 4) {
                   fullText += currentLine.trim() + '\n';
                   currentLine = '';
                   lastItemX = -1;
               } else if (lastItemX !== -1) {
                   // Add space if there is a gap between items on the same line
                   const expectedNextX = lastItemX + lastItemWidth;
                   if (x - expectedNextX > 2) {
                       currentLine += ' ';
                   }
               }
               
               let str = item.str;
               const isItalic = item.fontName && (item.fontName.toLowerCase().includes('italic') || item.fontName.toLowerCase().includes('oblique'));
               const hasColor = (item as any).color && (
                    (Array.isArray((item as any).color) && ((item as any).color[0] !== 0 || (item as any).color[1] !== 0 || (item as any).color[2] !== 0)) ||
                    (typeof (item as any).color === 'string' && (item as any).color !== '#000000' && (item as any).color !== 'black' && (item as any).color !== '')
               );

               if ((isItalic || hasColor) && str.trim()) {
                   str = `*${str}*`;
               }
               
               currentLine += str;
               lastY = y;
               lastItemX = x;
               lastItemWidth = width;
           }
           fullText += currentLine.trim() + '\n';
       }
       // Clean up consecutive asterisks caused by splitting styled words
       fullText = fullText.replace(/\*\s*\*/g, ' '); 
       
       // PDF text extraction sometimes loses the colon after speaker names or places it weirdly.
       // We'll let the existing parseFile logic handle it, but we should make sure 
       // isolated short lines are treated as speakers if they don't have colons.
       return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImportSuccess(false);
      setStatus("Extracting text...");
      setProgress(0);
      setIsProcessing(true);
      
      try {
        const fileType = selectedFile.name.toLowerCase();
        let extractedText = "";

        if (fileType.endsWith(".pdf")) {
            extractedText = await extractTextFromPdf(selectedFile);
        } else if (fileType.endsWith(".docx")) {
            extractedText = await extractTextFromDocx(selectedFile);
        } else {
            extractedText = await new Promise<string>((resolve, reject) => {
               const reader = new FileReader();
               reader.onload = (event) => resolve((event.target?.result as string) || "");
               reader.onerror = (err) => reject(err);
               reader.readAsText(selectedFile);
            });
        }
        parseFile(extractedText);
        setStatus("Text extracted successfully.");
      } catch (err: any) {
        setStatus("Failed to extract file: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  const parseFile = (content: string) => {
    const lines = content.split(/\r?\n/);
    const parsed: ParsedMessage[] = [];
    let currentSpeaker = "";
    let currentText = "";

    const speakerRegex = /^([A-Za-z0-9_\s-]+):\s*$/;
    const inlineSpeakerRegex = /^([A-Za-z0-9_\s-]+):\s+(.+)$/;
    // If a line is short, doesn't end in punctuation, and looks like a name, it might be a speaker header (common in PDFs)
    const implicitSpeakerRegex = /^([A-Z][a-zA-Z0-9_\s-]{1,20})$/;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
         if (currentText) currentText += "\n";
         continue;
      }
      
      let match = line.match(speakerRegex);
      if (match) {
         if (currentSpeaker && currentText) {
            parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
         }
         currentSpeaker = match[1].trim();
         currentText = "";
         continue;
      }
      
      match = line.match(inlineSpeakerRegex);
      if (match) {
         if (currentSpeaker && currentText) {
            parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
         }
         currentSpeaker = match[1].trim();
         currentText = match[2].trim();
         continue;
      }

      // Check if it's an implicit speaker line (e.g. "Andrew" on its own line)
      match = line.match(implicitSpeakerRegex);
      // Only treat it as a speaker if the NEXT line is not empty and doesn't look like a speaker too
      if (match && !currentText.endsWith("\n") && !line.includes("*") && !line.includes('"')) {
          let nextLineIdx = i + 1;
          while (nextLineIdx < lines.length && !lines[nextLineIdx].trim()) {
              nextLineIdx++;
          }
          if (nextLineIdx < lines.length) {
              const nextLine = lines[nextLineIdx].trim();
              if (!nextLine.match(speakerRegex) && !nextLine.match(implicitSpeakerRegex)) {
                  if (currentSpeaker && currentText) {
                      parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
                  }
                  currentSpeaker = match[1].trim();
                  currentText = "";
                  continue;
              }
          }
      }

      if (currentSpeaker) {
         currentText += (currentText ? "\n" : "") + line;
      }
    }

    if (currentSpeaker && currentText) {
       parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
    }

    setMessages(parsed);
    
    const unique = Array.from(new Set(parsed.map(m => m.speaker)));
    setSpeakers(unique);
    if (unique.length >= 2) {
      setUserSpeaker(unique[0]);
      setCharSpeaker(unique[1]);
    } else if (unique.length === 1) {
      setUserSpeaker(unique[0]);
    }
  };

  const handleImport = async () => {
    if (!destCharacterId || !userSpeaker || !charSpeaker) {
      alert("Please map both speakers and select a destination character.");
      return;
    }
    
    setIsProcessing(true);
    setStatus("Running custom local parsing engine...");
    setProgress(0);
    setImportSuccess(false);
    
    try {
      let finalHistory = [];
      let mappedMessages = messages.filter(m => m.speaker === userSpeaker || m.speaker === charSpeaker);
      
      for (let i = 0; i < mappedMessages.length; i++) {
        let text = mappedMessages[i].text.trim();
        
        // Custom Heuristic Chat Parsing Engine (No AI)
        // 1. Convert common alternative action wrappers to asterisks
        text = text.replace(/\(([^)]+)\)/g, "*$1*"); // (smiles) -> *smiles*
        text = text.replace(/\[([^\]]+)\]/g, "*$1*"); // [smiles] -> *smiles*
        
        // 2. If there are no quotes and no asterisks anywhere, classify it
        if (!text.includes('"') && !text.includes('*')) {
          const lower = text.toLowerCase();
          
          // Action verbs that almost always indicate an action when starting a sentence in RP (without quotes)
          const strictActionVerbs = "yawn|nod|smile|laugh|chuckle|sigh|gasp|shrug|blink|stare|glare|frown|smirk|grin|wince|flinch|blush|gulp|swallow|shiver|tremble|point|wave";
          const actionPattern = new RegExp(`^(i|he|she|they|it)\\s+(${strictActionVerbs})s?\\b`);
          const thirdPersonActionPattern = new RegExp(`^(${strictActionVerbs})s?\\b`);
          
          // Dialogue indicators that almost always mean spoken text
          const dialoguePattern = /^(hello|hi|hey|yes|no|what|how|why|where|who|yeah|nope|ok|okay|well|so|but|and|please|thanks)\\b/;
          
          let isAction = false;
          let isDialogue = false;

          if (lower.match(actionPattern) || lower.match(thirdPersonActionPattern)) {
             isAction = true;
          } else if (lower.match(dialoguePattern)) {
             isDialogue = true;
          }

          if (isAction) {
             text = `*${text}*`;
          } else if (isDialogue) {
             text = `"${text}"`;
          } else {
             // Use user's selected fallback for ambiguous text
             text = unformattedDefault === "action" ? `*${text}*` : `"${text}"`;
          }
        }

        finalHistory.push({
          role: mappedMessages[i].speaker === userSpeaker ? "user" : "model",
          parts: [{ text: text }]
        });
        
        if (i % 50 === 0) {
           setProgress(Math.floor((i / mappedMessages.length) * 100));
           await new Promise(resolve => setTimeout(resolve, 10)); // Yield to allow UI to update
        }
      }
      
      setStatus("Saving formatted history...");
      setProgress(100);
      
      const saveRes = await fetch("/api/chat/import-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalityId: destCharacterId,
          history: finalHistory
        })
      });

      if (!saveRes.ok) throw new Error("Failed to save history");
      
      setStatus("Import completed successfully!");
      setImportSuccess(true);
      setMessages([]);
      setFile(null);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Upload className="text-amber-400" /> Import External Chat
        </h1>
        <p className="text-sm text-gray-400 mt-1 mb-4">
          Upload a chat log from another platform. The AI engine will automatically format your dialogue and actions to match our system standards before importing.
        </p>

        {/* Example Formatting Guide */}
        <div className="bg-[#111115] border border-[#2A2A35] rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Info size={14} className="text-sky-400" />
            Expected Chat Format Example
          </h3>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Your file (.txt, .pdf, .docx) should clearly separate speakers using a colon (<strong>Name:</strong>) or place the speaker name on a standalone line (common in PDFs). We also support extracting italicized text from rich documents.<br/><br/>
            <strong>Important Tips for Best Results:</strong><br/>
            1. <strong className="text-amber-400">Match the Name:</strong> Before importing, create (or select) a character in the app with the <em>exact same name</em> as the AI character in your import document to help the system automatically align their dialogue.<br/>
            2. <strong className="text-amber-400">Consolidate Memories:</strong> After a successful import, open <strong>MemPalace</strong> and run a <em>Manual Consolidate Chat</em> so the AI can extract memories and bonds from your newly imported history.
          </p>
          <div className="bg-[#0A0A0C] border border-[#202028] p-3 rounded-lg font-mono text-[11px] text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
            {`User: Hello! I'm here to talk.
AI Character: *smiles warmly* "It is great to see you again."

Or implicitly (common in PDF/DOCX where names sit alone above text blocks):

Andrew
*I yawn*

Daria
*I am leaning against a row of lockers, one hand on my hip...*
No way, Chloe! Did he actually try to apologize via text?`}
          </div>
        </div>
      </div>

      <div className="bg-[#121216] border border-[#252530] rounded-xl p-5 space-y-5 shadow-md">
        
        {/* File Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">1. Select Chat File (.txt, .pdf, .docx)</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-[#1A1A22] hover:bg-[#202028] border border-[#2A2A35] rounded-lg cursor-pointer transition-colors text-sm text-gray-200">
              <FileText size={16} className="text-sky-400" />
              <span>{file ? file.name : "Browse Files..."}</span>
              <input 
                type="file" 
                accept=".txt,.log,.pdf,.docx" 
                onChange={handleFileUpload} 
                className="hidden"
              />
            </label>
            {messages.length > 0 && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} />
                Parsed {messages.length} messages
              </span>
            )}
          </div>
        </div>

        {/* Configuration */}
        {speakers.length > 0 && messages.length > 0 && (
          <div className="space-y-5 pt-5 border-t border-[#252530]">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">2. Map File Speakers</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#16161C] border border-[#22222A] p-3 rounded-lg">
                  <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Speaker playing as User Persona
                  </label>
                  <select 
                    value={userSpeaker} 
                    onChange={e => setUserSpeaker(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A35] focus:border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 outline-none"
                  >
                    <option value="">Select Speaker...</option>
                    {speakers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-[#16161C] border border-[#22222A] p-3 rounded-lg">
                  <label className="block text-[11px] text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Speaker playing as Character
                  </label>
                  <select 
                    value={charSpeaker} 
                    onChange={e => setCharSpeaker(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A35] focus:border-amber-500/50 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 outline-none"
                  >
                    <option value="">Select Speaker...</option>
                    {speakers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">3. Select Destination</label>
              <div className="bg-[#16161C] border border-[#22222A] p-3 rounded-lg">
                 <label className="block text-[11px] text-gray-400 mb-1.5">
                    Import this chat into which character?
                 </label>
                 <select 
                  value={destCharacterId} 
                  onChange={e => setDestCharacterId(e.target.value)}
                  className="w-full bg-[#111114] border border-[#2A2A35] focus:border-amber-500/50 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 outline-none"
                >
                  <option value="">Select Character...</option>
                  {personalities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">4. Formatting Rules</label>
              <div className="bg-[#16161C] border border-[#22222A] p-3 rounded-lg">
                 <label className="block text-[11px] text-gray-400 mb-1.5">
                    When text has no quotes or asterisks, assume it is:
                 </label>
                 <select 
                  value={unformattedDefault} 
                  onChange={e => setUnformattedDefault(e.target.value as any)}
                  className="w-full bg-[#111114] border border-[#2A2A35] focus:border-amber-500/50 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 outline-none"
                >
                  <option value="dialogue">Spoken Dialogue ("...")</option>
                  <option value="action">Action / Thought (*...*)</option>
                </select>
              </div>
            </div>

            {/* Warning & Action */}
            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  <strong>Warning:</strong> Importing will completely overwrite the existing chat history for the selected character. The internal parsing engine will automatically format the text into strict dialogue (" ") and action (* *) format before saving.
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={isProcessing || !destCharacterId || !userSpeaker || !charSpeaker}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                {isProcessing ? "Parsing & Importing..." : "Start Local Parse & Import"}
              </button>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {(status || importSuccess) && (
          <div className={`p-4 rounded-xl border ${importSuccess ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#16161C] border-[#2A2A35] text-gray-300'}`}>
            <div className="flex flex-col items-center justify-center space-y-2">
              {importSuccess ? (
                <>
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  <span className="font-semibold text-sm">{status}</span>
                  <span className="text-xs text-emerald-500/80">You can now navigate back to Chat and select your character.</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium animate-pulse">{status}</span>
                  {progress > 0 && progress < 100 && (
                    <div className="w-full bg-[#202028] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-1.5 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
