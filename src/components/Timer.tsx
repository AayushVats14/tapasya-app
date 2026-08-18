"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Play, Square } from "lucide-react";

interface TimerProps {
  userId?: string;
  subject?: string;
  topic?: string;
  onToggleZen?: (isZen: boolean) => void;
}

export default function TapasyaTimer({ userId, subject = "", topic = "", onToggleZen }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // 25 minutes default session target for the ring progress
  const totalTime = 25 * 60; 

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
      setIsActive(true);
      if (onToggleZen) onToggleZen(true); // Trigger Zen Mode
    } else {
      setIsActive(false);
      if (onToggleZen) onToggleZen(false); // Exit Zen Mode

      if (seconds > 60 && userId) {
        const { error } = await supabase.from("sessions").insert({
          user_id: userId,
          duration_seconds: seconds,
          chapter: topic || "General Focus",
        });

        if (!error) {
          const mins = Math.floor(seconds / 60);
          alert(`🔥 Great job! You studied for ${mins} minute${mins !== 1 ? 's' : ''}.`);
        } else {
          console.error("Failed to log session:", error.message);
        }
      } else if (seconds <= 60) {
        alert("Session ended. (Needs to be over 1 minute to save to your history).");
      }
      
      setSeconds(0);
    }
  };

  // SVG Progress Ring calculations
  const progress = Math.min(((seconds % totalTime) / totalTime) * 100, 100);
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-6 px-4 w-full">
      
      {/* SVG Circular Progress Ring */}
      <div className="relative flex items-center justify-center">
        <svg className="w-64 h-64 -rotate-90">
          <circle 
            cx="128" cy="128" r={radius} 
            stroke="currentColor" strokeWidth="6" 
            fill="transparent" 
            className="text-zinc-800/80" 
          />
          <circle 
            cx="128" cy="128" r={radius} 
            stroke="currentColor" strokeWidth="6" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset}
            className="text-orange-500 transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(249,115,22,0.4)]"
            strokeLinecap="round"
          />
        </svg>

        {/* Center Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-mono font-light text-white tracking-wider tabular-nums">
            {formatTime(seconds)}
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mt-1">
            {isActive ? "Deep Work Active" : "Ready"}
          </span>
        </div>
      </div>

      {/* Control Button */}
      <button
        onClick={toggleTimer}
        className={`mt-8 flex items-center gap-3 px-8 py-3.5 rounded-full text-xs font-medium tracking-wide transition-all shadow-lg ${
          isActive
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shadow-red-500/5"
            : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20"
        }`}
      >
        {isActive ? (
          <>
            <Square className="w-4 h-4 fill-current" /> End Session
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" /> Begin Deep Work
          </>
        )}
      </button>
    </div>
  );
}