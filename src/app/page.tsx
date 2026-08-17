"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Auth from "../components/Auth";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // If they are already logged in, push them straight to setup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/community");
      setCheckingAuth(false);
    });
  }, [router]);

  if (checkingAuth)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600 font-light">
        Loading...
      </div>
    );

  return (
    <main className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 flex flex-col items-center justify-center p-6 selection:bg-zinc-800 relative">
      {/* Decorative gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-zinc-800/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center text-center max-w-lg">
        <div className="mb-6 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2 text-xs text-zinc-400 font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse"></span>
          Now in Beta for JEE/NEET
        </div>

        <h1 className="text-5xl md:text-7xl font-extralight tracking-tight text-zinc-100 flex items-center justify-center gap-3 mb-6">
          Tapasya{" "}
          <Sparkles
            className="w-8 h-8 md:w-12 md:h-12 text-zinc-600"
            strokeWidth={1}
          />
        </h1>

        <p className="text-zinc-400 font-light text-lg md:text-xl mb-12 leading-relaxed">
          The ultimate deep work workspace. Set your Sankalp, eliminate
          distractions, and climb the AIR leaderboard.
        </p>

        <Auth />

        <div className="mt-12 text-xs text-zinc-600 font-light flex items-center gap-2">
          Secure login via Google <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </main>
  );
}
