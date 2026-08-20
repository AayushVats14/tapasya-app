"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User, Sparkles, ArrowRight } from "lucide-react";

export default function UsernameSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUsername();
  }, []);

  const checkUsername = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 1. FIXED: Use maybeSingle() instead of single() so it doesn't crash for brand new users
      const { data, error } = await supabase
        .from("aspirants")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Open the modal if the row doesn't exist AT ALL, or if display_name is empty
      if (!data || !data.display_name || data.display_name.trim() === "") {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !userId) return;

    setSaving(true);
    try {
      // 2. FIXED: Use upsert() to insert the row if they are new, or update it if they somehow exist
      const { error } = await supabase.from("aspirants").upsert({
        id: userId,
        display_name: username.trim(),
      });

      if (error) throw error;

      // Close the modal and reload the page so the app grabs their new name!
      setIsOpen(false);
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to save username: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
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

          <form onSubmit={handleSave} className="space-y-6">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your display name..."
                className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-all shadow-inner placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="w-full py-4 rounded-2xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]"
            >
              {saving ? (
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
    </div>
  );
}
