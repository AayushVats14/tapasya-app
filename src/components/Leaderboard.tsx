"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Trophy, RefreshCw, Clock, Globe } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_seconds: number;
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "alltime">("today");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchLeaderboard(timeFilter);
  }, [timeFilter]);

  const fetchLeaderboard = async (filter: "today" | "alltime") => {
    setLoading(true);
    let query = supabase
      .from("sessions")
      .select(`user_id, duration_seconds, created_at, aspirants!inner(display_name)`);

    if (filter === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      query = query.gte("created_at", startOfDay.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      const aggregated = data.reduce(
        (acc: Record<string, LeaderboardEntry>, session: any) => {
          const id = session.user_id;
          if (!acc[id]) {
            acc[id] = {
              user_id: id,
              display_name: session.aspirants?.display_name || "Aspirant",
              total_seconds: 0,
            };
          }
          acc[id].total_seconds += session.duration_seconds || 0;
          return acc;
        },
        {},
      );

      setLeaders(
        Object.values(aggregated).sort(
          (a, b) => b.total_seconds - a.total_seconds,
        ),
      );
    }
    setLoading(false);
  };

  const formatTotalTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="w-full p-6 md:p-8 bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl flex flex-col h-full min-h-[400px]">
      
      {/* Header & Time Filters */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-light text-zinc-100 flex items-center gap-2 tracking-wide">
            <Trophy className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            Global Rankings
          </h3>
          <button
            onClick={() => fetchLeaderboard(timeFilter)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Today vs All-Time Tabs */}
        <div className="flex p-1 bg-zinc-950/40 rounded-full border border-white/5">
          <button
            onClick={() => setTimeFilter("today")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${timeFilter === "today" ? "bg-zinc-800 text-zinc-200 shadow-sm" : "text-zinc-500 hover:text-zinc-400"}`}
          >
            Today's Rank
          </button>
          <button
            onClick={() => setTimeFilter("alltime")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${timeFilter === "alltime" ? "bg-zinc-800 text-zinc-200 shadow-sm" : "text-zinc-500 hover:text-zinc-400"}`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex flex-col flex-1">
        {loading ? (
          <div className="w-full text-center text-zinc-600 text-sm animate-pulse mt-8 font-light">
            Syncing rankings...
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-zinc-600 text-center py-8 text-sm font-light">
            {timeFilter === "today" ? "No sessions logged today yet." : "No records found."}
          </p>
        ) : (
          <div className="overflow-y-auto max-h-[320px] pr-2 custom-scrollbar space-y-1">
            {leaders.map((leader, index) => (
              <div
                key={leader.user_id}
                className="flex justify-between items-center py-3 px-2 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] rounded-lg transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-mono w-6 text-center ${index === 0 ? "text-zinc-100 font-bold" : "text-zinc-600"}`}
                  >
                    0{index + 1}
                  </span>
                  <span
                    className={`text-sm font-light tracking-wide ${index === 0 ? "text-white" : "text-zinc-400 group-hover:text-zinc-300"} transition-colors ${currentUserId === leader.user_id ? "font-medium text-orange-400" : ""}`}
                  >
                    {leader.display_name}{" "}
                    {currentUserId === leader.user_id && "(You)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-sm">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span
                    className={
                      index === 0
                        ? "text-zinc-300 font-medium"
                        : "text-zinc-500"
                    }
                  >
                    {formatTotalTime(leader.total_seconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}