"use client";

import { useState } from "react";
import { BookOpen, Hash, CheckCircle2 } from "lucide-react";

interface SankalpProps {
  subject: string;
  setSubject: (val: string) => void;
  topic: string;
  setTopic: (val: string) => void;
}

export default function Sankalp({
  subject,
  setSubject,
  topic,
  setTopic,
}: SankalpProps) {
  const [isLocked, setIsLocked] = useState(false);

  // Quick Select Presets
  const suggestedSubjects = [
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Coding",
  ];

  const handleLockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() || topic.trim()) {
      setIsLocked(true);
    }
  };

  // What it looks like AFTER they click "Lock In"
  if (isLocked) {
    return (
      <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl animate-in fade-in zoom-in-95 duration-300 shadow-inner">
        <div className="flex items-center gap-3 overflow-hidden">
          <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-[10px] font-mono text-orange-400/70 uppercase tracking-wider">
              {subject || "Objective"}
            </span>
            <span className="text-sm font-medium text-orange-300 truncate">
              {topic || "Deep Work Session"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsLocked(false)}
          className="text-[10px] uppercase tracking-widest text-orange-400/70 hover:text-orange-400 ml-4 shrink-0 transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  // The unlocked input form
  return (
    <form onSubmit={handleLockIn} className="w-full space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <BookOpen className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter Subject (e.g., Physics, Biology)"
            className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 transition-all"
          />
        </div>

        {/* QUICK SELECT TAGS */}
        <div className="flex flex-wrap gap-2 px-1">
          {suggestedSubjects.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSubject(tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wide transition-all ${
                subject === tag
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.1)]"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 border border-transparent"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Hash className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Chapter or Topic"
          className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={!subject.trim() && !topic.trim()}
        className="w-full py-3 bg-white/5 hover:bg-orange-500 hover:text-zinc-950 text-zinc-300 text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 hover:border-transparent mt-2"
      >
        Lock In Objective
      </button>
    </form>
  );
}
