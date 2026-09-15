import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Server,
  Monitor,
  Cpu,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";

type SupportedServer = "jan" | "ollama" | "lmstudio";
type OperatingSystem = "linux" | "windows";

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = "bash" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group bg-[#09090C] rounded-lg border border-[#24242C] overflow-hidden my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#101015] border-b border-[#1E1E26] text-[10px] text-gray-400 font-mono select-none">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-amber-400 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap select-text">
        {code}
      </pre>
    </div>
  );
}

export function LocalServerSetupGuide() {
  const [selectedServer, setSelectedServer] = useState<SupportedServer>("jan");
  const [selectedOS, setSelectedOS] = useState<OperatingSystem>("linux");
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  return (
    <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242A] pb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
            <Server size={16} className="text-amber-400" />
            Local Inference Server Setup Instructions
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Complete step-by-step installation and configuration guide for Jan AI, Ollama, and LM Studio.
          </p>
        </div>

        {/* Operating System Selector */}
        <div className="flex items-center bg-[#17171D] p-0.5 rounded-lg border border-[#2C2C35] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSelectedOS("linux")}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              selectedOS === "linux"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🐧</span>
            <span>Linux</span>
          </button>
          <button
            onClick={() => setSelectedOS("windows")}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              selectedOS === "windows"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🪟</span>
            <span>Windows</span>
          </button>
        </div>
      </div>

      {/* Server Selector Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setSelectedServer("jan")}
          className={`p-2.5 rounded-lg text-left transition-all border ${
            selectedServer === "jan"
              ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
              : "bg-[#16161B] hover:bg-[#1C1C22] border-[#25252D] text-gray-400 hover:text-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-amber-300">Jan AI</span>
            <span className="text-[10px] font-mono text-gray-400 bg-[#0E0E12] px-1.5 py-0.5 rounded border border-[#25252E]">
              :1337
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">Built-in local server (Nitro engine)</p>
        </button>

        <button
          onClick={() => setSelectedServer("ollama")}
          className={`p-2.5 rounded-lg text-left transition-all border ${
            selectedServer === "ollama"
              ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
              : "bg-[#16161B] hover:bg-[#1C1C22] border-[#25252D] text-gray-400 hover:text-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-amber-300">Ollama</span>
            <span className="text-[10px] font-mono text-gray-400 bg-[#0E0E12] px-1.5 py-0.5 rounded border border-[#25252E]">
              :11434
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">Native background service & CLI</p>
        </button>

        <button
          onClick={() => setSelectedServer("lmstudio")}
          className={`p-2.5 rounded-lg text-left transition-all border ${
            selectedServer === "lmstudio"
              ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
              : "bg-[#16161B] hover:bg-[#1C1C22] border-[#25252D] text-gray-400 hover:text-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-amber-300">LM Studio</span>
            <span className="text-[10px] font-mono text-gray-400 bg-[#0E0E12] px-1.5 py-0.5 rounded border border-[#25252E]">
              :1234
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">GGUF models with GPU acceleration</p>
        </button>
      </div>

      {/* Guide Content Display */}
      <div className="bg-[#0E0E12] border border-[#24242A] rounded-xl p-4 sm:p-5 space-y-6">
        {/* ========================================================================= */}
        {/* 1. JAN AI INSTRUCTIONS */}
        {/* ========================================================================= */}
        {selectedServer === "jan" && (
          <div className="space-y-5 animate-in fade-in duration-100">
            <div className="flex items-start justify-between gap-4 border-b border-[#1E1E24] pb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <span>Setting up Jan AI on {selectedOS === "linux" ? "Linux" : "Windows"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181820] text-amber-400 border border-[#2C2C36]">
                    http://127.0.0.1:1337/v1
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Jan is an open-source ChatGPT alternative that runs 100% offline and provides an OpenAI-compliant local API server.
                </p>
              </div>
              <a
                href="https://jan.ai"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-[#17171E] hover:bg-[#202028] px-2.5 py-1.5 rounded-lg border border-[#2B2B36] transition-colors"
              >
                <span>jan.ai</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {selectedOS === "linux" ? (
              <div className="space-y-4 text-xs">
                {/* Linux Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Download and Install Jan on Linux</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Download the latest <code>.deb</code> package (for Ubuntu/Debian) or <code>.AppImage</code> from Jan’s website or GitHub releases:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`# For Ubuntu / Debian (.deb package):
sudo dpkg -i jan-linux-x86_64-*.deb
sudo apt-get install -f   # resolve dependencies if needed

# Or using the portable AppImage:
chmod +x jan-linux-x86_64-*.AppImage
./jan-linux-x86_64-*.AppImage`}
                      language="bash"
                    />
                  </div>
                </div>

                {/* Linux Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Download an Open-Weights Model in Jan</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Open Jan, navigate to the <strong>Hub</strong> tab on the left navigation bar, and download an instruction-tuned model. Recommended: <strong>Llama 3.2 3B</strong>, <strong>Llama 3.1 8B Instruct</strong>, or <strong>Mistral 7B Instruct</strong>.
                  </p>
                </div>

                {/* Linux Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Enable the Local API Server in Jan</span>
                  </div>
                  <div className="pl-7 space-y-2 text-[11px] text-gray-300">
                    <ul className="list-disc pl-4 space-y-1 text-gray-400">
                      <li>Click the <strong>Settings (gear icon)</strong> at the bottom-left corner of Jan.</li>
                      <li>Select <strong>Local API Server</strong> (or <strong>Advanced Settings</strong>).</li>
                      <li>Verify <strong>Server Port</strong> is set to <code className="text-amber-300 font-mono">1337</code> (default).</li>
                      <li>Set <strong>Server Host</strong> to <code className="text-amber-300 font-mono">127.0.0.1</code> (or <code className="text-amber-300 font-mono">0.0.0.0</code> if running inside Docker/WSL2).</li>
                      <li>Toggle <strong>Start Server</strong> to <strong>ON</strong>.</li>
                    </ul>
                  </div>
                </div>

                {/* Linux Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Test and Verify Endpoint</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Run this curl command in your terminal to verify Jan's local server is responding:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`curl -s http://127.0.0.1:1337/v1/models | jq .`}
                      language="bash"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Windows Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Download and Run Jan Installer on Windows</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Download <code>jan-win-x64-*.exe</code> from <a href="https://jan.ai" target="_blank" rel="noreferrer" className="text-amber-400 underline">jan.ai</a>. Run the installer and launch Jan.
                  </p>
                </div>

                {/* Windows Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Download an AI Model</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Click the <strong>Hub</strong> icon on the left bar. Pick a model suited for your GPU VRAM:
                  </p>
                  <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="p-2.5 rounded bg-[#15151B] border border-[#22222A]">
                      <span className="font-semibold text-gray-200 block">4GB - 6GB VRAM:</span>
                      <span className="text-gray-400 text-[11px]">Llama 3.2 3B Instruct or Phi-3.5 Mini</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#15151B] border border-[#22222A]">
                      <span className="font-semibold text-gray-200 block">8GB+ VRAM:</span>
                      <span className="text-gray-400 text-[11px]">Meta Llama 3.1 8B Instruct (Q4_K_M)</span>
                    </div>
                  </div>
                </div>

                {/* Windows Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Start Local API Server in Jan</span>
                  </div>
                  <div className="pl-7 space-y-1 text-[11px] text-gray-400">
                    <p>1. Open <strong>Settings</strong> (gear icon bottom-left).</p>
                    <p>2. Select <strong>Local API Server</strong> from the settings menu.</p>
                    <p>3. Confirm <strong>Port</strong> is <code className="text-amber-300 font-mono">1337</code> and Host is <code className="text-amber-300 font-mono">127.0.0.1</code>.</p>
                    <p>4. Toggle <strong>Start Server</strong> ON.</p>
                    <p>5. If Windows Defender Firewall requests permission, check <em>Private networks</em> and click <strong>Allow access</strong>.</p>
                  </div>
                </div>

                {/* Windows Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Verify with PowerShell</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Open PowerShell or Command Prompt and test the connection:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`Invoke-RestMethod -Uri "http://127.0.0.1:1337/v1/models"`}
                      language="powershell"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. OLLAMA INSTRUCTIONS */}
        {/* ========================================================================= */}
        {selectedServer === "ollama" && (
          <div className="space-y-5 animate-in fade-in duration-100">
            <div className="flex items-start justify-between gap-4 border-b border-[#1E1E24] pb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <span>Setting up Ollama on {selectedOS === "linux" ? "Linux" : "Windows"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181820] text-amber-400 border border-[#2C2C36]">
                    http://127.0.0.1:11434/v1
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ollama runs as a fast system service supporting NVIDIA CUDA, AMD ROCm, and Apple Metal with native OpenAI compatibility.
                </p>
              </div>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-[#17171E] hover:bg-[#202028] px-2.5 py-1.5 rounded-lg border border-[#2B2B36] transition-colors"
              >
                <span>ollama.com</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {selectedOS === "linux" ? (
              <div className="space-y-4 text-xs">
                {/* Linux Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Install Ollama with One Command</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Run the official install script which sets up the binary and configures the systemd background daemon automatically:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`curl -fsSL https://ollama.com/install.sh | sh`}
                      language="bash"
                    />
                  </div>
                </div>

                {/* Linux Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Pull Recommended Models</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Pull open-source instruction & chat models directly to your machine:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`# Download Meta Llama 3.1 8B (Recommended for general chat)
ollama pull llama3.1:8b

# Or Mistral 7B:
ollama pull mistral

# Or smaller 3B model for low-resource environments:
ollama pull llama3.2:3b`}
                      language="bash"
                    />
                  </div>
                </div>

                {/* Linux Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Configure Host & CORS Permissions (Crucial for Web Access)</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    If accessing Ollama from across network interfaces or web browsers, configure the systemd service environment:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`# Edit systemd service configuration:
sudo systemctl edit ollama.service

# Add these lines inside the editor:
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"

# Reload systemd and restart Ollama:
sudo systemctl daemon-reload
sudo systemctl restart ollama`}
                      language="bash"
                    />
                  </div>
                </div>

                {/* Linux Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Test Ollama API</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Check whether your downloaded models are active on the local server:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`curl -s http://127.0.0.1:11434/api/tags | jq .`}
                      language="bash"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Windows Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Download and Run Ollama for Windows</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Download <code>OllamaSetup.exe</code> from <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer" className="text-amber-400 underline">ollama.com/download/windows</a>. Install and it will run in the Windows system tray.
                  </p>
                </div>

                {/* Windows Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Pull Models using PowerShell or Terminal</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Open PowerShell or Windows Terminal and pull your model:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`# Pull Llama 3.1 8B (high accuracy):
ollama pull llama3.1

# Or run interactively to verify:
ollama run llama3.1 "Hello, are you ready?"`}
                      language="powershell"
                    />
                  </div>
                </div>

                {/* Windows Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Enable CORS & Network Binding (Optional / Recommended)</span>
                  </div>
                  <div className="pl-7 space-y-1 text-[11px] text-gray-400">
                    <p>If you encounter CORS errors or need to connect from WSL2/browser:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Search Windows Start menu for <strong>"Environment Variables"</strong>.</li>
                      <li>Click <strong>Edit the system environment variables</strong>.</li>
                      <li>Under <strong>User variables</strong>, click <strong>New...</strong>:</li>
                      <li className="font-mono text-amber-300">Variable name: OLLAMA_ORIGINS | Variable value: *</li>
                      <li className="font-mono text-amber-300">Variable name: OLLAMA_HOST | Variable value: 0.0.0.0:11434</li>
                      <li>Quit Ollama from the Windows Taskbar Notification Tray and restart it.</li>
                    </ol>
                  </div>
                </div>

                {/* Windows Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Verify Connection in PowerShell</span>
                  </div>
                  <div className="pl-7">
                    <CodeBlock
                      code={`Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" | Select-Object -ExpandProperty models`}
                      language="powershell"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. LM STUDIO INSTRUCTIONS */}
        {/* ========================================================================= */}
        {selectedServer === "lmstudio" && (
          <div className="space-y-5 animate-in fade-in duration-100">
            <div className="flex items-start justify-between gap-4 border-b border-[#1E1E24] pb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <span>Setting up LM Studio on {selectedOS === "linux" ? "Linux" : "Windows"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181820] text-amber-400 border border-[#2C2C36]">
                    http://127.0.0.1:1234/v1
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  LM Studio provides a GUI for discovering, downloading, and serving GGUF models with fine-grained GPU layer offloading.
                </p>
              </div>
              <a
                href="https://lmstudio.ai"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-[#17171E] hover:bg-[#202028] px-2.5 py-1.5 rounded-lg border border-[#2B2B36] transition-colors"
              >
                <span>lmstudio.ai</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {selectedOS === "linux" ? (
              <div className="space-y-4 text-xs">
                {/* Linux Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Download AppImage on Linux</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Download the Linux <code>.AppImage</code> package from <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="text-amber-400 underline">lmstudio.ai</a>:
                  </p>
                  <div className="pl-7">
                    <CodeBlock
                      code={`# Make the downloaded AppImage executable:
chmod +x LM_Studio-*.AppImage
./LM_Studio-*.AppImage`}
                      language="bash"
                    />
                  </div>
                </div>

                {/* Linux Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Search & Download a GGUF Model</span>
                  </div>
                  <div className="pl-7 space-y-1 text-[11px] text-gray-400">
                    <p>1. In LM Studio, click the <strong>Search icon (magnifying glass)</strong> on the left bar.</p>
                    <p>2. Search for models like <code className="text-amber-300 font-mono">llama-3.1-8b-instruct</code>, <code className="text-amber-300 font-mono">hermes-3-llama-3.1-8b</code>, or <code className="text-amber-300 font-mono">qwen2.5</code>.</p>
                    <p>3. Select the <strong>Q4_K_M</strong> or <strong>Q5_K_M</strong> quant file for the best balance of speed and quality, then click <strong>Download</strong>.</p>
                  </div>
                </div>

                {/* Linux Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Configure & Start the Local Inference Server</span>
                  </div>
                  <div className="pl-7 space-y-1.5 text-[11px] text-gray-300">
                    <p className="text-gray-400">
                      Switch to the <strong>Local Server / Developer tab</strong> (indicated by the <code className="text-amber-300 font-mono">&lt;-&gt;</code> double-arrow icon on the left navigation bar):
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-400">
                      <li>At the top of the screen, select your downloaded model from the dropdown to load it into memory.</li>
                      <li>In the right-hand panel, set <strong>Port</strong> to <code className="text-amber-300 font-mono">1234</code>.</li>
                      <li>Enable <strong>CORS (Cross-Origin Resource Sharing)</strong>: turn this switch <strong>ON</strong>.</li>
                      <li>Enable <strong>GPU Offload</strong> (set sliders to max layers to utilize your NVIDIA or AMD GPU).</li>
                      <li>Click the green <strong>Start Server</strong> button.</li>
                    </ul>
                  </div>
                </div>

                {/* Linux Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Test Local Server</span>
                  </div>
                  <div className="pl-7">
                    <CodeBlock
                      code={`curl -s http://127.0.0.1:1234/v1/models | jq .`}
                      language="bash"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Windows Step 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Install LM Studio for Windows</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Download the Windows installer from <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="text-amber-400 underline">lmstudio.ai</a>. Run setup and launch the application.
                  </p>
                </div>

                {/* Windows Step 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Download GGUF Weights</span>
                  </div>
                  <p className="text-gray-400 pl-7 text-[11px]">
                    Click the <strong>Search</strong> tab (magnifying glass) on the left sidebar. Recommended models for roleplay and conversation:
                  </p>
                  <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="p-2.5 rounded bg-[#15151B] border border-[#22222A]">
                      <span className="font-semibold text-gray-200 block">Llama 3.1 8B Instruct</span>
                      <span className="text-gray-400 text-[11px]">Fast, highly coherent character dialogue (Q4_K_M ~4.9 GB)</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#15151B] border border-[#22222A]">
                      <span className="font-semibold text-gray-200 block">Hermes 3 Llama 3.1 8B</span>
                      <span className="text-gray-400 text-[11px]">Superb instruction following and multi-turn persona memory</span>
                    </div>
                  </div>
                </div>

                {/* Windows Step 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Start Developer Local Server</span>
                  </div>
                  <div className="pl-7 space-y-1.5 text-[11px] text-gray-400">
                    <p>1. Click the <strong>Developer / Local Server</strong> icon (<code className="text-amber-300 font-mono">&lt;-&gt;</code>) on the left sidebar.</p>
                    <p>2. Select the model from the top dropdown to load it into memory.</p>
                    <p>3. In Server Configuration on the right panel:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Set Port to <code className="text-amber-300 font-mono">1234</code>.</li>
                      <li>Toggle <strong>CORS</strong> to <strong>ON</strong> (required for web connections).</li>
                      <li>Under GPU Acceleration, enable <strong>GPU Offload (CUDA/Vulkan)</strong> to use your graphics card.</li>
                    </ul>
                    <p>4. Click <strong>Start Server</strong>. Accept any Windows Firewall prompts.</p>
                  </div>
                </div>

                {/* Windows Step 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Verify in PowerShell</span>
                  </div>
                  <div className="pl-7">
                    <CodeBlock
                      code={`Invoke-RestMethod -Uri "http://127.0.0.1:1234/v1/models"`}
                      language="powershell"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Integration Note Banner */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
          <Zap size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">How this App Detects Your Local Server</p>
            <p className="text-[11px] text-amber-200/80">
              Once your local server is running, scroll up and click the <strong>"Scan Local Ports"</strong> button or click <strong>"Test"</strong> on any configured server entry. The app will automatically query the models and add them to your <strong>Active Inference Model</strong> dropdown!
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting & Hardware Advice Collapsible */}
      <div className="border border-[#25252C] rounded-xl overflow-hidden bg-[#101014]">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#15151B] transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <HelpCircle size={14} className="text-amber-400" />
            <span>Troubleshooting, CORS & Hardware VRAM Recommendations</span>
          </div>
          <div className="text-gray-500">
            {showTroubleshooting ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {showTroubleshooting && (
          <div className="p-4 border-t border-[#222228] space-y-3.5 text-xs text-gray-400 animate-in fade-in duration-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#202026] space-y-1">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-400" />
                  ECONNREFUSED / Connection Failed
                </span>
                <p className="text-[11px]">
                  Ensure the local server is actually running. Verify the port in your server matches the port configured in this app (1337 for Jan, 11434 for Ollama, 1234 for LM Studio).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#202026] space-y-1">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  CORS (Cross-Origin Resource Sharing)
                </span>
                <p className="text-[11px]">
                  In LM Studio, toggle <strong>CORS: ON</strong>. For Ollama, set environment variable <code>OLLAMA_ORIGINS="*"</code> so your web browser or container can communicate with the inference port.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#202026] space-y-1">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <Cpu size={12} className="text-indigo-400" />
                  Hardware & VRAM Guide
                </span>
                <p className="text-[11px]">
                  <strong>7B/8B Q4 models</strong> require ~5-6 GB VRAM. If you run out of GPU memory, reduce context window tokens (e.g. from 8192 to 4096) or offload fewer layers to GPU.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0C0C10] border border-[#202026] space-y-1">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <Monitor size={12} className="text-cyan-400" />
                  WSL2 & Docker Host Binding
                </span>
                <p className="text-[11px]">
                  When connecting across WSL2 or containerized apps, bind the server host to <code>0.0.0.0</code> instead of <code>127.0.0.1</code>, or use <code>http://host.docker.internal:[PORT]</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
