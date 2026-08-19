"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Send, Flame, Clock, User, Sparkles, MessageSquare } from "lucide-react";

interface SquadRoomProps {
  groupId: string;
  userId: string;
}

interface Member {
  id: string;
  display_name: string;
  is_studying: boolean;
  current_session_seconds: number;
  today_total_seconds: number;
}

interface Message {
  id: string;
  user_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export default function SquadRoom({ groupId, userId }: SquadRoomProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Squad Members & Their Live Status
  useEffect(() => {
    const fetchMembersAndProgress = async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (!memberRows) return;

      const userIds = memberRows.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("aspirants")
        .select("id, display_name")
        .in("id", userIds);

      if (!profiles) return;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const enhancedMembers: Member[] = await Promise.all(
        profiles.map(async (p) => {
          const { data: sessions } = await supabase
            .from("sessions")
            .select("duration_seconds, created_at")
            .eq("user_id", p.id)
            .gte("created_at", startOfDay);

          const todayTotal = (sessions || []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);

          return {
            id: p.id,
            display_name: p.display_name || "Aspirant",
            is_studying: false,
            current_session_seconds: 0,
            today_total_seconds: todayTotal,
          };
        })
      );

      setMembers(enhancedMembers);
    };

    fetchMembersAndProgress();
  }, [groupId]);

  // 2. Fetch Chat Messages & Subscribe to Real-Time Updates
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("squad_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) {
        const formatted = await Promise.all(
          data.map(async (msg: any) => {
            const { data: profile } = await supabase
              .from("aspirants")
              .select("display_name")
              .eq("id", msg.user_id)
              .single();

            return {
              id: msg.id,
              user_id: msg.user_id,
              sender_name: profile?.display_name || "Aspirant",
              message: msg.message,
              created_at: msg.created_at,
            };
          })
        );
        setMessages(formatted);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room-chat-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from("aspirants")
            .select("display_name")
            .eq("id", payload.new.user_id)
            .single();

          const incoming: Message = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            sender_name: profile?.display_name || "Aspirant",
            message: payload.new.message,
            created_at: payload.new.created_at,
          };

          setMessages((prev) => [...prev, incoming]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage("");

    await supabase.from("squad_messages").insert({
      group_id: groupId,
      user_id: userId,
      message: text,
    });
  };

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full h-[75vh] min-h-[550px] bg-[#0c0d12]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden">
      
      {/* LEFT COLUMN: LIVE PRESENCE & TIMERS */}
      <div className="md:col-span-5 bg-black/40 border-r border-white/5 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <h3 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Presence
          </h3>
          <span className="text-xs font-mono text-zinc-500">{members.length} members</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {members.map((member) => (
            <div 
              key={member.id}
              className="p-4 bg-zinc-950/60 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xs">
                  {member.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-200 truncate max-w-[120px]">{member.display_name}</h4>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Today: {Math.floor(member.today_total_seconds / 3600)}h {Math.floor((member.today_total_seconds % 3600) / 60)}m
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide bg-zinc-900 text-zinc-400 border border-white/5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {formatTime(member.today_total_seconds)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: SQUAD CHAT */}
      <div className="md:col-span-7 flex flex-col bg-transparent justify-between overflow-hidden">
        
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <h3 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" /> Squad Chat
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">Encrypted & Real-time</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs font-light">
              <Sparkles className="w-6 h-6 mb-2 opacity-40" />
              No messages yet. Drop a motivation boost for your squad!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === userId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
                    {isMe ? "You" : msg.sender_name}
                  </span>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMe 
                      ? "bg-orange-500 text-zinc-950 font-medium rounded-tr-none shadow-lg" 
                      : "bg-zinc-900/90 text-zinc-200 border border-white/5 rounded-tl-none shadow-md"
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/20 flex items-center gap-3">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Motivate your squad..."
            className="flex-1 bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-600"
          />
          <button 
            type="submit"
            className="p-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-2xl transition-colors shadow-lg flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}