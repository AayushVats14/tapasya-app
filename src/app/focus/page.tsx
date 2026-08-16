"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Leaderboard from "../../components/Leaderboard";
import { ArrowLeft } from "lucide-react";

export default function FocusPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/");
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
      </nav>

      <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        {/* Left Column: Timer (Takes up more space on desktop) */}
        <div className="w-full lg:w-3/5">
          <TapasyaTimer />
        </div>

        {/* Right Column: Leaderboard (Stacks below timer on mobile) */}
        <div className="w-full lg:w-2/5">
          <Leaderboard />
        </div>
      </div>
    </main>
  );
}
