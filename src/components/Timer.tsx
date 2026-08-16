"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Play, Square, BookOpen, Hash } from "lucide-react";

declare var chrome: any;
const EXTENSION_ID = "hoifgabjleobfmdobgjcojplpemamjom";

export default function TapasyaTimer({
  onTimerStateChange,
}: {
  onTimerStateChange?: (isActive: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? hours.toString().padStart(2, "0") + ":" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const startTapasya = () => {
    if (!subject || !chapter) {
      alert("Please select a subject and enter a chapter.");
      return;
    }
    setStartTime(Date.now());
    setIsActive(true);
    if (onTimerStateChange) onTimerStateChange(true);

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { action: "ENABLE_STRICT_MODE" },
        (response: any) => {
          if (!chrome.runtime.lastError) console.log("Focus Mode Active");
        },
      );
    }
  };

  const endTapasya = async () => {
    setIsActive(false);
    if (onTimerStateChange) onTimerStateChange(false);

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { action: "DISABLE_STRICT_MODE" },
        (response: any) => {},
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && startTime) {
      await supabase.from("sessions").insert({
        user_id: user.id,
        subject: subject,
        chapter: chapter,
        duration_seconds: elapsedTime,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date().toISOString(),
      });
    }

    setElapsedTime(0);
    setStartTime(null);
    setChapter("");
  };

  return (
    <div className="w-full p-8 bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center">
      {!isActive ? (
        <div className="w-full space-y-4 mb-8">
          <div className="relative">
            <BookOpen
              className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500"
              strokeWidth={1.5}
            />
            <select
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-950/50 border border-white/5 text-zinc-300 focus:outline-none focus:border-zinc-700 appearance-none transition-colors"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="" disabled>
                Select Subject
              </option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
              <option value="Mock Test">Mock Test</option>
            </select>
          </div>

          <div className="relative">
            <Hash
              className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500"
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder="Chapter or Topic"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-950/50 border border-white/5 text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="text-center mb-8 flex flex-col items-center gap-2">
          <span className="px-3 py-1 bg-zinc-800/50 border border-white/5 rounded-full text-xs text-zinc-400 font-medium tracking-wide uppercase">
            {subject}
          </span>
          <p className="text-zinc-300 font-light">{chapter}</p>
        </div>
      )}

      <div className="text-7xl md:text-8xl font-extralight tracking-tighter text-zinc-100 mb-10 tabular-nums">
        {formatTime(elapsedTime)}
      </div>

      {!isActive ? (
        <button
          onClick={startTapasya}
          className="flex items-center gap-2 px-8 py-4 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full transition-all text-sm font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Play className="w-4 h-4 fill-current" /> Begin Deep Work
        </button>
      ) : (
        <button
          onClick={endTapasya}
          className="flex items-center gap-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full transition-all text-sm font-medium"
        >
          <Square className="w-4 h-4 fill-current text-red-500" /> End Session
        </button>
      )}
    </div>
  );
}
