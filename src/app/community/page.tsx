"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Search,
  Plus,
  Shield,
  Users,
  ArrowRight,
  Zap,
  Target,
  X,
  FolderHeart,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Squad {
  id: string;
  name: string;
  description: string;
  admin_id?: string;
  host_name?: string;
  member_count: number;
  join_code?: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadDesc, setNewSquadDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSquads();
  }, []);

  const fetchSquads = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (groupsData) {
        const enhancedGroups = await Promise.all(
          groupsData.map(async (group) => {
            let hostDisplayName = "Unknown";
            const hostId = group.admin_id;

            if (hostId && typeof hostId === "string") {
              const { data: hostProfile, error: hostErr } = await supabase
                .from("aspirants")
                .select("display_name")
                .eq("id", hostId)
                .single();

              if (!hostErr && hostProfile) {
                hostDisplayName = hostProfile.display_name;
              }
            }

            const { count, error: countErr } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id);

            return {
              ...group,
              host_name: hostDisplayName,
              member_count: count || 1,
            };
          }),
        );
        setSquads(enhancedGroups);
      }
    } catch (error: any) {
      // Improved error output so it prints the exact error text instead of {}
      const errorMsg = error?.message || JSON.stringify(error, null, 2);
      console.error("Full Error Details:", errorMsg);
      toast.error(`Supabase Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquad = async (squadId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: squadId, user_id: user.id });

    if (!error || error.code === "23505") {
      toast.success("Successfully joined the squad!");
      router.push("/my-squads");
    } else {
      toast.error(`Error joining squad: ${error.message}`);
    }
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadName.trim()) return;

    setIsCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const randomJoinCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { data: newGroup, error: groupErr } = await supabase
        .from("groups")
        .insert({
          name: newSquadName,
          description: newSquadDesc,
          admin_id: user.id,
          join_code: randomJoinCode,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      if (newGroup) {
        const { error: memberErr } = await supabase
          .from("group_members")
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
          });

        if (memberErr) throw memberErr;

        setIsCreateModalOpen(false);
        setNewSquadName("");
        setNewSquadDesc("");
        router.push("/my-squads");
      }
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error, null, 2);
      toast.success(`Failed to create squad: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredSquads = squads.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description &&
        s.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <nav className="w-full max-w-5xl flex flex-wrap justify-between items-center gap-4 mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/focus")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 rounded-full border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Workspace
          </button>

          <button
            onClick={() => router.push("/my-squads")}
            className="flex items-center gap-2 text-zinc-300 hover:text-white text-sm font-medium transition-colors px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-white/10 hover:border-orange-500/30 shadow-md"
          >
            <FolderHeart className="w-4 h-4 text-orange-400" /> My Squads
          </button>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold rounded-full transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
        >
          <Plus className="w-4 h-4" /> Create Squad
        </button>
      </nav>

      <div className="w-full max-w-5xl relative z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
          <div>
            <h1 className="text-3xl font-light text-zinc-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-orange-500" /> Focus Squads
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">
              Join a community of like-minded aspirants and lock in together.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, subject, or goal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c0d12]/80 backdrop-blur-xl border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors shadow-xl"
            />
          </div>
        </div>

        <div className="w-full bg-[#0c0d12]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="hidden md:flex items-center px-6 py-4 border-b border-white/5 bg-white/[0.02] text-xs font-mono uppercase tracking-widest text-zinc-500">
            <div className="w-3/12 pl-2">Name</div>
            <div className="w-4/12">Objective</div>
            <div className="w-2/12">Members</div>
            <div className="w-2/12">Host</div>
            <div className="w-1/12 text-right pr-2">Action</div>
          </div>

          <div className="flex flex-col divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
                  Scanning for Squads...
                </p>
              </div>
            ) : filteredSquads.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-sm font-light flex flex-col items-center gap-2">
                <Target className="w-8 h-8 text-zinc-700 mb-2" />
                No squads found matching "{searchQuery}".
                <br />
                Be the first to create one!
              </div>
            ) : (
              filteredSquads.map((squad) => (
                <div
                  key={squad.id}
                  className="flex flex-col md:flex-row md:items-center px-6 py-5 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="w-full md:w-3/12 flex items-center gap-3 mb-3 md:mb-0 pr-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-zinc-100 font-medium text-sm truncate">
                      {squad.name || "Unnamed Squad"}
                    </span>
                  </div>

                  <div className="w-full md:w-4/12 mb-4 md:mb-0 pr-6">
                    <p className="text-zinc-400 text-sm font-light line-clamp-2 leading-relaxed">
                      {squad.description ||
                        "No specific objective set. Just pure focus."}
                    </p>
                  </div>

                  <div className="w-full md:w-2/12 flex items-center gap-3 mb-3 md:mb-0">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(3, squad.member_count))].map(
                        (_, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#0c0d12] flex items-center justify-center text-[10px] font-bold text-zinc-400 shadow-sm relative"
                            style={{ zIndex: 10 - i }}
                          >
                            <Users className="w-3.5 h-3.5 opacity-50" />
                          </div>
                        ),
                      )}
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {squad.member_count} Locked in
                    </span>
                  </div>

                  <div className="w-full md:w-2/12 flex items-center gap-2 mb-4 md:mb-0">
                    <Shield className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-300 text-sm truncate">
                      {squad.host_name}
                    </span>
                  </div>

                  <div className="w-full md:w-1/12 flex md:justify-end">
                    <button
                      onClick={() => handleJoinSquad(squad.id)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-300 hover:text-orange-400 rounded-xl text-xs font-medium transition-all group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                    >
                      Join <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Squad Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0c0d12]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" /> Create a Squad
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSquad} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">
                  Squad Name
                </label>
                <input
                  type="text"
                  required
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-600"
                  placeholder="e.g., JEE Advanced 2026 Grinders"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">
                  Objective / Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newSquadDesc}
                  onChange={(e) => setNewSquadDesc(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-zinc-600"
                  placeholder="What is this squad focusing on?"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create & Join"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
