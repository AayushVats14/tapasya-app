"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Target, CheckCircle2, Circle } from "lucide-react";

export default function Sankalp() {
  const [goalText, setGoalText] = useState("");
  const [currentGoal, setCurrentGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayGoal();
  }, []);

  const fetchTodayGoal = async () => {
    // ... (Keep the exact same fetch logic you currently have)
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("sankalp_goals")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setCurrentGoal(data);
    setLoading(false);
  };

  const setSankalp = async () => {
    // ... (Keep the exact same setSankalp logic you currently have)
    if (!goalText.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("sankalp_goals")
      .insert({ user_id: user.id, goal_text: goalText, is_completed: false })
      .select()
      .single();
    if (!error && data) {
      setCurrentGoal(data);
      setGoalText("");
    }
  };

  const toggleCompletion = async () => {
    // ... (Keep the exact same toggle logic you currently have)
    if (!currentGoal) return;
    const newStatus = !currentGoal.is_completed;
    const { error } = await supabase
      .from("sankalp_goals")
      .update({ is_completed: newStatus })
      .eq("id", currentGoal.id);
    if (!error) setCurrentGoal({ ...currentGoal, is_completed: newStatus });
  };

  if (loading) return null;

  return (
    <div className="w-full p-6 bg-zinc-900/20 backdrop-blur-md rounded-2xl border border-white/5">
      {!currentGoal ? (
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Set your micro-commitment for this session..."
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSankalp()}
            className="w-full bg-transparent border-none focus:outline-none text-zinc-300 placeholder:text-zinc-600 font-light text-sm"
          />
        </div>
      ) : (
        <div
          onClick={toggleCompletion}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {currentGoal.is_completed ? (
            <CheckCircle2
              className="w-5 h-5 text-zinc-500 transition-colors"
              strokeWidth={1.5}
            />
          ) : (
            <Circle
              className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors"
              strokeWidth={1.5}
            />
          )}
          <span
            className={`text-sm font-light transition-all duration-300 ${currentGoal.is_completed ? "text-zinc-600 line-through" : "text-zinc-300"}`}
          >
            {currentGoal.goal_text}
          </span>
        </div>
      )}
    </div>
  );
}
