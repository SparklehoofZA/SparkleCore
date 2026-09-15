import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add isCustomModel state
content = content.replace(
  'const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);',
  'const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);\n  const [isCustomModel, setIsCustomModel] = useState(false);'
)

# Build the new dropdown UI
new_ui = """              <div className="flex gap-2 mb-2">
                {isCustomModel ? (
                  <div className="relative w-full flex items-center">
                    <input 
                      value={selectedModel} 
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder="Enter custom model ID (e.g., ollama:llama3)"
                      className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded py-1.5 pl-2 pr-8 text-xs text-gray-300 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                    <button 
                      onClick={() => {
                        setIsCustomModel(false);
                        setSelectedModel("gemini-3.7-flash");
                      }} 
                      className="absolute right-2 text-gray-500 hover:text-white bg-[#2A2A2E] hover:bg-[#3A3A3F] rounded-full p-0.5 transition-colors"
                      title="Back to list"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={
                      localModels.some(m => m.id === selectedModel) || 
                      ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"].includes(selectedModel) 
                        ? selectedModel 
                        : "custom"
                    }
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomModel(true);
                        setSelectedModel("");
                      } else {
                        setSelectedModel(e.target.value);
                      }
                    }}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded py-1.5 px-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500/50 font-mono"
                  >
                    <optgroup label="Google Gemini">
                      <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
                      <option value="gemini-flash-latest">Gemini Flash Latest</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                    </optgroup>
                    
                    {localModels.length > 0 && (
                      <optgroup label="Discovered Local Servers">
                        {localModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.serverName || "Local"}: {m.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Manual Entry">
                      <option value="custom">Enter Custom Model ID...</option>
                    </optgroup>
                  </select>
                )}
                <button"""

# Extract the old UI and replace it
# The old UI starts with <div className="flex gap-2 mb-2"> and ends before </div>\n              <datalist id="models-list">

start_str = '<div className="flex gap-2 mb-2">'
end_str = '</datalist>'
start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    # We also need to keep the Servers button, so let's match the whole block carefully.
    
    # We will replace from start_str to end_str
    
    # Actually, we can use regex to replace everything between <div className="flex gap-2 mb-2"> and </datalist>
    import re
    # Find the chunk
    pattern = re.compile(r'<div className="flex gap-2 mb-2">.*?</datalist>', re.DOTALL)
    match = pattern.search(content)
    
    if match:
        old_chunk = match.group(0)
        # Re-construct the end of new_ui by grabbing the button from old_chunk
        button_start = old_chunk.find('<button')
        button_end = old_chunk.find('</button>', button_start) + len('</button>')
        button_html = old_chunk[button_start:button_end]
        
        final_ui = new_ui + '\n' + button_html + '\n              </div>'
        
        new_content = content[:match.start()] + final_ui + content[match.end():]
        with open('src/App.tsx', 'w') as f:
            f.write(new_content)
        print("Patched successfully")
    else:
        print("Could not find matching block")
else:
    print("Could not find start/end")

