"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Globe,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_seconds: number;
  bio?: string;
  rank_trend?: "up" | "down" | "same";
}

export default function Leaderboard({
  currentUserId,
}: {
  currentUserId?: string;
}) {
  // Navigation & Filter States
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Data States
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Navigation Handlers
  const handlePrevDate = () => {
    const prev = new Date(selectedDate);
    if (timeframe === "daily") prev.setDate(prev.getDate() - 1);
    else if (timeframe === "weekly") prev.setDate(prev.getDate() - 7);
    else if (timeframe === "monthly") prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(selectedDate);
    if (timeframe === "daily") next.setDate(next.getDate() + 1);
    else if (timeframe === "weekly") next.setDate(next.getDate() + 7);
    else if (timeframe === "monthly") next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const formattedDateLabel = useMemo(() => {
    if (timeframe === "daily") {
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      if (isToday)
        return (
          "Today, " +
          selectedDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        );
      return selectedDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (timeframe === "weekly") {
      return `Week of ${selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    }
    return selectedDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, timeframe]);

  // Fetch Leaderboard Data
  const fetchRankings = async () => {
    setLoading(true);

    let startDate: Date;
    let endDate: Date;
    const workingDate = new Date(selectedDate);

    if (timeframe === "daily") {
      startDate = new Date(
        workingDate.getFullYear(),
        workingDate.getMonth(),
        workingDate.getDate(),
        0,
        0,
        0,
      );
      endDate = new Date(
        workingDate.getFullYear(),
        workingDate.getMonth(),
        workingDate.getDate(),
        23,
        59,
        59,
      );
    } else if (timeframe === "weekly") {
      const day = workingDate.getDay();
      const diff = workingDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(workingDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(
        workingDate.getFullYear(),
        workingDate.getMonth(),
        1,
        0,
        0,
        0,
      );
      endDate = new Date(
        workingDate.getFullYear(),
        workingDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
    }

    try {
      const { data: sessions, error: sessionErr } = await supabase
        .from("sessions")
        .select(
          `
          user_id, 
          duration_seconds, 
          chapter,
          aspirants (
            display_name
          )
        `,
        )
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (sessionErr) throw sessionErr;

      const userTotals: Record<
        string,
        { seconds: number; displayName: string; latestChapter?: string }
      > = {};

      sessions?.forEach((s: any) => {
        const uid = s.user_id;
        const profileName = s.aspirants?.display_name || "Aspirant";

        if (!userTotals[uid]) {
          userTotals[uid] = {
            seconds: 0,
            displayName: profileName,
            latestChapter: s.chapter,
          };
        }
        userTotals[uid].seconds += s.duration_seconds || 0;
        if (s.chapter) {
          userTotals[uid].latestChapter = s.chapter;
        }
      });

      const formatted: LeaderboardEntry[] = Object.entries(userTotals)
        .map(([uid, data]) => ({
          user_id: uid,
          display_name: data.displayName,
          total_seconds: data.seconds,
          bio: data.latestChapter || "Tapasya Deep Work Mode",
          rank_trend: "same" as const,
        }))
        .sort((a, b) => b.total_seconds - a.total_seconds);

      setLeaderboard(formatted);
    } catch (err: any) {
      console.error("Leaderboard fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [timeframe, selectedDate, currentUserId]);

  const formatHoursMinutes = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    return `${m}m`;
  };

  return (
    <div className="w-full bg-[#0c0d12]/90 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
      {/* Top Bar: Scope & Timeframe */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center p-1 bg-zinc-900/80 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-950 shadow-md">
            <Globe className="w-3.5 h-3.5" /> Global
          </div>
        </div>

        <div className="flex items-center p-1 bg-zinc-900/80 rounded-2xl border border-white/5">
          {(["daily", "weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                timeframe === t
                  ? "bg-white text-zinc-950 shadow-md"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation Pill */}
      <div className="flex justify-center items-center gap-4 py-2">
        <button
          onClick={handlePrevDate}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="px-6 py-2 bg-zinc-900/90 border border-white/5 rounded-full text-xs font-medium text-zinc-200 tracking-wide shadow-inner">
          {formattedDateLabel}
        </div>

        <button
          onClick={handleNextDate}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Leaderboard Table Header */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-white/5 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-6">
          <span className="w-6 text-center">#</span>
          <span>User</span>
        </div>
        <div className="flex items-center gap-8 pr-2">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      </div>

      {/* Leaderboard Entries List */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="py-16 text-center space-y-2 animate-pulse">
            <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
              Calculating Rankings...
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs font-light">
            No sessions recorded for this date yet. Be the first to lock in! ⚡
          </div>
        ) : (
          leaderboard.map((user, idx) => {
            const isCurrentUser = user.user_id === currentUserId;
            const rank = idx + 1;

            return (
              <div
                key={user.user_id}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all border ${
                  isCurrentUser
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-zinc-900/40 hover:bg-zinc-900/70 border-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-1 w-7 text-xs font-mono font-medium">
                    <span
                      className={
                        rank === 1
                          ? "text-orange-400 font-bold"
                          : rank === 2
                            ? "text-zinc-300"
                            : rank === 3
                              ? "text-amber-500"
                              : "text-zinc-500"
                      }
                    >
                      {rank}
                    </span>
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                  </div>

                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border ${
                      isCurrentUser
                        ? "bg-orange-500 text-zinc-950 border-orange-400"
                        : "bg-zinc-800 text-zinc-200 border-white/5"
                    }`}
                  >
                    {user.display_name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-sm font-medium truncate ${isCurrentUser ? "text-orange-300" : "text-zinc-100"}`}
                      >
                        {user.display_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 truncate font-light mt-0.5">
                      {user.bio}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-2">
                  <span className="font-mono text-sm text-zinc-200 font-medium">
                    {formatHoursMinutes(user.total_seconds)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
