import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarWidget() {
  const date = new Date(2026, 2, 20); // Friday, March 20, 2026
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  
  const daysInMonth = new Date(year, date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, date.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="glass-panel p-4 rounded-2xl border border-xander-accent/20 neon-glow w-full max-w-sm mx-auto my-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-mono text-sm font-bold text-xander-accent tracking-widest uppercase">
          {month} {year}
        </h3>
        <div className="flex gap-2">
          <ChevronLeft className="w-4 h-4 text-xander-muted cursor-not-allowed opacity-30" />
          <ChevronRight className="w-4 h-4 text-xander-muted cursor-not-allowed opacity-30" />
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`${d}-${i}`} className="text-[10px] font-mono text-xander-muted font-bold">{d}</span>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {blanks.map(b => (
          <div key={`b-${b}`} className="h-8" />
        ))}
        {days.map(d => (
          <div 
            key={d} 
            className={`h-8 flex items-center justify-center rounded-lg text-xs font-mono transition-all ${
              d === 20 
                ? 'bg-xander-accent text-xander-bg font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                : 'text-xander-text hover:bg-white/5'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-xander-muted uppercase tracking-widest">
        <span>Today: March 20</span>
        <span className="text-xander-accent">System Sync Active</span>
      </div>
    </div>
  );
}
