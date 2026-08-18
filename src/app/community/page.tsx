"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SquadManager from "../../components/SquadManager";
import { Users, ArrowLeft } from "lucide-react";

export default function CommunityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [discoverSquads, setDiscoverSquads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDiscover, setLoadingDiscover] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/");
      else setUserId(user.id);
    });
    fetchDiscoverSquads();
  }, [router]);

  const fetchDiscoverSquads = async () => {
    setLoadingDiscover(true);
    const { data } = await supabase
      .from("groups")
      .select("id, name, join_code, admin_id")
      .limit(10);

    setDiscoverSquads(data || []);
    setLoadingDiscover(false);
  };

  const joinPublicSquad = async (groupId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId });

    if (error && error.code !== '23505') {
      alert("Error joining squad.");
    } else {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const filteredSquads = discoverSquads.filter((s) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-hidden">
      
      {/* Ambient Solar Orange Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-3/4 left-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <nav className="w-full max-w-4xl flex justify-between items-center mb-8 relative z-10">
        <button
          onClick={() => router.push("/focus")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs tracking-wide transition-colors px-4 py-2 bg-zinc-900/80 hover:bg-zinc-900 rounded-full border border-white/5 shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </button>
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Community & Squads Hub</span>
      </nav>

      <div className="w-full max-w-4xl space-y-8 relative z-10 my-auto">
        {userId && <SquadManager userId={userId} refreshKey={refreshKey} />}

        <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-medium text-white">Discover Squads</h3>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search squads by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-950/60 border border-white/5 rounded-2xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 transition-all"
          />

          {loadingDiscover ? (
            <p className="text-center py-8 text-zinc-500 text-xs animate-pulse">Loading squads...</p>
          ) : filteredSquads.length === 0 ? (
            <p className="text-center py-8 text-zinc-500 text-sm font-light">No squads found matching your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSquads.map((squad) => (
                <div 
                  key={squad.id} 
                  className="flex justify-between items-center p-4 bg-zinc-950/60 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{squad.name}</p>
                    <span className="text-xs font-mono text-zinc-500 uppercase">Code: {squad.join_code}</span>
                  </div>
                  <button
                    onClick={() => joinPublicSquad(squad.id)}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-medium rounded-xl transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl flex justify-center items-center mt-8 text-zinc-600 text-xs font-light tracking-widest uppercase relative z-10">
        Tapasya Squad Engine
      </div>

    </main>
  );
}