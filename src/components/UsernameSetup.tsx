"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { AtSign, ArrowRight } from "lucide-react";

export default function UsernameSetup({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // Check if user already has a username set up when component mounts
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!userId) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("aspirants")
          .select("display_name")
          .eq("id", userId)
          .single();

        // If a display name already exists, skip setup automatically!
        if (!error && data && data.display_name) {
          onComplete();
        }
      } catch (err) {
        console.error("Error checking existing profile:", err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingProfile();
  }, [userId, onComplete]);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setError("Username cannot be empty.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Check if username already exists for another user
      const { data: existingUser } = await supabase
        .from("aspirants")
        .select("id")
        .eq("display_name", cleanUsername)
        .single();

      if (existingUser && existingUser.id !== userId) {
        setError("This username is already taken. Choose another one.");
        setLoading(false);
        return;
      }

      // 2. Insert or update the user profile in aspirants table explicitly with onConflict
      const { error: upsertError } = await supabase
        .from("aspirants")
        .upsert(
          { id: userId, display_name: cleanUsername },
          { onConflict: "id" }
        );

      if (upsertError) throw upsertError;

      onComplete();
    } catch (err: any) {
      setError("Error saving username: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // Don't flash the modal if we're silently checking if they already have a username
  if (checking) {
    return null; 
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-200">
        
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
            <AtSign className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-white">Choose Your Username</h2>
          <p className="text-xs text-zinc-400 font-light">
            This will be your unique handle across global leaderboards and squad chats. You cannot change this later.
          </p>
        </div>

        <form onSubmit={handleSaveUsername} className="space-y-4">
          <div className="relative">
            <AtSign className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="e.g. cosmic_coder"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "_"))}
              className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center font-light">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? "Checking availability..." : "Continue to Workspace"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}