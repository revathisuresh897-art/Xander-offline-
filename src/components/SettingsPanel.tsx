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
}

export default function SettingsPanel({ isOpen, onClose, onClearHistory, onClearReminders }: SettingsPanelProps) {
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
            className="fixed top-0 right-0 h-full w-full max-w-md bg-xander-bg border-l border-xander-accent/20 z-[101] flex flex-col shadow-[-10px_0_30px_rgba(0,240,255,0.1)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-xander-accent/20 bg-black/40 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-xander-accent/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full bg-xander-accent/10 border border-xander-accent/30 flex items-center justify-center neon-glow">
                  <Terminal className="w-4 h-4 text-xander-accent" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-white neon-text">System Settings</h2>
                  <p className="text-[10px] font-mono text-xander-accent/60 uppercase tracking-widest">Xander OS v4.2.0</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-xander-accent/10 transition-colors text-white/60 hover:text-xander-accent relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 relative">
              <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
              
              {/* Local AI Core */}
              <section className="space-y-4 relative z-10">
                <div className="flex items-center gap-2 text-xander-accent mb-4 border-b border-xander-accent/20 pb-2">
                  <Cpu className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest neon-text">Local AI Core (Offline Mode)</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-black/60 border border-xander-accent/20 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
                    <p className="text-xs font-mono text-white/60 mb-3">
                      Download the local AI model to enable full conversation capabilities when offline. This requires ~800MB of storage.
                    </p>
                    
                    <button
                      onClick={handleDownloadModel}
                      disabled={isDownloading || isLocalModelReady}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-3 rounded-lg font-mono text-xs uppercase tracking-wider transition-all",
                        isLocalModelReady 
                          ? "bg-xander-accent/20 text-xander-accent border border-xander-accent/30 neon-glow" 
                          : isDownloading
                            ? "bg-white/5 text-white/50 border border-white/10 cursor-not-allowed"
                            : "bg-xander-accent/10 hover:bg-xander-accent/20 text-xander-accent border border-xander-accent/30 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      )}
                    >
                      {isLocalModelReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Local Core Ready
                        </>
                      ) : isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-xander-accent/30 border-t-xander-accent rounded-full animate-spin" />
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
                      <p className="mt-3 text-[10px] font-mono text-xander-accent/60 break-words">
                        {localModelProgress}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Data Management */}
              <section className="space-y-4 relative z-10">
                <div className="flex items-center gap-2 text-xander-accent mb-4 border-b border-xander-accent/20 pb-2">
                  <Shield className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest neon-text">Data Management</h3>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                        onClearHistory();
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-black/60 border border-xander-accent/20 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all group backdrop-blur-md"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs uppercase tracking-wider text-white group-hover:text-red-500">Purge Chat Logs</span>
                      <span className="text-[10px] text-white/40 group-hover:text-red-500/60 font-mono">Delete all conversation history</span>
                    </div>
                    <Trash2 className="w-4 h-4 text-white/50 group-hover:text-red-500" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all active reminders?')) {
                        onClearReminders();
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-black/60 border border-xander-accent/20 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all group backdrop-blur-md"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs uppercase tracking-wider text-white group-hover:text-red-500">Clear Reminders</span>
                      <span className="text-[10px] text-white/40 group-hover:text-red-500/60 font-mono">Delete all pending notifications</span>
                    </div>
                    <Trash2 className="w-4 h-4 text-white/50 group-hover:text-red-500" />
                  </button>
                </div>
              </section>

              {/* System Info */}
              <section className="space-y-4 relative z-10">
                <div className="flex items-center gap-2 text-xander-accent mb-4 border-b border-xander-accent/20 pb-2">
                  <Cpu className="w-4 h-4" />
                  <h3 className="font-mono text-xs uppercase tracking-widest neon-text">System Diagnostics</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-black/60 border border-xander-accent/20 backdrop-blur-md">
                    <p className="text-[10px] font-mono text-xander-accent/60 uppercase tracking-widest mb-1">Core Status</p>
                    <p className="font-mono text-xs text-xander-accent uppercase tracking-wider neon-text">Optimal</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/60 border border-xander-accent/20 backdrop-blur-md">
                    <p className="text-[10px] font-mono text-xander-accent/60 uppercase tracking-widest mb-1">Latency</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">12ms</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/60 border border-xander-accent/20 backdrop-blur-md">
                    <p className="text-[10px] font-mono text-xander-accent/60 uppercase tracking-widest mb-1">Encryption</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">AES-256</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/60 border border-xander-accent/20 backdrop-blur-md">
                    <p className="text-[10px] font-mono text-xander-accent/60 uppercase tracking-widest mb-1">Uplink</p>
                    <p className="font-mono text-xs text-white uppercase tracking-wider">Secured</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-xander-accent/20 bg-black/40 backdrop-blur-xl relative z-10">
              <p className="text-[10px] font-mono text-xander-accent/40 uppercase tracking-[0.2em] text-center">
                Engineered by Mr. Swaastik.S
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
