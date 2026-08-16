"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Leaderboard from "../../components/Leaderboard";
import SquadRoom from "../../components/SquadRoom";
import { ArrowLeft, Users, Trophy } from "lucide-react";

export default function FocusPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  const [amIStudying, setAmIStudying] = useState(false);
  const [rightPanel, setRightPanel] = useState<"leaderboard" | "chat">(
    "leaderboard",
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        supabase
          .from("aspirants")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile({ ...user, ...data }));
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-8 md:p-12 selection:bg-zinc-800 overflow-x-hidden">
      {/* Top Nav */}
      <nav className="w-full max-w-3xl flex justify-start mb-8 md:mb-12">
        <button
          onClick={() => router.push("/setup")}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Setup
        </button>

        {profile?.group_id && (
          <div className="flex p-1 bg-zinc-900 rounded-full border border-white/5">
            <button
              onClick={() => setRightPanel("leaderboard")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${rightPanel === "leaderboard" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <Trophy className="w-3.5 h-3.5" /> Rankings
            </button>
            <button
              onClick={() => setRightPanel("chat")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${rightPanel === "chat" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <Users className="w-3.5 h-3.5" /> Squad Lounge
            </button>
          </div>
        )}
      </nav>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        {/* Left Column: Timer (Takes up more space on desktop) */}
        <div className="w-full lg:w-1/2">
          <TapasyaTimer
            onTimerStateChange={(isActive) => setAmIStudying(isActive)}
          />
        </div>

        {/* Right Column: Leaderboard (Stacks below timer on mobile) */}
        <div className="w-full lg:w-1/2">
          {rightPanel === "chat" && profile?.group_id ? (
            <SquadRoom
              groupId={profile.group_id}
              userId={profile.id}
              userName={profile.display_name || "Aspirant"}
              isStudying={amIStudying}
            />
          ) : (
            <Leaderboard />
          )}
        </div>
      </div>
    </main>
  );
}
