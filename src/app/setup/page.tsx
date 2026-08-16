"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sankalp from "../../components/Sankalp";
import { ArrowRight, User } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Aspirant");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user)
        router.push("/"); // Kick back to landing if not logged in
      else
        setUserName(user.user_metadata?.full_name?.split(" ")[0] || "Aspirant");
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 sm:p-12 selection:bg-zinc-800">
      {/* Top Nav (Mobile Responsive) */}
      <nav className="w-full max-w-xl flex justify-between items-center mb-16">
        <div className="text-zinc-500 text-sm font-light tracking-widest uppercase">
          Step 1 of 2
        </div>
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <User className="w-4 h-4" /> {userName}
        </div>
      </nav>

      <div className="w-full max-w-xl flex flex-col items-center text-center">
        <h2 className="text-3xl font-extralight text-zinc-100 mb-2">
          What is your objective?
        </h2>
        <p className="text-zinc-500 font-light mb-10 text-sm">
          Define your micro-commitment before entering deep work.
        </p>

        <Sankalp />

        <button
          onClick={() => router.push("/focus")}
          className="mt-12 flex items-center gap-2 px-8 py-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full transition-all text-sm font-medium shadow-lg"
        >
          Proceed to Workspace <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
