"use client";

import StudyCalendar from "../../components/StudyCalendar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Sankalp from "../../components/Sankalp";
import Leaderboard from "../../components/Leaderboard";
import UsernameSetup from "../../components/UsernameSetup";
import { Users, LogOut } from "lucide-react";

export default function FocusPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.id);

      // Check if user has already set up a username in aspirants table
      const { data: profile } = await supabase
        .from("aspirants")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profile?.display_name) {
        setUserName(profile.display_name);
      } else {
        setUserName(null); // Triggers username setup modal
      }
      setCheckingUsername(false);
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (checkingUsername) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs tracking-widest uppercase animate-pulse">
        Loading Workspace...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 selection:bg-zinc-800">
      
      {/* Username Setup Modal if no username exists */}
      {!userName && userId && (
        <UsernameSetup 
          userId={userId} 
          onComplete={async () => {
            const { data: profile } = await supabase
              .from("aspirants")
              .select("display_name")
              .eq("id", userId)
              .single();
            if (profile) setUserName(profile.display_name);
          }} 
        />
      )}

      {/* Top Navigation Bar */}
      <nav className="w-full max-w-6xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-light bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Workspace / <strong className="text-zinc-200 font-medium">@{userName}</strong></span>
          </div>
          
          <button 
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-zinc-500 hover:text-red-400 bg-zinc-900/30 hover:bg-red-500/10 rounded-full border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={() => router.push("/community")} 
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs tracking-wide transition-colors px-4 py-2 bg-zinc-900/80 hover:bg-zinc-900 rounded-full border border-white/5 shadow-lg"
        >
          <Users className="w-3.5 h-3.5 text-zinc-400" /> Discover Squads
        </button>
      </nav>

      {/* Two-Column Layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-auto">
        
        {/* Left Column Stack (Objective, Timer & Calendar) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
            <h2 className="text-lg font-light text-zinc-100 mb-0.5">What is your objective?</h2>
            <p className="text-zinc-500 text-xs mb-4">Define your micro-commitment before starting.</p>
            <Sankalp />
          </div>

          <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl flex flex-col items-center justify-center">
            <TapasyaTimer />
          </div>

          {/* Monthly Study Heatmap Calendar Added Here */}
          {userId && <StudyCalendar userId={userId} />}
        </div>

        {/* Right Column (Global Rankings) */}
        <div className="lg:col-span-5 flex flex-col">
          <Leaderboard />
        </div>
      </div>

      <div className="w-full max-w-6xl flex justify-center items-center mt-6 text-zinc-600 text-xs font-light tracking-widest uppercase">
        Tapasya Deep Work Engine
      </div>

    </main>
  );
}