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
  Users,
  LogOut,
  Target,
  Trophy,
  BarChart2,
  Settings,
  User,
  ChevronRight,
  Camera,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function FocusPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(true);

  const [needsUsername, setNeedsUsername] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isZenMode, setIsZenMode] = useState(false);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(4 * 3600);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [activeTab, setActiveTab] = useState<"focus" | "rankings" | "analysis">(
    "focus",
  );

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const initApp = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const currentUid = session.user.id;
      setUserId(currentUid);

      const { data: profile } = await supabase
        .from("aspirants")
        .select("display_name")
        .eq("id", currentUid)
        .maybeSingle();

      if (
        !profile ||
        !profile.display_name ||
        profile.display_name.trim() === ""
      ) {
        setNeedsUsername(true);
      } else {
        setUserName(profile.display_name);
        setEditName(profile.display_name);
      }

      setCheckingUsername(false);
      fetchTodayProgress(currentUid);
    };

    initApp();

    const savedTarget = localStorage.getItem("tapasya_daily_target");
    if (savedTarget) {
      setDailyTarget(Number(savedTarget));
    }
  }, [router]);

  const fetchTodayProgress = async (currentUserId: string) => {
    const now = new Date();
    const startOfDayLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select("duration_seconds")
      .eq("user_id", currentUserId)
      .gte("created_at", startOfDayLocal);

    if (!error && data) {
      const total = data.reduce(
        (acc, curr) => acc + (curr.duration_seconds || 0),
        0,
      );
      setTodaySeconds(total);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !userId) return;

    const { error } = await supabase
      .from("aspirants")
      .update({ display_name: editName.trim() })
      .eq("id", userId);

    if (!error) {
      setUserName(editName.trim());
      setEditName(editName.trim());
      setIsProfileModalOpen(false);
    } else {
      alert("Failed to update profile.");
    }
  };

  const handleSetTarget = () => {
    const currentHours = dailyTarget / 3600;
    const input = window.prompt(
      "Set your daily focus target (in hours):",
      currentHours.toString(),
    );

    if (input && !isNaN(Number(input))) {
      const hours = Number(input);
      if (hours <= 0) {
        alert("Please enter a target greater than 0.");
        return;
      }
      const newTarget = hours * 3600;
      setDailyTarget(newTarget);
      localStorage.setItem("tapasya_daily_target", newTarget.toString());
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !userId) return;

    setIsSavingName(true);
    const finalName = setupName.trim();

    try {
      const { error } = await supabase
        .from("aspirants")
        .upsert({ id: userId, display_name: finalName });

      if (error) throw error;

      setUserName(finalName);
      setEditName(finalName);
      setNeedsUsername(false);
    } catch (err: any) {
      alert("Error saving username: " + err.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const formatTodayTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  };

  const progressPercent = Math.min((todaySeconds / dailyTarget) * 100, 100);

  if (checkingUsername) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs tracking-widest uppercase animate-pulse">
        Loading Workspace...
      </div>
    );
  }

  if (needsUsername) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0c0d12]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
          <div className="p-8">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 border border-orange-500/20">
              <Sparkles className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-light text-zinc-100 mb-2">
              Claim your identity.
            </h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              What should your squad call you? This will appear on the global
              leaderboard and inside your live study rooms.
            </p>

            <form onSubmit={handleCompleteSetup} className="space-y-6">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="Enter your display name..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-all shadow-inner placeholder:text-zinc-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingName || !setupName.trim()}
                className="w-full py-4 rounded-2xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]"
              >
                {isSavingName ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Lock it in <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-6 md:p-10 selection:bg-zinc-800 relative overflow-x-hidden transition-all duration-700">
      <div
        className={`fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`}
      />
      <div
        className={`fixed top-3/4 left-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-700 ${isZenMode ? "opacity-20" : "opacity-100"}`}
      />

      {!isZenMode && (
        <nav className="w-full max-w-5xl flex justify-between items-center mb-6 relative z-30 transition-all duration-500">
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-light bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/community")}
              className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs tracking-wide transition-colors px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-white/5 shadow-lg"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Discover Squads
            </button>

            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-3 pr-1 py-1 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-white/5 transition-colors shadow-lg"
              >
                <span className="text-xs text-zinc-300 font-medium hidden sm:block max-w-[100px] truncate">
                  {userName || "Aspirant"}
                </span>
                <div className="w-7 h-7 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center text-xs font-bold shrink-0">
                  {userName?.slice(0, 2).toUpperCase() || "U"}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <span className="text-sm font-medium text-zinc-200 truncate">
                      {userName || "Aspirant"}
                    </span>
                    <button
                      onClick={() => setIsUserMenuOpen(false)}
                      className="p-1 rounded-md hover:bg-white/10 text-zinc-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4" /> Public profile
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        alert("Settings Module Coming Soon!");
                      }}
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

      <div className="w-full max-w-5xl flex flex-col gap-6 relative z-10">
        {/* TAB 1: FOCUS */}
        <div
          className={`flex flex-col gap-6 transition-all duration-500 ${activeTab === "focus" ? "opacity-100 translate-y-0" : "opacity-0 absolute -translate-x-full pointer-events-none invisible"}`}
        >
          {!isZenMode && (
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl">
              <h2 className="text-lg font-light text-zinc-100 mb-0.5">
                What is your objective?
              </h2>
              <p className="text-zinc-500 text-xs mb-4">
                Define your micro-commitment before starting.
              </p>
              <Sankalp
                subject={subject}
                setSubject={setSubject}
                topic={topic}
                setTopic={setTopic}
              />
            </div>
          )}

          <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 p-6 shadow-2xl flex flex-col items-center justify-center relative min-h-[400px]">
            {!isZenMode && (
              <button
                onClick={handleSetTarget}
                className="absolute top-6 left-6 flex flex-col gap-2 px-4 py-3 bg-zinc-950/60 rounded-2xl border border-white/5 text-left transition-all hover:bg-zinc-900/80 hover:border-orange-500/30 group z-10 shadow-lg"
                title="Click to edit daily target"
              >
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    Daily Target:{" "}
                    <strong className="text-zinc-200">
                      {formatTodayTime(dailyTarget)}
                    </strong>
                  </span>
                </div>
                <div className="w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-1000 relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    {progressPercent >= 100 && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-orange-400/80 transition-colors">
                  {formatTodayTime(todaySeconds)} completed (
                  {Math.floor(progressPercent)}%)
                </span>
              </button>
            )}
            <TapasyaTimer
              userId={userId || undefined}
              subject={subject}
              topic={topic}
              onToggleZen={setIsZenMode}
            />
          </div>
        </div>

        {/* TAB 2: RANKINGS */}
        {activeTab === "rankings" && !isZenMode && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            {/* Cleaned out the Nudges panel entirely from here! */}
            <Leaderboard currentUserId={userId || undefined} />
          </div>
        )}

        {/* TAB 3: ANALYSIS */}
        {activeTab === "analysis" && !isZenMode && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-light text-zinc-100">
                  Today's Deep Work
                </h3>
                <p className="text-zinc-500 text-sm mt-1 mb-4">
                  Total focused time logged across all sessions today.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5 max-w-sm">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000 relative"
                      style={{ width: `${progressPercent}%` }}
                    >
                      {progressPercent >= 100 && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
                    {Math.floor(progressPercent)}% of Target
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-5xl font-mono text-orange-400 font-light tracking-tight">
                  {formatTodayTime(todaySeconds).replace(/[a-z\s]/gi, "")}
                </span>
                <span className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                  {formatTodayTime(todaySeconds).replace(/[0-9]/g, "").trim() ||
                    "MINS"}
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
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-4xl font-bold text-zinc-950 shadow-xl transition-all group-hover:opacity-50">
                  {editName?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                Avatar Upload (Soon)
              </p>
              <div className="w-full space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">
                  Display Name
                </label>
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
