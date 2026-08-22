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

export default function TapasyaTimer({
  userId,
  subject = "",
  topic = "",
  onToggleZen,
}: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // 25 minutes default session target for the progress ring
  const totalTime = 25 * 60;

  // Your Arjuna extension ID
  const ARJUNA_EXTENSION_ID = "hoifgabjleobfmdobgjcojplpemamjom";

  // ---------------------------------------------------------
  // TIMER
  // ---------------------------------------------------------

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // ---------------------------------------------------------
  // OPTIONAL ARJUNA EXTENSION COMMUNICATION
  // ---------------------------------------------------------

  const sendExtensionMessage = (
    action: "ENABLE_STRICT_MODE" | "DISABLE_STRICT_MODE"
  ) => {
    // Extension is optional.
    // If it isn't installed/configured, the timer should still work.

    if (typeof window === "undefined") return;

    const chromeObj = (window as any).chrome;

    if (!chromeObj?.runtime?.sendMessage) {
      console.log("Arjuna extension not available. Continuing normally.");
      return;
    }

    try {
      chromeObj.runtime.sendMessage(
        ARJUNA_EXTENSION_ID,
        { action },
        (response: any) => {
          const lastError = chromeObj.runtime.lastError;

          if (lastError) {
            // Don't crash the application if the extension isn't available.
            console.log(
              "Arjuna extension unavailable:",
              lastError.message
            );
            return;
          }

          console.log("Arjuna:", response?.status || "Message sent");
        }
      );
    } catch (error) {
      // Extension failure should NEVER stop the study timer.
      console.log("Arjuna extension communication failed:", error);
    }
  };

  // ---------------------------------------------------------
  // START / END TIMER
  // ---------------------------------------------------------

  const toggleTimer = async () => {
    // START SESSION
    if (!isActive) {
      // Subject is required
      if (!subject.trim()) {
        alert("Please enter a Subject before starting deep work!");
        return;
      }

      setIsActive(true);

      // Enable Zen Mode
      if (onToggleZen) {
        onToggleZen(true);
      }

      // Tell Arjuna to enable strict mode.
      // If extension isn't available, nothing breaks.
      sendExtensionMessage("ENABLE_STRICT_MODE");

      return;
    }

    // -------------------------------------------------------
    // END SESSION
    // -------------------------------------------------------

    setIsActive(false);

    // Exit Zen Mode
    if (onToggleZen) {
      onToggleZen(false);
    }

    // IMPORTANT:
    // Previously this was ENABLE_STRICT_MODE again.
    // Now we correctly disable it.
    sendExtensionMessage("DISABLE_STRICT_MODE");

    // -------------------------------------------------------
    // SAVE SESSION TO SUPABASE
    // -------------------------------------------------------

    if (seconds > 60 && userId) {
      const { error } = await supabase.from("sessions").insert({
        user_id: userId,
        duration_seconds: seconds,
        chapter: topic.trim() || "General Focus",
      });

      if (!error) {
        const mins = Math.floor(seconds / 60);

        alert(
          `🔥 Great job! You studied for ${mins} minute${
            mins !== 1 ? "s" : ""
          }.`
        );
      } else {
        console.error(
          "Failed to log session:",
          error.message
        );
      }
    } else if (seconds <= 60) {
      alert(
        "Session ended. (Needs to be over 1 minute to save to your history)."
      );
    } else if (!userId) {
      console.warn(
        "No userId available. Session was not saved."
      );
    }

    // Reset timer
    setSeconds(0);
  };

  // ---------------------------------------------------------
  // PROGRESS RING
  // ---------------------------------------------------------

  const progress =
    Math.min((seconds % totalTime) / totalTime, 1) * 100;

  const radius = 95;

  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset =
    circumference - (progress / 100) * circumference;

  // ---------------------------------------------------------
  // FORMAT TIME
  // ---------------------------------------------------------

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);

    const m = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h
        .toString()
        .padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }

    return `${m
      .toString()
      .padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="relative flex flex-col items-center justify-center py-6 px-4 w-full">

      {/* SVG Circular Progress Ring */}
      <div className="relative flex items-center justify-center">

        <svg className="w-64 h-64 -rotate-90">

          {/* Background Ring */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-zinc-800/80"
          />

          {/* Progress Ring */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-orange-500 transition-all duration-1000 ease-linear"
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
            <Square className="w-4 h-4 fill-current" />
            End Session
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            Begin Deep Work
          </>
        )}

      </button>

    </div>
  );
}