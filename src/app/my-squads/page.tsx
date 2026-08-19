"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  ArrowLeft, Users, Shield, Copy, Check, 
  LogOut, Compass, Sparkles, Zap, MessageSquare, Clock 
} from "lucide-react";
import SquadRoom from "../../components/SquadRoom"; // 👈 Importing your existing component!

interface MySquad {
  id: string;
  name: string;
  description: string;
  join_code: string;
  admin_id: string;
  isAdmin: boolean;
  member_count: number;
}

export default function MySquadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRoomId = searchParams.get("room");

  const [squads, setSquads] = useState<MySquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchMySquads();
  }, []);

  const fetchMySquads = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUserId(user.id);

      const { data: memberships, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberErr) throw memberErr;

      const groupIds = (memberships || []).map((m) => m.group_id);

      if (groupIds.length === 0) {
        setSquads([]);
        setLoading(false);
        return;
      }

      const { data: groupsData, error: groupsErr } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupsErr) throw groupsErr;

      const enhanced: MySquad[] = await Promise.all(
        (groupsData || []).map(async (g) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id);

          return {
            id: g.id,
            name: g.name || "Unnamed Squad",
            description: g.description || "No description provided.",
            join_code: g.join_code || "------",
            admin_id: g.admin_id,
            isAdmin: g.admin_id === user.id,
            member_count: count || 1,
          };
        })
      );

      setSquads(enhanced);
    } catch (err: any) {
      console.error("Error fetching my squads:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLeaveSquad = async (groupId: string) => {
    if (!currentUserId) return;
    const confirm = window.confirm("Are you sure you want to leave this squad?");
    if (!confirm) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", currentUserId);

    if (!error) {
      setSquads((prev) => prev.filter((s) => s.id !== groupId));
    } else {
      alert("Failed to leave squad: " + error.message);
    }
  };

  // IF A ROOM IS SELECTED, RENDER THE LIVE SQUAD ROOM VIEW WITH CHAT & LIVE TIMERS
  if (activeRoomId && currentUserId) {
    const activeSquad = squads.find(s => s.id === activeRoomId);
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-6 md:p-10 relative">
        <div className="w-full max-w-5xl flex justify-between items-center mb-6">
          <button 
            onClick={() => router.push("/my-squads")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 rounded-full border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Squads
          </button>
          <span className="text-zinc-300 font-medium text-sm">
            Room: <strong className="text-orange-400">{activeSquad?.name || "Squad Room"}</strong>
          </span>
        </div>

        <div className="w-full max-w-5xl">
          {/* Renders your live chat & member timers component */}
          <SquadRoom groupId={activeRoomId} userId={currentUserId} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-x-hidden">
      
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <nav className="w-full max-w-5xl flex justify-between items-center mb-10 relative z-10">
        <button 
          onClick={() => router.push("/focus")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 rounded-full border border-white/5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </button>

        <button 
          onClick={() => router.push("/community")}
          className="flex items-center gap-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-medium rounded-full transition-all border border-white/10 hover:border-orange-500/30"
        >
          <Compass className="w-4 h-4 text-orange-400" /> Discover All Squads
        </button>
      </nav>

      {/* Content Area */}
      <div className="w-full max-w-5xl relative z-10 flex flex-col gap-6">
        
        <div className="mb-2">
          <h1 className="text-3xl font-light text-zinc-100 flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-500" /> My Squads
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            Manage the squads you're actively grinding with and share invite codes.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Loading Your Squads...</p>
          </div>
        ) : squads.length === 0 ? (
          <div className="w-full bg-[#0c0d12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/20">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-200">You haven't joined any squads yet</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm">
                Join a squad to study together and push each other up the global rankings.
              </p>
            </div>
            <button
              onClick={() => router.push("/community")}
              className="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-sm rounded-full transition-all shadow-lg"
            >
              Explore Public Squads
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {squads.map((squad) => (
              <div 
                key={squad.id}
                className="bg-[#0c0d12]/90 backdrop-blur-2xl border border-white/10 hover:border-orange-500/30 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-zinc-100 font-semibold text-base line-clamp-1">{squad.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {squad.isAdmin && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              HOST
                            </span>
                          )}
                          <span className="text-xs text-zinc-500 font-mono">
                            {squad.member_count} member{squad.member_count > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyCode(squad.join_code, squad.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-white/5 rounded-xl text-xs font-mono text-zinc-300 transition-colors"
                      title="Click to copy invite code"
                    >
                      <span>{squad.join_code}</span>
                      {copiedId === squad.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </button>
                  </div>

                  <p className="text-zinc-400 text-sm font-light leading-relaxed mb-6 line-clamp-3">
                    {squad.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleLeaveSquad(squad.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Leave Squad
                  </button>

                  {/* Clicking this now opens the live room view with chat and timers */}
                  <button
                    onClick={() => router.push(`/my-squads?room=${squad.id}`)}
                    className="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 text-xs font-semibold rounded-xl border border-white/10 hover:border-transparent transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Enter Live Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}