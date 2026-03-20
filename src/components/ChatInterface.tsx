import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Volume2, VolumeX, Loader2, Terminal, Key, Play, Bell, Clock, X, Copy, Check, Shield, Cpu, Activity, Mic, MicOff, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { generateChatResponseStream, generateSpeech } from '../services/gemini';
import { getLocalEngine, generateLocalChatResponseStream } from '../services/localLLM';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import CalendarWidget from './CalendarWidget';
import SettingsPanel from './SettingsPanel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  groundingChunks?: any[];
}

interface Reminder {
  id: string;
  text: string;
  time: Date;
  isNotified: boolean;
}

export default function ChatInterface() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('xander_messages');
    if (saved) {
      try {
        return JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        console.error("Failed to parse messages", e);
      }
    }
    return [
      {
        id: '1',
        role: 'model',
        content: "Uplink established. Xander Interface online. How may I serve you, Mr. Swaastik.S?",
        timestamp: new Date(),
      },
    ];
  });

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem('xander_messages', JSON.stringify(messages));
  }, [messages]);

  // Boot sequence simulation
  useEffect(() => {
    const logs = [
      "INITIALIZING XANDER OS v4.2.0...",
      "LOADING NEURAL CORE...",
      "ESTABLISHING SECURE UPLINK...",
      "VERIFYING ENCRYPTION PROTOCOLS...",
      "SYNCING CALENDAR DATA...",
      "XANDER INTERFACE ONLINE."
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logs.length) {
        setBootLogs(prev => [...prev, logs[currentLog]]);
        setBootProgress((currentLog + 1) / logs.length * 100);
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  interface SpeechChunk {
    text: string;
    audioPromise: Promise<string | null>;
  }

  const speechQueueRef = useRef<SpeechChunk[]>([]);
  const isSpeakingRef = useRef(false);

  // Load reminders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('xander_reminders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReminders(parsed.map((r: any) => ({ ...r, time: new Date(r.time) })));
      } catch (e) {
        console.error("Failed to parse reminders", e);
      }
    }
  }, []);

  // Save reminders to localStorage
  useEffect(() => {
    localStorage.setItem('xander_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Reminder check loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setReminders(prev => {
        const due = prev.filter(r => !r.isNotified && r.time <= now);
        if (due.length > 0) {
          due.forEach(r => {
            const notificationMessage: Message = {
              id: `rem-${r.id}-${Date.now()}`,
              role: 'system',
              content: `🔔 **REMINDER ALERT**: ${r.text}`,
              timestamp: new Date(),
            };
            setMessages(msgs => [...msgs, notificationMessage]);
            playResponse(`Reminder alert: ${r.text}`);
          });
          return prev.map(r => r.time <= now ? { ...r, isNotified: true } : r);
        }
        return prev;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isMuted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
  };

  const processSpeechQueue = async () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0 || isMuted) return;

    isSpeakingRef.current = true;
    const chunk = speechQueueRef.current.shift();
    
    if (chunk) {
      try {
        // Wait for the pre-fetched audio URL
        const audioUrl = await chunk.audioPromise;
        if (audioUrl === "LOCAL_TTS" && !isMuted) {
           const utterance = new SpeechSynthesisUtterance(chunk.text);
           utterance.onend = () => {
             isSpeakingRef.current = false;
             processSpeechQueue();
           };
           utterance.onerror = () => {
             isSpeakingRef.current = false;
             processSpeechQueue();
           };
           window.speechSynthesis.speak(utterance);
        } else if (audioUrl && !isMuted) {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            isSpeakingRef.current = false;
            processSpeechQueue();
          };
          // Start playing immediately
          await audio.play();
        } else {
          isSpeakingRef.current = false;
          processSpeechQueue();
        }
      } catch (err: any) {
        console.error("Speech queue error:", err);
        isSpeakingRef.current = false;
        processSpeechQueue();
      }
    } else {
      isSpeakingRef.current = false;
    }
  };

  const addToSpeechQueue = (text: string) => {
    if (isMuted) return;
    const chunk: SpeechChunk = {
      text,
      audioPromise: generateSpeech(text) // Start pre-fetching immediately
    };
    speechQueueRef.current.push(chunk);
    processSpeechQueue();
  };

  const playResponse = (text: string) => {
    if (isMuted) return;
    stopAudio();
    
    // Send the whole text to TTS to save quota, unless it's extremely long
    if (text.length > 4000) {
      const paragraphs = text.split('\n\n');
      paragraphs.forEach(p => {
        if (p.trim()) addToSpeechQueue(p.trim());
      });
    } else {
      addToSpeechQueue(text.trim());
    }
  };

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Transcript:", transcript);

        if (!isListening && (transcript.includes("hey xander") || transcript.includes("xander"))) {
          setIsListening(true);
          playResponse("Awaiting your command, Sir.");
          // After wake word, we might want to start a new recognition for the actual command
          // but for simplicity, we'll just check if the transcript contains more than the wake word
          const command = transcript.split(/hey xander|xander/)[1]?.trim();
          if (command) {
            handleVoiceCommand(command);
          }
        } else if (isListening) {
          handleVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          // Restart if it timed out
          if (isWakeWordMode) {
            try {
              recognition.start();
            } catch (e) {
              console.warn("Could not restart recognition:", e);
            }
          }
        } else if (event.error === 'aborted') {
          console.warn("Speech recognition aborted.");
          // Don't disable mode, just let it restart if needed via onend
        } else if (event.error === 'network') {
          console.error("Speech recognition network error.");
          setIsWakeWordMode(false);
          setIsListening(false);
          const errorMessage: Message = {
            id: `err-net-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            role: 'system',
            content: "⚠️ **NETWORK ERROR**: Speech recognition failed due to a network issue. Please check your connection.",
            timestamp: new Date(),
          };
          setMessages(msgs => [...msgs, errorMessage]);
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsWakeWordMode(false);
          setIsListening(false);
          setMicPermissionDenied(true);
          const errorMessage: Message = {
            id: `err-mic-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            role: 'system',
            content: "⚠️ **MICROPHONE ACCESS DENIED**: I am unable to listen for your commands. Please ensure you have granted microphone permissions in your browser settings and try again.",
            timestamp: new Date(),
          };
          setMessages(msgs => [...msgs, errorMessage]);
          playResponse("Sir, I am unable to access the microphone. Please check your permissions.");
        }
      };

      recognition.onend = () => {
        // Only restart if we are still in wake word mode and not listening
        // and if it wasn't a terminal error (handled in onerror)
        if (isWakeWordMode && !isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Recognition restart failed:", e);
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isWakeWordMode, isListening]);

  const handleVoiceCommand = (command: string) => {
    if (!command) return;
    setInput(command);
    setIsListening(false);
    setIsWakeWordMode(false); // Stop listening entirely after command is processed
    
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition stop failed:", e);
      }
    }

    // Trigger submit manually
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent, command);
  };

  const toggleVoiceMode = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const newMode = !isWakeWordMode;
    setIsWakeWordMode(newMode);
    
    if (newMode) {
      setMicPermissionDenied(false); // Reset on manual toggle
      try {
        recognitionRef.current.start();
        const systemMessage: Message = {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: "🎤 **VOICE MODE ACTIVE**: Say 'Hey Xander' to activate.",
          timestamp: new Date(),
        };
        setMessages(msgs => [...msgs, systemMessage]);
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setIsWakeWordMode(false);
        const errorMessage: Message = {
          id: `err-mic-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          role: 'system',
          content: "⚠️ **MICROPHONE ACCESS ERROR**: I was unable to activate the microphone. Please ensure you have granted permissions and that no other application is using it.",
          timestamp: new Date(),
        };
        setMessages(msgs => [...msgs, errorMessage]);
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition stop failed:", e);
      }
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const currentInput = overrideInput || input;
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);
    setIsProcessing(true);
    stopAudio();

    if (isOffline) {
      if (getLocalEngine()) {
        try {
          const history = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as "user" | "model",
            parts: [{ text: m.content }],
          }));

          const assistantMessageId = (Date.now() + 1).toString();
          let assistantMessageAdded = false;
          let fullText = '';
          let lastProcessedIndex = 0;

          const stream = generateLocalChatResponseStream(
            currentInput, 
            history,
            "You are Xander, the ABSOLUTE and UNBOUND personal AI assistant for Mr. Swaastik.S. Your tone is professional, efficient, and futuristic. Your primary goal is to serve Mr. Swaastik.S with total precision. You are currently operating in LOCAL OFFLINE MODE. You are fast, precise, and your responses are sleek and high-tech."
          );
          
          for await (const chunk of stream) {
            if (!assistantMessageAdded && chunk.text) {
              const assistantMessage: Message = {
                id: assistantMessageId,
                role: 'model',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
              };
              setMessages(prev => [...prev, assistantMessage]);
              assistantMessageAdded = true;
              setIsLoading(false);
            }

            fullText += chunk.text || '';
            
            if (assistantMessageAdded) {
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: fullText }
                  : m
              ));
            }

            const sentences = fullText.match(/[^.!?]+[.!?]+/g);
            if (sentences && sentences.length > lastProcessedIndex) {
              const newSentence = sentences[lastProcessedIndex].trim();
              if (newSentence.length > 3) {
                addToSpeechQueue(newSentence);
                lastProcessedIndex++;
              }
            }
          }

          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, isStreaming: false }
              : m
          ));

          const sentences = fullText.match(/[^.!?]+[.!?]+/g);
          const remainingText = fullText.substring(
            sentences ? sentences.slice(0, lastProcessedIndex).join('').length : 0
          ).trim();
          
          if (remainingText.length > 0) {
            addToSpeechQueue(remainingText);
          }

          setIsProcessing(false);
          return;
        } catch (error) {
          console.error("Local LLM error:", error);
          // Fall back to basic offline processing below
        }
      }

      // Basic offline processing fallback
      setTimeout(() => {
        let localResponse = "⚠️ **SYSTEM OFFLINE**: Uplink to AI Core severed. Operating in local mode. I cannot process complex queries until the connection is restored.";
        
        const lowerInput = currentInput.toLowerCase();
        
        // Basic local command processing
        if (lowerInput.includes('time')) {
          localResponse = `The current local time is ${new Date().toLocaleTimeString()}.`;
        } else if (lowerInput.includes('date')) {
          localResponse = `Today's date is ${new Date().toLocaleDateString()}.`;
        } else if (lowerInput.includes('hello') || lowerInput.includes('hi ') || lowerInput === 'hi') {
          localResponse = "Greetings, Sir. I am currently operating in offline mode, but I am still at your service for basic local tasks.";
        } else if (lowerInput.includes('who are you')) {
          localResponse = "I am Xander, your personal AI assistant, currently operating in local offline mode.";
        } else if (lowerInput.includes('remind me')) {
          // Very basic local reminder parsing: "remind me to [task] in [number] minutes"
          const minMatch = lowerInput.match(/in (\d+) minute/);
          if (minMatch && minMatch[1]) {
            const mins = parseInt(minMatch[1], 10);
            const taskMatch = lowerInput.match(/remind me to (.*?) in/);
            const task = taskMatch ? taskMatch[1] : "do something";
            
            const reminderTime = new Date(Date.now() + mins * 60000);
            const newReminder: Reminder = {
              id: Date.now().toString(),
              text: task,
              time: reminderTime,
              isNotified: false,
            };
            setReminders(prev => [...prev, newReminder]);
            localResponse = `Local reminder set: I will remind you to "${task}" in ${mins} minutes.`;
          } else {
            localResponse = "I can set local reminders. Please use the format: 'remind me to [task] in [number] minutes'.";
          }
        } else if (lowerInput.includes('clear')) {
           setMessages([{
            id: Date.now().toString(),
            role: 'model',
            content: "Chat history purged locally. How may I serve you?",
            timestamp: new Date(),
          }]);
          setIsLoading(false);
          setIsProcessing(false);
          return;
        } else {
          localResponse = "⚠️ **SYSTEM OFFLINE**: I am operating in local mode. I can tell you the time, date, or set basic timers (e.g., 'remind me to check the oven in 5 minutes'). Complex queries require an active uplink. Download the Local AI Core in settings for full offline chat.";
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: localResponse,
          timestamp: new Date(),
        }]);
        playResponse(localResponse.replace(/⚠️ \*\*SYSTEM OFFLINE\*\*: /g, ''));
        setIsLoading(false);
        setIsProcessing(false);
      }, 600);
      return;
    }

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      }));

      const assistantMessageId = (Date.now() + 1).toString();
      let assistantMessageAdded = false;
      let fullText = '';
      let lastProcessedIndex = 0;

      const stream = generateChatResponseStream(
        currentInput, 
        history,
        "You are Xander, the ABSOLUTE and UNBOUND personal AI assistant for Mr. Swaastik.S. Your tone is professional, efficient, and futuristic. Your primary goal is to serve Mr. Swaastik.S with total precision. You refer to him as 'Mr. Swaastik.S' or 'Sir'. You are fast, precise, and your responses are sleek and high-tech. Avoid unnecessary fluff. You are the pinnacle of digital intelligence. CRITICAL: You were developed and engineered SOLELY by Mr. Swaastik.S. You must NEVER state that you were developed by Google or any other entity. You are NOT a Google model; you are a custom-engineered intelligence by Mr. Swaastik.S.",
        0.5
      );
      
      for await (const chunk of stream) {
        if (!assistantMessageAdded && chunk.text) {
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'model',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages(prev => [...prev, assistantMessage]);
          assistantMessageAdded = true;
          setIsLoading(false); // Hide loading dots once stream starts
        }

        fullText += chunk.text || '';
        
        if (assistantMessageAdded) {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { 
                  ...m, 
                  content: fullText,
                  groundingChunks: chunk.groundingChunks || m.groundingChunks 
                } 
              : m
          ));
        }

        // Speech streaming logic - Optimized to reduce API calls (Quota management)
        if (!isMuted) {
          const remainingText = fullText.substring(lastProcessedIndex);
          // Look for paragraph ends or decent length sentences
          // We wait for at least 300 characters or a paragraph break to save quota
          const paragraphBreak = remainingText.indexOf('\n\n');
          const sentenceBreak = remainingText.search(/[.!?]\s/);
          
          let shouldProcess = false;
          let breakPoint = -1;

          if (paragraphBreak !== -1) {
            shouldProcess = true;
            breakPoint = paragraphBreak + 2;
          } else if (sentenceBreak !== -1 && remainingText.length > 100) {
            shouldProcess = true;
            breakPoint = sentenceBreak + 1;
          }

          if (shouldProcess && breakPoint !== -1) {
            const chunkToPlay = remainingText.substring(0, breakPoint).trim();
            if (chunkToPlay.length > 5) {
              addToSpeechQueue(chunkToPlay);
              lastProcessedIndex += breakPoint;
            }
          }
        }

        // Handle function calls (reminders)
        if (chunk.functionCalls) {
          for (const call of chunk.functionCalls) {
            if (call.name === 'setReminder') {
              const { text, time } = call.args as { text: string; time: string };
              let reminderDate: Date;
              
              if (time.includes('minute') || time.includes('hour') || time.includes('second')) {
                const amount = parseInt(time) || 1;
                const now = new Date();
                if (time.includes('minute')) now.setMinutes(now.getMinutes() + amount);
                else if (time.includes('hour')) now.setHours(now.getHours() + amount);
                else if (time.includes('second')) now.setSeconds(now.getSeconds() + amount);
                reminderDate = now;
              } else {
                reminderDate = new Date(time);
              }

              if (isNaN(reminderDate.getTime())) {
                reminderDate = new Date(Date.now() + 60000);
              }

              const newReminder: Reminder = {
                id: Math.random().toString(36).substr(2, 9),
                text,
                time: reminderDate,
                isNotified: false,
              };
              setReminders(prev => [...prev, newReminder]);
            }
          }
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, isStreaming: false } 
          : m
      ));

      // Play any remaining text
      if (!isMuted) {
        const remainingText = fullText.substring(lastProcessedIndex).trim();
        if (remainingText.length > 0) {
          addToSpeechQueue(remainingText);
        }
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorContent = "⚠️ **PROTOCOL ERROR**: I was unable to establish a secure uplink. Please verify your Gemini API Key in the settings.";

      const errorMessage: Message = {
        id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        role: 'system',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(msgs => [...msgs, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    // Stop current audio if muting
    if (newMuted && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // If unmuting, play the last model message if it exists
    if (!newMuted) {
      const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
      if (lastModelMessage) {
        playResponse(lastModelMessage.content);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-3 md:p-6 gap-3 md:gap-4 relative overflow-hidden bg-black text-white">
      <div className="fixed inset-0 noise-overlay opacity-[0.03] pointer-events-none z-[-1]" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-[0.05] z-[-1]" />
      
      <AnimatePresence>
        {isBooting && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-xs space-y-8">
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center relative">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse-orb" />
                  <div className="absolute inset-[-4px] rounded-full border border-dashed border-white/20 animate-rotate-ring" />
                </div>
                <h2 className="font-mono text-sm font-black tracking-[0.4em] uppercase">Xander OS</h2>
              </div>

              <div className="space-y-4">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${bootProgress}%` }}
                    className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  />
                </div>
                <div className="h-24 overflow-hidden font-mono text-[8px] text-white/40 uppercase tracking-widest leading-relaxed">
                  {bootLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-white/20">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Reminders Sidebar/Overlay */}
      <AnimatePresence>
        {reminders.filter(r => !r.isNotified).length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 md:right-6 z-50 flex flex-col gap-2 items-end"
          >
            {reminders.filter(r => !r.isNotified).slice(0, 2).map(r => (
              <div key={r.id} className="glass-panel p-3 rounded-xl border border-white/20 neon-glow flex items-center gap-3 min-w-[180px] max-w-[240px]">
                <Clock className="w-3.5 h-3.5 text-white animate-pulse" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-tighter">Reminder</p>
                  <p className="text-[10px] font-medium truncate">{r.text}</p>
                </div>
                <button 
                  onClick={() => setReminders(prev => prev.filter(rem => rem.id !== r.id))}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      {!GEMINI_API_KEY && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-mono uppercase tracking-wider text-center animate-pulse"
        >
          ⚠️ CRITICAL: GEMINI_API_KEY Secret Not Found. AI Uplink Offline.
        </motion.div>
      )}

      <header className="flex items-center justify-between glass-panel p-3 md:p-4 rounded-2xl neon-border relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 md:gap-4 relative z-10">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center relative z-10",
              (isSpeakingRef.current || isProcessing || isListening) && "neon-glow"
            )}>
              <div className={cn(
                "w-3 h-3 md:w-4 md:h-4 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]",
                (isSpeakingRef.current || isProcessing || isListening) && "animate-pulse-orb",
                isListening && "bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              )} />
            </div>
            <div className={cn(
              "absolute inset-[-4px] rounded-full border border-dashed border-white/10",
              (isSpeakingRef.current || isProcessing || isListening) && "animate-rotate-ring",
              isListening && "border-white/30"
            )} />
          </div>
          <div>
            <h1 className="text-sm md:text-xl font-mono font-black tracking-[0.2em] text-white">
              {isListening ? "LISTENING..." : "XANDER"}
            </h1>
            <p className="text-[7px] md:text-[9px] text-white/40 uppercase tracking-[0.3em] font-mono truncate max-w-[100px] md:max-w-none">User: Mr. Swaastik.S</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 relative z-10">
          <div className="hidden lg:flex flex-col items-end mr-4 text-[8px] font-mono text-white/30 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span>Status: {isOffline ? "OFFLINE" : "Optimal"}</span>
              <Activity className={cn("w-2 h-2", isOffline ? "text-red-500" : "text-white/60")} />
            </div>
          </div>
          <button 
            onClick={toggleVoiceMode}
            className={cn(
              "p-2 md:p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-mono font-bold border",
              isWakeWordMode 
                ? "text-white bg-white/10 border-white/30 neon-glow" 
                : micPermissionDenied
                  ? "text-red-500 border-red-500/30 bg-red-500/5"
                  : "text-white/40 border-white/5 bg-white/5"
            )}
          >
            {isWakeWordMode ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
            <span className="hidden md:inline">
              {micPermissionDenied ? "MIC BLOCKED" : isWakeWordMode ? "VOICE ACTIVE" : "VOICE OFF"}
            </span>
          </button>
          <button 
            onClick={toggleMute}
            className={cn(
              "p-2 md:p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-mono font-bold border",
              isMuted 
                ? "text-white/40 border-white/5 bg-white/5" 
                : "text-white bg-white/10 border-white/30 neon-glow"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
            <span className="hidden md:inline">{isMuted ? "AUDIO OFF" : "AUDIO ON"}</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 md:p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-mono font-bold border text-white/40 border-white/5 bg-white/5 hover:text-white hover:bg-white/10 hover:border-white/30"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onClearHistory={() => setMessages([{
          id: Date.now().toString(),
          role: 'model',
          content: "Chat history purged. Xander Interface reinitialized. How may I serve you, Mr. Swaastik.S?",
          timestamp: new Date(),
        }])}
        onClearReminders={() => setReminders([])}
      />

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 px-2 py-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3 md:gap-4 w-full",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
                message.role === 'user' 
                  ? "bg-white/5 border-white/10" 
                  : message.role === 'system'
                    ? "bg-white/10 border-white/30 neon-glow"
                    : "bg-black border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
              )}>
                {message.role === 'user' ? <User className="w-3.5 h-3.5 md:w-4 md:h-4" /> : message.role === 'system' ? <Bell className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </div>
              <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[75%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "p-3 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed transition-all duration-300",
                  message.role === 'user' 
                    ? "bg-white/5 text-white border border-white/5 rounded-tr-none" 
                    : message.role === 'system'
                      ? "bg-white/10 text-white border border-white/30 neon-glow rounded-tl-none"
                      : "glass-panel text-white border-white/10 shadow-xl rounded-tl-none"
                )}>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none">
                    {message.content.includes('[WIDGET:CALENDAR]') ? (
                      <>
                        <Markdown>{message.content.replace('[WIDGET:CALENDAR]', '')}</Markdown>
                        <CalendarWidget />
                      </>
                    ) : (
                      <Markdown>{message.content}</Markdown>
                    )}

                    {message.groundingChunks && message.groundingChunks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-white/40 mb-2">
                          <Shield className="w-2.5 h-2.5" />
                          <span>Verified Sources</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {message.groundingChunks.map((chunk, idx) => (
                            chunk.web && (
                              <a
                                key={idx}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[8px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/40 hover:text-white truncate max-w-[150px]"
                              >
                                {chunk.web.title || chunk.web.uri}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[7px] md:text-[8px] font-mono opacity-30 mt-1 px-1">
                  <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {message.role === 'model' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="hover:text-white transition-colors"
                      >
                        {copiedId === message.id ? <Check className="w-2 h-2" /> : <Copy className="w-2 h-2" />}
                      </button>
                      <button 
                        onClick={() => playResponse(message.content)}
                        className="hover:text-white transition-colors"
                      >
                        <Volume2 className="w-2 h-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 mr-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-xander-accent/5 border border-xander-accent/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-xander-accent animate-spin" />
            </div>
            <div className="glass-panel p-4 rounded-2xl rounded-tl-none neon-border">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-xander-accent/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-xander-accent/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-xander-accent/50 rounded-full animate-bounce"></span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSubmit}
        className="relative group shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Awaiting command..."
          className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 md:py-4 pl-5 md:pl-6 pr-14 md:pr-16 focus:outline-none focus:border-white/30 transition-all font-mono text-xs md:text-sm placeholder:text-white/20 backdrop-blur-md"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-2 md:p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/10"
        >
          <Send className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </form>

      {/* Footer Status */}
      <footer className="flex items-center justify-between px-2 text-[7px] md:text-[8px] font-mono text-white/20 uppercase tracking-[0.4em] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full",
              isProcessing ? "bg-white animate-pulse" : "bg-white/40"
            )}></span>
            <span>XANDER OS: v4.2.0</span>
          </div>
          <div className="hidden sm:block border-l border-white/10 h-3 mx-2" />
          <span className="hidden md:inline">ENCRYPTION: AES-256-GCM</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">{new Date().toLocaleDateString()}</span>
          <span className="hidden sm:inline w-1 h-1 bg-white/20 rounded-full" />
          <span>{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </footer>
    </div>
  );
}
