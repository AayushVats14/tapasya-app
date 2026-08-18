"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ExploreSquads from "../../components/ExploreSquads";
import SquadManager from "../../components/SquadManager";
import { ArrowLeft } from "lucide-react";

export default function CommunityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // <-- State tracker for refreshing

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/");
      else setUserId(user.id);
    });
  }, [router]);

  const handleSuccessfulJoin = () => {
    // Increments the key, forcing SquadManager to re-fetch the user's active group
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-8 md:p-12 selection:bg-zinc-800">
      
      {/* Navigation */}
      <nav className="w-full max-w-4xl flex justify-between items-center mb-8">
        <button 
          onClick={() => router.push("/focus")} 
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </button>
        <div className="text-zinc-500 text-sm font-light tracking-widest uppercase">
          Community & Squads Hub
        </div>
      </nav>

      {/* Main Community Hub Layout */}
      <div className="w-full max-w-4xl space-y-8">
        {/* Squad Manager updates automatically via refreshKey */}
        {userId && <SquadManager userId={userId} refreshKey={refreshKey} />}

        {/* Discover Public Squads triggers handleSuccessfulJoin on click */}
        {userId && <ExploreSquads userId={userId} onJoinSuccess={handleSuccessfulJoin} />}
      </div>
      
    </main>
  );
}