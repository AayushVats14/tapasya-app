"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Users, Plus, Search } from "lucide-react";

// 1. Accept onJoinSuccess as a prop
export default function ExploreSquads({ userId, onJoinSuccess }: { userId: string; onJoinSuccess?: () => void }) {
  const [squads, setSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOpenSquads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .select(`*, group_members (count)`)
      .eq("is_public", true);

    if (error) {
      console.error("Failed to fetch squads", error);
    } else if (data) {
      const available = data.filter((squad) => {
        const currentMembers = squad.group_members[0]?.count || 0;
        return currentMembers < squad.max_members;
      });
      setSquads(available);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOpenSquads();
  }, []);

  const joinSquad = async (groupId: string, maxMembers: number) => {
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (count && count >= maxMembers) {
      alert("Sorry, this squad just filled up!");
      return;
    }

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId });

    if (error) {
      if (error.code === '23505') { 
        alert("You are already in this squad!");
      } else {
        console.error("Error joining squad:", error.message);
      }
    } else {
      alert("Welcome to the squad! 🔥");
      
      // 2. Also update their legacy group_id field if your app uses it for quick lookups
      await supabase
        .from("aspirants")
        .update({ group_id: groupId })
        .eq("id", userId);

      // 3. Trigger the refresh callback!
      if (onJoinSuccess) onJoinSuccess();
      fetchOpenSquads();
    }
  };

  const filteredSquads = squads.filter((squad) => 
    (squad.name || "Unnamed Squad").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="text-zinc-500 text-sm">Scanning for open squads...</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-white">Discover Squads</h3>
        
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search squads by name..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/10 transition-all"
          />
        </div>
      </div>
      
      {filteredSquads.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          {searchQuery ? "No squads found matching your search." : "No open squads found."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSquads.map((squad) => {
            const currentMembers = squad.group_members[0]?.count || 0;
            
            return (
              <div key={squad.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-900 transition-colors">
                <div>
                  <h4 className="text-zinc-200 font-medium">{squad.name || "Unnamed Squad"}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{currentMembers} / {squad.max_members} Aspirants</span>
                  </div>
                </div>
                <button 
                  onClick={() => joinSquad(squad.id, squad.max_members)}
                  className="p-2 bg-zinc-800 text-zinc-300 rounded-full hover:bg-white hover:text-zinc-900 transition-all"
                  title="Join Squad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}