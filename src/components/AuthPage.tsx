import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, AlertCircle, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthPageProps {
  onAuthorized: () => void;
}

export default function AuthPage({ onAuthorized }: AuthPageProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [authMode, setAuthMode] = useState<'pin' | 'apiKey'>('pin');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const CORRECT_PIN = '5456';
  const MASTER_API_KEY = process.env.XANDER_API_KEY || '';

  const handleInput = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  useEffect(() => {
    if (authMode === 'pin') {
      const enteredPin = pin.join('');
      if (enteredPin.length === 4) {
        if (enteredPin === CORRECT_PIN) {
          setIsSuccess(true);
          setTimeout(() => onAuthorized(), 800);
        } else {
          setError(true);
          setPin(['', '', '', '']);
          document.getElementById('pin-0')?.focus();
        }
      }
    }
  }, [pin, onAuthorized, authMode]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput === MASTER_API_KEY && MASTER_API_KEY !== '') {
      setIsSuccess(true);
      setTimeout(() => onAuthorized(), 800);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-xander-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-xander-accent/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-xander-accent/10 blur-[120px]" />
        <div className="absolute inset-0 noise-overlay mix-blend-overlay opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 md:p-12 rounded-[2.5rem] w-full max-w-md text-center neon-border relative z-10"
      >
        <div className="mb-8 flex flex-col items-center">
          <motion.div 
            animate={isSuccess ? { scale: [1, 1.2, 1], rotate: [0, 360] } : {}}
            className="w-20 h-20 rounded-3xl bg-xander-accent/10 flex items-center justify-center mb-6 border border-xander-accent/30 neon-glow"
          >
            {isSuccess ? (
              <Unlock className="w-10 h-10 text-xander-accent" />
            ) : (
              <Lock className="w-10 h-10 text-xander-accent" />
            )}
          </motion.div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-xander-accent/50" />
            <h1 className="text-xl font-mono font-bold tracking-[0.3em] text-white">XANDER SECURE</h1>
          </div>
          <p className="text-xander-muted text-xs font-mono uppercase tracking-widest">Identity Verification Required</p>
        </div>

        <div className="space-y-8">
          {authMode === 'pin' ? (
            <div className="flex justify-center gap-4">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleInput(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className={`w-14 h-18 text-center text-2xl font-mono bg-white/5 border rounded-2xl focus:outline-none transition-all ${
                    error ? 'border-red-500/50 text-red-500 animate-shake' : 
                    isSuccess ? 'border-xander-accent text-xander-accent' :
                    'border-white/10 text-white focus:border-xander-accent/50'
                  }`}
                  autoFocus={i === 0}
                />
              ))}
            </div>
          ) : (
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <input
                type="text"
                placeholder="ENTER MASTER API KEY"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className={`w-full p-4 bg-white/5 border rounded-2xl focus:outline-none font-mono text-center tracking-widest text-sm transition-all ${
                  error ? 'border-red-500/50 text-red-500 animate-shake' : 
                  isSuccess ? 'border-xander-accent text-xander-accent' :
                  'border-white/10 text-white focus:border-xander-accent/50'
                }`}
                autoFocus
              />
              <button 
                type="submit"
                className="w-full p-4 bg-xander-accent/10 border border-xander-accent/30 rounded-2xl text-xander-accent font-mono text-xs uppercase tracking-widest hover:bg-xander-accent/20 transition-all"
              >
                Verify Protocol
              </button>
            </form>
          )}

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'pin' ? 'apiKey' : 'pin');
                setError(false);
              }}
              className="text-[10px] font-mono text-xander-muted/60 hover:text-xander-accent transition-colors uppercase tracking-widest"
            >
              {authMode === 'pin' ? 'Use API Key' : 'Use PIN Code'}
            </button>
          </div>

          {authMode === 'apiKey' && !MASTER_API_KEY && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-mono uppercase tracking-wider animate-pulse">
              ⚠️ XANDER_API_KEY Secret Not Detected. Please check Settings {">"} Secrets.
            </div>
          )}

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-center gap-2 text-red-500 text-xs font-mono uppercase tracking-wider"
              >
                <AlertCircle className="w-4 h-4" />
                Access Denied. Invalid {authMode === 'pin' ? 'PIN' : 'Key'}.
              </motion.div>
            ) : isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xander-accent text-xs font-mono uppercase tracking-widest"
              >
                Access Granted. Initializing Xander...
              </motion.div>
            ) : (
              <div className="text-xander-muted/30 text-[10px] font-mono uppercase tracking-[0.2em]">
                Awaiting Mr. Swaastik.S Authorization
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-xander-muted/40 uppercase tracking-[0.3em]">
            <Shield className="w-3 h-3" />
            Encrypted Protocol v4.2
          </div>
        </div>
      </motion.div>
    </div>
  );
}
