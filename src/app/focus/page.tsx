"use client";

import StudyCalendar from "../../components/StudyCalendar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Sankalp from "../../components/Sankalp";
import Leaderboard from "../../components/Leaderboard";
import UsernameSetup from "../../components/UsernameSetup";
import { Users, LogOut, Bell, Zap, X } from "lucide-react";

interface NudgeNotification {
  id: string;
  sender_name: string;
  created_at: string;
}

export default function FocusPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [nudges, setNudges] = useState<NudgeNotification[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("aspirants")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profile?.display_name) {
        setUserName(profile.display_name);
      } else {
        setUserName(null);
      }
      setCheckingUsername(false);
    });
  }, [router]);

  // Realtime Nudge Listener for the Workspace
  useEffect(() => {
    if (!userId) return;

    // Fetch existing unread nudges if any
    const fetchNudges = async () => {
      const { data } = await supabase
        .from("squad_nudges")
        .select(`id, created_at, sender_id`)
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        const formatted = await Promise.all(
          data.map(async (n: any) => {
            const { data: sender } = await supabase
              .from("aspirants")
              .select("display_name")
              .eq("id", n.sender_id)
              .single();
            return {
              id: n.id,
              sender_name: sender?.display_name || "A squad mate",
              created_at: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          })
        );
        setNudges(formatted);
      }
    };

    fetchNudges();

    // Setup realtime subscription for new incoming nudges
    const channel = supabase
      .channel(`workspace-nudges-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'squad_nudges', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from("aspirants")
            .select("display_name")
            .eq("id", payload.new.sender_id)
            .single();

          const newNudge: NudgeNotification = {
            id: payload.new.id,
            sender_name: sender?.display_name || "A squad mate",
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          setNudges((prev) => [newNudge, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismissNudge = async (id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("squad_nudges").delete().eq("id", id);
  };

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
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-hidden transition-all duration-700">
      
      {/* Ambient Solar Orange Background Glows */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`} />
      <div className={`absolute top-3/4 left-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`} />

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
      {!isZenMode && (
        <nav className="w-full max-w-6xl flex justify-between items-center mb-6 relative z-10 transition-all duration-500">
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
      )}

      {/* Two-Column Layout */}
      <div className={`w-full max-w-6xl grid grid-cols-1 gap-6 items-start my-auto relative z-10 transition-all duration-700 ${isZenMode ? "lg:grid-cols-12 justify-center" : "lg:grid-cols-12"}`}>
        
        {/* Left Column Stack */}
        <div className={`flex flex-col gap-6 transition-all duration-700 ${isZenMode ? "lg:col-span-8 lg:col-start-3" : "lg:col-span-7"}`}>
          {!isZenMode && (
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl">
              <h2 className="text-lg font-light text-zinc-100 mb-0.5">What is your objective?</h2>
              <p className="text-zinc-500 text-xs mb-4">Define your micro-commitment before starting.</p>
              <Sankalp />
            </div>
          )}

          <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl flex flex-col items-center justify-center">
            <TapasyaTimer onToggleZen={setIsZenMode} />
          </div>

          {!isZenMode && userId && <StudyCalendar userId={userId} />}
        </div>

        {/* Right Column (Leaderboard & Dedicated Nudges Notification Panel) */}
        {!isZenMode && (
          <div className="lg:col-span-5 flex flex-col gap-6 transition-all duration-700">
            
            {/* Notification Center / Nudges Panel */}
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-medium text-white">Squad Nudges</h3>
                </div>
                {nudges.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-mono rounded-full border border-orange-500/30">
                    {nudges.length} New
                  </span>
                )}
              </div>

              {nudges.length === 0 ? (
                <p className="text-zinc-500 text-xs font-light py-4 text-center">
                  No active nudges. You're fully locked in! ⚡
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {nudges.map((nudge) => (
                    <div 
                      key={nudge.id}
                      className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-orange-500/20 shadow-lg animate-in fade-in duration-300"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-200 font-medium">@{nudge.sender_name} nudged you!</p>
                          <span className="text-[10px] font-mono text-zinc-500">{nudge.created_at}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissNudge(nudge.id)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard Component */}
            <Leaderboard />
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl flex justify-center items-center mt-6 text-zinc-600 text-xs font-light tracking-widest uppercase relative z-10">
        Tapasya Deep Work Engine
      </div>

    </main>
  );
}