"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { User, Sparkles, ArrowRight, GraduationCap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface UsernameSetupProps {
  userId: string;
  onComplete: (newName: string) => void;
}

export default function UsernameSetup({
  userId,
  onComplete,
}: UsernameSetupProps) {
  const [username, setUsername] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [otherExam, setOtherExam] = useState("");
  const [saving, setSaving] = useState(false);

  const finalExam = targetExam === "OTHER" ? otherExam.trim() : targetExam;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !finalExam || !userId) return;

    setSaving(true);

    try {
      const { error } = await supabase.from("aspirants").upsert({
        id: userId,
        display_name: username.trim(),
        target_exam: finalExam,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error(
            "That username is already taken. Please choose another one.",
          );
          return;
        }

        throw error;
      }

      onComplete(username.trim());
    } catch (error: any) {
      toast.error(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-8">
          {/* Icon */}
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 border border-orange-500/20">
            <Sparkles className="w-6 h-6" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-light text-zinc-100 mb-2">
            Set up your identity.
          </h2>

          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Choose a unique username and tell us which exam you're preparing
            for.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2 ml-1">
                Username
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

                <input
                  type="text"
                  required
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-all shadow-inner placeholder:text-zinc-600"
                />
              </div>

              <p className="text-[11px] text-zinc-600 mt-2 ml-1">
                This username will be visible to other aspirants.
              </p>
            </div>

            {/* Target Exam */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2 ml-1">
                Target Exam
              </label>

              <div className="grid grid-cols-3 gap-3">
                {/* JEE */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetExam("JEE");
                    setOtherExam("");
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left ${
                    targetExam === "JEE"
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                      : "border-white/10 bg-zinc-900/80 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 mb-2" />

                  <div className="font-medium text-sm">JEE</div>

                  <div className="text-[11px] text-zinc-600 mt-1">
                    Engineering
                  </div>
                </button>

                {/* NEET */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetExam("NEET");
                    setOtherExam("");
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left ${
                    targetExam === "NEET"
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                      : "border-white/10 bg-zinc-900/80 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 mb-2" />

                  <div className="font-medium text-sm">NEET</div>

                  <div className="text-[11px] text-zinc-600 mt-1">Medical</div>
                </button>

                {/* OTHER */}
                <button
                  type="button"
                  onClick={() => setTargetExam("OTHER")}
                  className={`p-4 rounded-2xl border transition-all text-left ${
                    targetExam === "OTHER"
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                      : "border-white/10 bg-zinc-900/80 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 mb-2" />

                  <div className="font-medium text-sm">Other</div>

                  <div className="text-[11px] text-zinc-600 mt-1">My exam</div>
                </button>
              </div>
            </div>

            {/* Other Exam Input */}
            {targetExam === "OTHER" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs text-zinc-500 mb-2 ml-1">
                  Enter your exam
                </label>

                <input
                  type="text"
                  required
                  maxLength={50}
                  value={otherExam}
                  onChange={(e) => setOtherExam(e.target.value)}
                  placeholder="e.g. UPSC, GATE, CAT, BITSAT..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-4 py-4 text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !username.trim() || !finalExam}
              className="w-full py-4 rounded-2xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
