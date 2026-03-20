import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Volume2, Shield, Cpu, Terminal, Download, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { initLocalModel, getLocalEngine, LOCAL_MODEL_ID } from '../services/localLLM';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  onClearReminders: () => void;
  localApiKey: string;
  setLocalApiKey: (key: string) => void;
}

export default function SettingsPanel({ isOpen, onClose, onClearHistory, onClearReminders, localApiKey, setLocalApiKey }: SettingsPanelProps) {
  const [localModelProgress, setLocalModelProgress] = useState<string>('');
  const [isLocalModelReady, setIsLocalModelReady] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (getLocalEngine()) {
      setIsLocalModelReady(true);
    }
  }, [isOpen]);

  const handleDownloadModel = async () => {
    if (isDownloading || isLocalModelReady) return;
    setIsDownloading(true);
    try {
      await initLocalModel((progress) => {
        setLocalModelProgress(progress.text);
      });
      setIsLocalModelReady(true);
      setLocalModelProgress('Local AI Core initialized successfully.');
    } catch (err: any) {
      setLocalModelProgress(`Error: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-black border-l border-white/10 z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 glass-panel">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-white">System Settings</h2>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Xander OS v4.2.0</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* API Key Configuration */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white/60 mb-4 border-b border-white/10 pb-2">
                  <Shield className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest">API Configuration</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs font-mono text-white/60 mb-3">
                      Gemini API Key (Required for AI Uplink)
                    </p>
                    <input
                      type="password"
                      placeholder="AI Studio API Key"
                      value={localApiKey}
                      onChange={(e) => {
                        setLocalApiKey(e.target.value);
                        localStorage.setItem('GEMINI_API_KEY', e.target.value);
                      }}
                      className="w-full p-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:border-xander-accent font-mono text-xs text-white placeholder:text-white/20 transition-colors"
                    />
                    <p className="mt-2 text-[10px] font-mono text-white/40">
                      Stored locally on your device.
                    </p>
                  </div>
                </div>
              </section>

              {/* Local AI Core */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white/60 mb-4 border-b border-white/10 pb-2">
                  <Cpu className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest">Local AI Core (Offline Mode)</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs font-mono text-white/60 mb-3">
                      Download the local AI model to enable full conversation capabilities when offline. This requires ~800MB of storage.
                    </p>
                    
                    <button
                      onClick={handleDownloadModel}
                      disabled={isDownloading || isLocalModelReady}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all",
                        isLocalModelReady 
                          ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                          : isDownloading
                            ? "bg-white/10 text-white/50 border border-white/10 cursor-not-allowed"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      )}
                    >
                      {isLocalModelReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Local Core Ready
                        </>
                      ) : isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download Local Model
                        </>
                      )}
                    </button>
                    
                    {localModelProgress && (
                      <p className="mt-3 text-[10px] font-mono text-white/40 break-words">
                        {localModelProgress}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Mobile App / APK */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white/60 mb-4 border-b border-white/10 pb-2">
                  <Download className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest">Mobile App (APK)</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs font-mono text-white/60 mb-3">
                      Xander OS is a Progressive Web App (PWA). You can install it on your Android device to use it exactly like a native APK.
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[8px] font-mono">1</span>
                        </div>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Open this site in Chrome on Android</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[8px] font-mono">2</span>
                        </div>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Tap the three dots (menu) in Chrome</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[8px] font-mono">3</span>
                        </div>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Select "Install App" or "Add to Home Screen"</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Trigger the PWA install prompt if available
                        const deferredPrompt = (window as any).deferredPrompt;
                        if (deferredPrompt) {
                          deferredPrompt.prompt();
                          deferredPrompt.userChoice.then((choiceResult: any) => {
                            if (choiceResult.outcome === 'accepted') {
                              console.log('User accepted the install prompt');
                            }
                            (window as any).deferredPrompt = null;
                          });
                        } else {
                          alert("To install: Tap your browser's menu (⋮) and select 'Install App' or 'Add to Home Screen'.");
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    >
                      <Download className="w-4 h-4" />
                      Install Xander OS
                    </button>
                  </div>
                </div>
              </section>

              {/* Data Management */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white/60 mb-4 border-b border-white/10 pb-2">
                  <Shield className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest">Data Management</h3>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                        onClearHistory();
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs uppercase tracking-wider">Purge Chat Logs</span>
                      <span className="text-[10px] text-white/40 group-hover:text-red-500/60 font-mono">Delete all conversation history</span>
                    </div>
                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all active reminders?')) {
                        onClearReminders();
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs uppercase tracking-wider">Clear Reminders</span>
                      <span className="text-[10px] text-white/40 group-hover:text-red-500/60 font-mono">Delete all pending notifications</span>
                    </div>
                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </button>
                </div>
              </section>

              {/* System Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white/60 mb-4 border-b border-white/10 pb-2">
                  <Cpu className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest">System Diagnostics</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Core Status</p>
                    <p className="font-mono text-xs text-green-400 uppercase tracking-wider">Optimal</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Latency</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">12ms</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Encryption</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">AES-256</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Uplink</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">Secured</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] text-center">
                Engineered by Mr. Swaastik.S
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
