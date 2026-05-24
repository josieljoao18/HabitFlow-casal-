import { useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { DEVOTIONAL_VERSES } from '../utils/devotionals';
import { DevotionalVerse } from '../types';

export default function DevotionalCard() {
  const [verseIdx, setVerseIdx] = useState(() => {
    return Math.floor(Math.random() * DEVOTIONAL_VERSES.length);
  });

  const rotateVerse = () => {
    setVerseIdx((prev) => {
      if (DEVOTIONAL_VERSES.length <= 1) return prev;
      let nextIdx = prev;
      while (nextIdx === prev) {
        nextIdx = Math.floor(Math.random() * DEVOTIONAL_VERSES.length);
      }
      return nextIdx;
    });
  };

  const currentVerse: DevotionalVerse = DEVOTIONAL_VERSES[verseIdx];

  return (
    <div className="bg-emerald-950/15 border border-emerald-500/15 rounded-xl p-3 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[10.5px] font-bold tracking-wider uppercase font-sans">Devocional Diário</span>
        </div>
        <button 
          onClick={rotateVerse}
          className="p-1 hover:bg-emerald-500/10 rounded-lg text-secondary hover:text-emerald-400 transition-all border-0 cursor-pointer"
          title="Outro Versículo"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <p className="text-primary text-xs italic leading-relaxed font-sans font-medium mb-2 pr-1">
        "{currentVerse.text}"
      </p>

      <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-emerald-500/10 text-[9px] select-none">
        <span className="text-emerald-400 font-bold font-mono">{currentVerse.reference}</span>
        <span className="text-secondary/70 truncate text-right max-w-[200px]">{currentVerse.context}</span>
      </div>
    </div>
  );
}
