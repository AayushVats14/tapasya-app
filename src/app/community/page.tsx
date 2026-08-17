"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ExploreSquads from "../../components/ExploreSquads";
import Leaderboard from "../../components/Leaderboard"; // <-- Imported Leaderboard
import { ArrowLeft, User } from "lucide-react";

export default function CommunityPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Aspirant");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/"); // Kick back to landing if not logged in
      } else {
        setUserName(user.user_metadata?.full_name?.split(" ")[0] || "Aspirant");
        setUserId(user.id);
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-8 md:p-12 selection:bg-zinc-800">
      
      {/* Top Nav */}
      <nav className="w-full max-w-6xl flex justify-between items-center mb-12">
        <button 
          onClick={() => router.push("/focus")} 
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </button>
        
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <User className="w-4 h-4" /> {userName}
        </div>
      </nav>

      {/* Side-by-Side Layout */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-12 items-start justify-center">
        
        {/* Left Side: Discover Squads */}
        <div className="w-full lg:w-1/2">
           {userId && <ExploreSquads userId={userId} />}
        </div>

        {/* Right Side: Leaderboard */}
        <div className="w-full lg:w-1/2">
          <Leaderboard />
        </div>

      </div>
    </main>
  );
}