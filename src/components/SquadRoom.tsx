"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Send, Clock, Sparkles, MessageSquare, Bell } from "lucide-react";

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
  joined_at?: string;
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

  // New Loading States
  const [sending, setSending] = useState(false);
  const [nudgeSending, setNudgeSending] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // FORMATTING HELPERS
  // ============================================================
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  // ============================================================
  // FETCH MEMBERS + JOIN DATE + STUDY TIME
  // ============================================================
  useEffect(() => {
    const fetchMembersAndProgress = async () => {
      try {
        const { data: memberRows, error: memberError } = await supabase
          .from("group_members")
          .select("user_id, joined_at")
          .eq("group_id", groupId);

        if (memberError || !memberRows || memberRows.length === 0) return;

        // Save current user's join date to state
        const currentMember = memberRows.find(
          (member) => member.user_id === userId,
        );
        if (currentMember?.joined_at) {
          setJoinedAt(currentMember.joined_at);
        }

        const userIds = memberRows.map((member) => member.user_id);

        const { data: profiles } = await supabase
          .from("aspirants")
          .select("id, display_name")
          .in("id", userIds);

        if (!profiles) return;

        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();

        const enhancedMembers: Member[] = await Promise.all(
          profiles.map(async (profile) => {
            const memberRow = memberRows.find((m) => m.user_id === profile.id);

            const { data: sessions } = await supabase
              .from("sessions")
              .select("duration_seconds, created_at")
              .eq("user_id", profile.id)
              .gte("created_at", startOfDay);

            const todayTotal = (sessions || []).reduce(
              (total, session) => total + (session.duration_seconds || 0),
              0,
            );

            return {
              id: profile.id,
              display_name: profile.display_name || "Aspirant",
              is_studying: false,
              current_session_seconds: 0,
              today_total_seconds: todayTotal,
              joined_at: memberRow?.joined_at,
            };
          }),
        );

        setMembers(enhancedMembers);
      } catch (error) {
        console.error("Squad member error:", error);
      }
    };

    if (groupId && userId) {
      fetchMembersAndProgress();
    }
  }, [groupId, userId]);

  // ============================================================
  // FETCH MESSAGES & SUBSCRIBE (FILTERED BY JOIN DATE)
  // ============================================================
  useEffect(() => {
    if (!groupId || !userId || !joinedAt) return;
    let mounted = true;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("squad_messages")
          .select("id, user_id, display_name, message, created_at")
          .eq("group_id", groupId)
          .gte("created_at", joinedAt) // Filter out messages from before they joined
          .order("created_at", { ascending: true })
          .limit(100);

        if (error || !data || !mounted) return;

        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          user_id: msg.user_id,
          sender_name: msg.display_name || "Aspirant",
          message: msg.message,
          created_at: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Message loading error:", error);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room-chat-${groupId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Ignore messages created before this user joined
          if (joinedAt && new Date(newMessage.created_at) < new Date(joinedAt))
            return;

          const incoming: Message = {
            id: newMessage.id,
            user_id: newMessage.user_id,
            sender_name: newMessage.display_name || "Aspirant",
            message: newMessage.message,
            created_at: newMessage.created_at,
          };

          setMessages((previous) => {
            if (previous.some((message) => message.id === incoming.id))
              return previous;
            return [...previous, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [groupId, userId, joinedAt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();

    if (!text || sending) return;

    setSending(true);
    setNewMessage("");

    try {
      const currentUser = members.find((m) => m.id === userId);
      const displayName = currentUser?.display_name || "Aspirant";

      const { error } = await supabase.from("squad_messages").insert({
        group_id: groupId,
        user_id: userId,
        display_name: displayName,
        message: text,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Send message error:", error);
      alert("🚨 Message failed to send: " + error.message);
      setNewMessage(text); // Restore text on fail
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // SEND NUDGE
  // ============================================================
  const handleNudge = async (receiverId: string) => {
    if (receiverId === userId || nudgeSending) return;

    setNudgeSending(receiverId);

    try {
      const { error } = await supabase.from("squad_nudges").insert({
        sender_id: userId,
        receiver_id: receiverId,
      });

      if (error) {
        alert("Failed to send nudge: " + error.message);
      } else {
        alert("⚡ Nudge sent successfully!");
      }
    } catch (error) {
      console.error("Nudge error:", error);
    } finally {
      setNudgeSending(null);
    }
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="w-full h-[75vh] min-h-[550px] bg-[#0c0d12]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden">
      {/* LEFT COLUMN: LIVE PRESENCE */}
      <div className="md:col-span-5 bg-black/40 border-r border-white/5 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <h3 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Presence
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            {members.length} members
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {members.length === 0 ? (
            <div className="text-center text-zinc-600 text-xs py-10">
              No squad members found.
            </div>
          ) : (
            members.map((member) => {
              const isMe = member.id === userId;
              return (
                <div
                  key={member.id}
                  className="p-4 bg-zinc-950/60 rounded-2xl border border-white/5 shadow-inner flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                      {member.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-zinc-200 truncate max-w-[130px]">
                        {member.display_name}
                        {isMe && (
                          <span className="text-orange-400 text-[9px] ml-1">
                            YOU
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Today: {Math.floor(member.today_total_seconds / 3600)}h{" "}
                        {Math.floor((member.today_total_seconds % 3600) / 60)}m
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide bg-zinc-900 text-zinc-400 border border-white/5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-orange-400" />
                      {formatTime(member.today_total_seconds)}
                    </span>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleNudge(member.id)}
                        disabled={nudgeSending === member.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all disabled:opacity-50"
                        title={`Nudge ${member.display_name}`}
                      >
                        <Bell className="w-3 h-3" />
                        {nudgeSending === member.id ? "Sending..." : "Nudge"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SQUAD CHAT */}
      <div className="md:col-span-7 flex flex-col bg-transparent justify-between overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <h3 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" /> Squad Chat
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">
            Encrypted & Real-time
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs font-light">
              <Sparkles className="w-6 h-6 mb-2 opacity-40" />
              <span>No messages yet.</span>
              <span className="mt-1 text-zinc-700">
                Drop a motivation boost for your squad!
              </span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
                    {isMe ? "You" : msg.sender_name}
                  </span>
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-orange-500 text-zinc-950 font-medium rounded-tr-none shadow-lg"
                        : "bg-zinc-900/90 text-zinc-200 border border-white/5 rounded-tl-none shadow-md"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 mt-1 px-1">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-white/5 bg-black/20 flex items-center gap-3"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Motivate your squad..."
            disabled={sending}
            maxLength={1000}
            className="flex-1 bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 rounded-2xl transition-colors shadow-lg flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
