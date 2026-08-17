"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TapasyaTimer from "../../components/Timer";
import Sankalp from "../../components/Sankalp";
import { Users, User } from "lucide-react";

export default function FocusPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Aspirant");
  const [userId, setUserId] = useState<string | null>(null);
  
  // These hold the current objective
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setUserName(user.user_metadata?.full_name?.split(" ")[0] || "Aspirant");
        setUserId(user.id);
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 sm:p-8 md:p-12 selection:bg-zinc-800">
      <nav className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <User className="w-4 h-4" /> {userName}
        </div>
        <button 
          onClick={() => router.push("/community")} 
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors px-4 py-2 bg-zinc-900 rounded-full border border-white/5"
        >
          <Users className="w-4 h-4" /> Community & Squads
        </button>
      </nav>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-12 items-start justify-center mt-8">
        
        {/* Left Side: Objective */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h2 className="text-3xl font-extralight text-zinc-100 mb-2">What is your objective?</h2>
          <p className="text-zinc-500 font-light mb-12 text-sm">Define your micro-commitment before entering deep work.</p>
          <div className="w-full max-w-md">
            {/* Pass the state to Sankalp */}
            <Sankalp subject={subject} setSubject={setSubject} topic={topic} setTopic={setTopic} />
          </div>
        </div>

        {/* Right Side: Timer */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          {/* Pass the state to the Timer */}
          {userId && (
            <TapasyaTimer userId={userId} subject={subject} topic={topic} />
          )}
        </div>

      </div>
    </main>
  );
}