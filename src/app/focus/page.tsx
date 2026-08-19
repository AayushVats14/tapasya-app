"use client";

import NotesWidget from "../../components/NotesWidget";
import MusicPlayer from "../../components/MusicPlayer";
import StudyCalendar from "../../components/StudyCalendar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Sankalp from "../../components/Sankalp";
import Leaderboard from "../../components/Leaderboard";
import UsernameSetup from "../../components/UsernameSetup";
import { 
  Users, LogOut, Bell, Zap, X, Clock, Target, Trophy, 
  BarChart2, Settings, User, ChevronRight, Camera 
} from "lucide-react";

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
  const [todaySeconds, setTodaySeconds] = useState(0);
  
  // App Navigation States
  const [activeTab, setActiveTab] = useState<"focus" | "rankings" | "analysis">("focus");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState("");

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
        setEditName(profile.display_name);
      } else {
        setUserName(null);
      }
      setCheckingUsername(false);
      fetchTodayProgress(user.id);
    });
  }, [router]);

  const fetchTodayProgress = async (currentUserId: string) => {
    const now = new Date();
    const startOfDayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select("duration_seconds")
      .eq("user_id", currentUserId)
      .gte("created_at", startOfDayLocal);

    if (!error && data) {
      const total = data.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
      setTodaySeconds(total);
    }
  };

  useEffect(() => {
    if (!userId) return;

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

  const handleSaveProfile = async () => {
    if (!editName.trim() || !userId) return;
    const { error } = await supabase
      .from("aspirants")
      .update({ display_name: editName })
      .eq("id", userId);
    
    if (!error) {
      setUserName(editName);
      setIsProfileModalOpen(false);
    } else {
      alert("Failed to update profile.");
    }
  };

  const formatTodayTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  };

  if (checkingUsername) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs tracking-widest uppercase animate-pulse">
        Loading Workspace...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-x-hidden transition-all duration-700">
      
      {/* Ambient Background Glows */}
      <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`} />
      <div className={`fixed top-3/4 left-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`} />

      {!userName && userId && (
        <UsernameSetup 
          userId={userId} 
          onComplete={async () => {
            const { data: profile } = await supabase
              .from("aspirants")
              .select("display_name")
              .eq("id", userId)
              .single();
            if (profile) {
              setUserName(profile.display_name);
              setEditName(profile.display_name);
            }
          }} 
        />
      )}

      {/* Top Navigation Header - WIDENED & UPDATED WITH USER DROPDOWN */}
      {!isZenMode && (
        <nav className="w-full max-w-5xl flex justify-between items-center mb-6 relative z-30 transition-all duration-500">
          
          {/* Left: Status Indicator */}
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-light bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Workspace</span>
          </div>

          {/* Right: Actions & User Profile */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/community")} 
              className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs tracking-wide transition-colors px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-white/5 shadow-lg"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Discover Squads
            </button>

            {/* User Dropdown Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-3 pr-1 py-1 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-white/5 transition-colors shadow-lg"
              >
                <span className="text-xs text-zinc-300 font-medium hidden sm:block max-w-[100px] truncate">
                  {userName}
                </span>
                <div className="w-7 h-7 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center text-xs font-bold shrink-0">
                  {userName?.slice(0, 2).toUpperCase() || "U"}
                </div>
              </button>

              {/* Glassmorphic Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <span className="text-sm font-medium text-zinc-200 truncate">{userName}</span>
                    <button 
                      onClick={() => setIsUserMenuOpen(false)}
                      className="p-1 rounded-md hover:bg-white/10 text-zinc-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown Options */}
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4" /> Public profile
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>

                    <button 
                      onClick={() => { setIsUserMenuOpen(false); alert("Settings Module Coming Soon!"); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4" /> App settings
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>

                    <div className="h-px w-full bg-white/5 my-1" />

                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4" /> Logout
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Internal Tab Navigation */}
      {!isZenMode && (
        <div className="w-full max-w-5xl flex justify-center mb-8 relative z-10">
          <div className="flex items-center gap-1 p-1.5 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl">
            <button
              onClick={() => setActiveTab("focus")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${activeTab === "focus" ? "bg-zinc-800 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"}`}
            >
              <Target className="w-4 h-4" /> Deep Work
            </button>
            <button
              onClick={() => setActiveTab("rankings")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${activeTab === "rankings" ? "bg-zinc-800 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"}`}
            >
              <Trophy className="w-4 h-4" /> Global Rankings
              {nudges.length > 0 && (
                <span className="ml-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${activeTab === "analysis" ? "bg-zinc-800 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"}`}
            >
              <BarChart2 className="w-4 h-4" /> Analysis
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="w-full max-w-5xl flex flex-col gap-6 relative z-10">
        
        {/* --- TAB 1: FOCUS --- */}
        <div className={`flex flex-col gap-6 transition-all duration-500 ${activeTab === "focus" ? "opacity-100 translate-y-0" : "opacity-0 absolute -translate-x-full pointer-events-none invisible"}`}>
          {!isZenMode && (
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl">
              <h2 className="text-lg font-light text-zinc-100 mb-0.5">What is your objective?</h2>
              <p className="text-zinc-500 text-xs mb-4">Define your micro-commitment before starting.</p>
              <Sankalp />
            </div>
          )}

          <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl flex flex-col items-center justify-center relative min-h-[400px]">
            {!isZenMode && (
              <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-zinc-950/60 rounded-xl border border-white/5 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Today: <strong className="text-zinc-200 font-mono">{formatTodayTime(todaySeconds)}</strong></span>
              </div>
            )}
            <TapasyaTimer userId={userId || undefined} onToggleZen={setIsZenMode} />
          </div>
        </div>

        {/* --- TAB 2: RANKINGS & NUDGES --- */}
        {activeTab === "rankings" && !isZenMode && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            {/* Nudges Panel */}
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
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
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

            {/* Leaderboard */}
            <Leaderboard currentUserId={userId || undefined} />
          </div>
        )}

        {/* --- TAB 3: ANALYSIS --- */}
        {activeTab === "analysis" && !isZenMode && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-light text-zinc-100">Today's Deep Work</h3>
                <p className="text-zinc-500 text-sm mt-1">Total focused time logged across all sessions today.</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-mono text-orange-400 font-light tracking-tight">
                  {formatTodayTime(todaySeconds).replace(/[a-z\s]/gi, '')}
                </span>
                <span className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                  {formatTodayTime(todaySeconds).replace(/[0-9]/g, '').trim() || 'MINS'}
                </span>
              </div>
            </div>
            {userId && <StudyCalendar userId={userId} />}
          </div>
        )}

      </div>

      <div className="w-full max-w-5xl flex justify-center items-center mt-auto pt-10 text-zinc-600 text-xs font-light tracking-widest uppercase relative z-10 pb-4">
        Tapasya Deep Work Engine
      </div>
    
      {/* Floating Widgets */}
      <NotesWidget />
      <MusicPlayer />

      {/* PUBLIC PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0c0d12]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-medium text-white">Public Profile</h2>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex flex-col items-center">
              
              {/* Avatar Upload Placeholder */}
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-4xl font-bold text-zinc-950 shadow-xl transition-all group-hover:opacity-50">
                  {editName?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Avatar Upload (Soon)</p>

              {/* Username Edit Input */}
              <div className="w-full space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">Display Name</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors"
                  placeholder="Enter username"
                />
              </div>

            </div>

            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-end gap-3">
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-zinc-950 transition-colors"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}