"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Play, Square } from "lucide-react";

interface TimerProps {
  userId: string;
  subject: string;
  topic: string;
}

export default function TapasyaTimer({ userId, subject, topic }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = async () => {
    if (!isActive) {
      // Trying to start
      if (!subject.trim()) {
        alert("Please enter a Subject before starting deep work!");
        return;
      }
      setIsActive(true);
    } else {
      // Stopping the timer
      setIsActive(false);

      if (seconds > 60) { // Only log if they studied for more than 1 minute
        const { error } = await supabase.from("study_sessions").insert({
          user_id: userId,
          subject: subject,
          topic: topic,
          duration_seconds: seconds,
        });

        if (!error) {
          const mins = Math.floor(seconds / 60);
          alert(`🔥 Great job! You studied ${subject} for ${mins} minute${mins !== 1 ? 's' : ''}.`);
        } else {
          console.error("Failed to log session:", error.message);
        }
      } else {
        alert("Session ended. (Needs to be over 1 minute to save to your history).");
      }
      
      setSeconds(0); // Reset timer
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/30 border border-white/5 rounded-3xl w-full max-w-sm">
      <div className="text-7xl font-light text-white tracking-widest mb-12 tabular-nums">
        {formatTime(seconds)}
      </div>

      <button
        onClick={toggleTimer}
        className={`flex items-center gap-3 px-8 py-4 rounded-full font-medium transition-all shadow-lg ${
          isActive
            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
            : "bg-white text-zinc-950 hover:bg-zinc-200"
        }`}
      >
        {isActive ? (
          <>
            <Square className="w-5 h-5 fill-current" /> End Session
          </>
        ) : (
          <>
            <Play className="w-5 h-5 fill-current" /> Begin Deep Work
          </>
        )}
      </button>
    </div>
  );
}