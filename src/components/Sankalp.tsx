"use client";

import { BookOpen, Hash } from "lucide-react";

interface SankalpProps {
  subject: string;
  setSubject: (val: string) => void;
  topic: string;
  setTopic: (val: string) => void;
}

export default function Sankalp({ subject, setSubject, topic, setTopic }: SankalpProps) {
  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <BookOpen className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter Subject (e.g., Physics, Biology)"
          className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-all"
        />
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
          className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-all"
        />
      </div>
    </div>
  );
}