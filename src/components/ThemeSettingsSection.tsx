import React from 'react';
import { ThemeSettings } from '../types';
import { Palette, MessageSquare, PaintBucket, Eye } from 'lucide-react';

interface Props {
  themeSettings: ThemeSettings;
  onUpdate: (theme: Partial<ThemeSettings>) => void;
}

export function ThemeSettingsSection({ themeSettings, onUpdate }: Props) {
  if (!themeSettings) return <div>Loading themes...</div>;

  const handleChange = (key: keyof ThemeSettings, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-[#2A2A2E] pb-4">
        <Palette className="text-amber-400" size={24} />
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Theme & UI</h2>
          <p className="text-xs text-gray-400">Customize the appearance of the chat interface.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Presets */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <PaintBucket size={16} className="text-amber-400/70" />
            Theme Presets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'default', name: 'Default Dark' },
              { id: 'cyberpunk', name: 'Cyberpunk' },
              { id: 'light', name: 'Clean Light' },
              { id: 'matrix', name: 'Matrix' },
              { id: 'fantasy', name: 'Parchment' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  handleChange('activePreset', preset.id);
                  // Quick mock applying presets
                  if (preset.id === 'cyberpunk') {
                    onUpdate({ activePreset: preset.id, accentColor: '#f0f', chatBackgroundColor: '#050014', userBubbleColor: '#2d0036', botBubbleColor: '#001a33', userTextColor: '#ff00ff', botTextColor: '#00ffff' });
                  } else if (preset.id === 'matrix') {
                    onUpdate({ activePreset: preset.id, accentColor: '#0f0', chatBackgroundColor: '#000000', userBubbleColor: '#002200', botBubbleColor: '#001100', userTextColor: '#0f0', botTextColor: '#00ff00', systemTextColor: '#00aa00' });
                  } else if (preset.id === 'light') {
                     onUpdate({ activePreset: preset.id, accentColor: '#3b82f6', chatBackgroundColor: '#f3f4f6', userBubbleColor: '#e5e7eb', botBubbleColor: '#ffffff', userTextColor: '#111827', botTextColor: '#111827', systemTextColor: '#6b7280' });
                  } else if (preset.id === 'fantasy') {
                     onUpdate({ activePreset: preset.id, accentColor: '#b45309', chatBackgroundColor: '#fef3c7', userBubbleColor: '#fde68a', botBubbleColor: '#fffbeb', userTextColor: '#78350f', botTextColor: '#451a03', systemTextColor: '#92400e' });
                  } else {
                    onUpdate({ activePreset: 'default', accentColor: '#f59e0b', chatBackgroundColor: '#0a0a0c', userBubbleColor: '#181824', botBubbleColor: '#121217', userTextColor: '#f3f4f6', botTextColor: '#f3f4f6', systemTextColor: '#9ca3af' });
                  }
                }}
                className={`p-2 rounded-lg text-xs font-medium border ${themeSettings.activePreset === preset.id ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-[#2A2A2E] bg-[#18181D] text-gray-400 hover:text-gray-200'}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Message Bubbles */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <MessageSquare size={16} className="text-amber-400/70" />
            Message Bubbles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#131318] border border-[#2A2A2E] p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">User Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-gray-300">
                  Bubble Color
                  <input type="color" value={themeSettings.userBubbleColor} onChange={(e) => handleChange('userBubbleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                </label>
                <label className="flex items-center justify-between text-xs text-gray-300">
                  Text Color
                  <input type="color" value={themeSettings.userTextColor} onChange={(e) => handleChange('userTextColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                </label>
              </div>
            </div>
            
            <div className="bg-[#131318] border border-[#2A2A2E] p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Character Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-gray-300">
                  Bubble Color
                  <input type="color" value={themeSettings.botBubbleColor} onChange={(e) => handleChange('botBubbleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                </label>
                <label className="flex items-center justify-between text-xs text-gray-300">
                  Text Color
                  <input type="color" value={themeSettings.botTextColor} onChange={(e) => handleChange('botTextColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                </label>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-400">Bubble Radius</span>
              <select 
                value={themeSettings.bubbleRadius} 
                onChange={(e) => handleChange('bubbleRadius', e.target.value)}
                className="w-full bg-[#18181D] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                <option value="sharp">Sharp (0px)</option>
                <option value="rounded">Rounded (12px)</option>
                <option value="pill">Pill (24px)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-400">Message Padding</span>
              <select 
                value={themeSettings.messagePadding} 
                onChange={(e) => handleChange('messagePadding', e.target.value)}
                className="w-full bg-[#18181D] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>
          </div>
        </div>

        {/* Dynamic & Contextual Elements */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Eye size={16} className="text-amber-400/70" />
            Dynamic Elements
          </h3>
          <div className="bg-[#131318] border border-[#2A2A2E] p-4 rounded-xl space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center justify-between text-xs text-gray-300 gap-4 flex-1 min-w-[150px]">
                Global Accent Color
                <input type="color" value={themeSettings.accentColor} onChange={(e) => handleChange('accentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
              </label>
              <label className="flex items-center justify-between text-xs text-gray-300 gap-4 flex-1 min-w-[150px]">
                System/Narrative Text
                <input type="color" value={themeSettings.systemTextColor} onChange={(e) => handleChange('systemTextColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
              </label>
            </div>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-400">Chat Container Background</span>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={themeSettings.chatBackgroundColor} 
                  onChange={(e) => handleChange('chatBackgroundColor', e.target.value)} 
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 shrink-0" 
                />
                <input 
                  type="text" 
                  value={themeSettings.chatBackgroundColor}
                  onChange={(e) => handleChange('chatBackgroundColor', e.target.value)}
                  className="flex-1 bg-[#18181D] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-100"
                  placeholder="#0a0a0c or rgba(0,0,0,0.5)"
                />
              </div>
            </label>
          </div>
        </div>
        
      </div>
    </div>
  );
}
