"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { LogOut, User } from "lucide-react";

export default function Auth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Updated to route users directly to the workspace
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/focus` : "",
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-white/5 pl-4 pr-2 py-2 rounded-full shadow-lg">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
          <p className="text-sm text-zinc-300 font-light tracking-wide">
            {user.user_metadata?.full_name?.split(" ")[0] || "Aspirant"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-full transition-colors"
          title="Log out"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGoogleLogin}
      className="flex items-center gap-3 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}