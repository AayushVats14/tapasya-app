"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Trophy,
  RefreshCw,
  Clock,
  Globe,
  Users,
  Plus,
  Key,
  LogOut,
} from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_seconds: number;
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"global" | "squad">("global");

  // Squad State
  const [myProfile, setMyProfile] = useState<any>(null);
  const [squadData, setSquadData] = useState<any>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    fetchUserProfile().then(() => fetchLeaderboard(activeTab));
  }, []);

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, myProfile?.group_id]);

  const fetchUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("aspirants")
        .select("*")
        .eq("id", user.id)
        .single();
      setMyProfile(data);
      if (data?.group_id) {
        const { data: group } = await supabase
          .from("groups")
          .select("*")
          .eq("id", data.group_id)
          .single();
        setSquadData(group);
      }
    }
  };

  const fetchLeaderboard = async (tab: "global" | "squad") => {
    setLoading(true);
    let query = supabase
      .from("sessions")
      .select(
        `user_id, duration_seconds, aspirants!inner(display_name, group_id)`,
      );

    // If looking at squad, filter sessions only by users in that squad
    if (tab === "squad" && myProfile?.group_id) {
      query = query.eq("aspirants.group_id", myProfile.group_id);
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

  // --- SQUAD ACTIONS ---
  const createSquad = async () => {
    if (!newSquadName.trim() || !myProfile) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. "X7B9QA"

    // 1. Create Group
    const { data: group } = await supabase
      .from("groups")
      .insert({ name: newSquadName, join_code: code })
      .select()
      .single();
    if (group) {
      // 2. Update User Profile
      await supabase
        .from("aspirants")
        .update({ group_id: group.id })
        .eq("id", myProfile.id);
      await fetchUserProfile();
    }
  };

  const joinSquad = async () => {
    if (!joinCode.trim() || !myProfile) return;
    const { data: group } = await supabase
      .from("groups")
      .select("*")
      .eq("join_code", joinCode.toUpperCase())
      .single();
    if (group) {
      await supabase
        .from("aspirants")
        .update({ group_id: group.id })
        .eq("id", myProfile.id);
      await fetchUserProfile();
    } else {
      alert("Invalid Squad Code!");
    }
  };

  const leaveSquad = async () => {
    if (!myProfile) return;
    await supabase
      .from("aspirants")
      .update({ group_id: null })
      .eq("id", myProfile.id);
    setMyProfile({ ...myProfile, group_id: null });
    setSquadData(null);
    setActiveTab("global");
  };

  const formatTotalTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${totalSeconds % 60}s`;
  };

  return (
    <div className="w-full p-6 md:p-8 bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl flex flex-col h-full min-h-[400px]">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-light text-zinc-100 flex items-center gap-2 tracking-wide">
            <Trophy className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            Rankings
          </h3>
          <button
            onClick={() => fetchLeaderboard(activeTab)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex p-1 bg-zinc-950/50 rounded-full border border-white/5">
          <button
            onClick={() => setActiveTab("global")}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-medium rounded-full transition-all ${activeTab === "global" ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Globe className="w-3.5 h-3.5" /> Global
          </button>
          <button
            onClick={() => setActiveTab("squad")}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-medium rounded-full transition-all ${activeTab === "squad" ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Users className="w-3.5 h-3.5" /> My Squad
          </button>
        </div>
      </div>

      {/* SQUAD SETUP UI (Only shows if tab is squad and user has no group) */}
      {activeTab === "squad" && !myProfile?.group_id ? (
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <p className="text-zinc-400 text-sm font-light mb-4">
              You aren't in a squad. Study with friends for extreme
              accountability.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Plus className="absolute left-4 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="New Squad Name"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zinc-950/50 border border-white/5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
              />
              <button
                onClick={createSquad}
                className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-zinc-100 text-zinc-900 text-xs font-medium rounded-lg"
              >
                Create
              </button>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <span className="text-xs text-zinc-700 uppercase tracking-widest">
                or
              </span>
            </div>

            <div className="relative">
              <Key className="absolute left-4 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Enter 6-Digit Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zinc-950/50 border border-white/5 text-sm text-zinc-300 uppercase focus:outline-none focus:border-zinc-700"
              />
              <button
                onClick={joinSquad}
                className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* LEADERBOARD LIST (Shows for Global, OR if user is in a Squad) */
        <div className="flex flex-col flex-1">
          {activeTab === "squad" && squadData && (
            <div className="flex justify-between items-center px-4 py-3 mb-4 bg-zinc-800/30 rounded-xl border border-white/5">
              <div>
                <p className="text-xs text-zinc-500 font-light uppercase tracking-wide">
                  Squad
                </p>
                <p className="text-sm font-medium text-zinc-200">
                  {squadData.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-mono bg-zinc-950 px-2 py-1 rounded text-zinc-400 border border-white/5"
                  title="Share this code with friends"
                >
                  Code: {squadData.join_code}
                </span>
                <button
                  onClick={leaveSquad}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  title="Leave Squad"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="w-full text-center text-zinc-600 text-sm animate-pulse mt-8 font-light">
              Syncing rankings...
            </div>
          ) : leaders.length === 0 ? (
            <p className="text-zinc-600 text-center py-8 text-sm font-light">
              No sessions logged today.
            </p>
          ) : (
            <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar space-y-1">
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
                      className={`text-sm font-light tracking-wide ${index === 0 ? "text-white" : "text-zinc-400 group-hover:text-zinc-300"} transition-colors ${myProfile?.id === leader.user_id ? "font-medium text-orange-400" : ""}`}
                    >
                      {leader.display_name}{" "}
                      {myProfile?.id === leader.user_id && "(You)"}
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
      )}
    </div>
  );
}
