"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Calendar as CalendarIcon, Flame } from "lucide-react";

interface DayData {
  dateStr: string;
  totalSeconds: number;
}

export default function StudyCalendar({ userId }: { userId: string }) {
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchMonthlySessions();
  }, [userId]);

  const fetchMonthlySessions = async () => {
    setLoading(true);
    // Fetch sessions for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("duration_seconds, created_at")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (!error && sessions) {
      const map: Record<string, number> = {};
      sessions.forEach((s: any) => {
        const dateKey = s.created_at.split("T")[0]; // YYYY-MM-DD
        map[dateKey] = (map[dateKey] || 0) + (s.duration_seconds || 0);
      });
      setCalendarData(map);
    }
    setLoading(false);
  };

  // Generate last 28 days for grid display
  const generateDays = () => {
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        seconds: calendarData[dateStr] || 0,
      });
    }
    return days;
  };

  // Determine color shade based on study duration
  const getIntensityColor = (seconds: number) => {
    if (seconds === 0) return "bg-zinc-900 border-white/5";
    const hours = seconds / 3600;
    if (hours < 1) return "bg-emerald-950/80 border-emerald-800/40 text-emerald-400";
    if (hours < 3) return "bg-emerald-800/80 border-emerald-600/50 text-emerald-200";
    if (hours < 5) return "bg-emerald-600 border-emerald-500 text-white";
    return "bg-emerald-500 border-emerald-400 text-zinc-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]";
  };

  const formatHours = (seconds: number) => {
    const h = (seconds / 3600).toFixed(1);
    return `${h} hrs`;
  };

  const daysGrid = generateDays();

  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-zinc-400" />
          <h3 className="text-lg font-medium text-white">Monthly Study Heatmap</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Past 28 Days Activity</span>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-6 text-zinc-500 text-xs animate-pulse">Loading heatmap...</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {daysGrid.map((day) => (
            <div
              key={day.dateStr}
              title={`${day.dateStr}: ${formatHours(day.seconds)}`}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-default ${getIntensityColor(
                day.seconds
              )}`}
            >
              <span className="text-[10px] uppercase opacity-70 tracking-wider">{day.dayName}</span>
              <span className="text-sm font-mono my-0.5">{day.dayNum}</span>
              <span className="text-[9px] font-mono opacity-90">{formatHours(day.seconds)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}