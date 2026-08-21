"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  Send,
  Clock,
  Sparkles,
  MessageSquare,
  Bell,
} from "lucide-react";

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

interface Nudge {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export default function SquadRoom({
  groupId,
  userId,
}: SquadRoomProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [nudgingUser, setNudgingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =========================================================
  // FORMAT DATE + TIME
  // =========================================================

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // FORMAT STUDY TIME
  // =========================================================

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    if (h > 0) {
      return `${h}h ${m}m`;
    }

    return `${m}m ${s}s`;
  };

  // =========================================================
  // FETCH MEMBERS
  // =========================================================

  useEffect(() => {
    const fetchMembersAndProgress = async () => {
      try {
        const { data: memberRows, error: memberError } =
          await supabase
            .from("group_members")
            .select("user_id, joined_at")
            .eq("group_id", groupId);

        if (memberError) {
          console.error("Failed to fetch group members:", memberError);
          return;
        }

        if (!memberRows || memberRows.length === 0) {
          setMembers([]);
          return;
        }

        const userIds = memberRows.map((m) => m.user_id);

        const { data: profiles, error: profileError } =
          await supabase
            .from("aspirants")
            .select("id, display_name")
            .in("id", userIds);

        if (profileError) {
          console.error("Failed to fetch profiles:", profileError);
          return;
        }

        if (!profiles) return;

        const now = new Date();

        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).toISOString();

        const enhancedMembers: Member[] = await Promise.all(
          profiles.map(async (profile) => {
            const memberRow = memberRows.find(
              (m) => m.user_id === profile.id
            );

            const { data: sessions, error: sessionError } =
              await supabase
                .from("sessions")
                .select("duration_seconds, created_at")
                .eq("user_id", profile.id)
                .gte("created_at", startOfDay);

            if (sessionError) {
              console.error(
                "Failed to fetch sessions:",
                sessionError
              );
            }

            const todayTotal = (sessions || []).reduce(
              (acc, curr) =>
                acc + (curr.duration_seconds || 0),
              0
            );

            return {
              id: profile.id,
              display_name:
                profile.display_name || "Aspirant",
              is_studying: false,
              current_session_seconds: 0,
              today_total_seconds: todayTotal,
              joined_at: memberRow?.joined_at,
            };
          })
        );

        setMembers(enhancedMembers);
      } catch (error) {
        console.error("Members error:", error);
      }
    };

    fetchMembersAndProgress();
  }, [groupId]);

  // =========================================================
  // FETCH CHAT MESSAGES
  //
  // IMPORTANT:
  // A NEW MEMBER ONLY SEES MESSAGES CREATED AFTER joined_at.
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async () => {
      try {
        // Find when CURRENT USER joined this squad
        const { data: membership, error: membershipError } =
          await supabase
            .from("group_members")
            .select("joined_at")
            .eq("group_id", groupId)
            .eq("user_id", userId)
            .single();

        if (membershipError) {
          console.error(
            "Could not determine join date:",
            membershipError
          );
          return;
        }

        if (!membership?.joined_at) {
          console.error("No joined_at found for user.");
          return;
        }

        const { data, error } = await supabase
          .from("squad_messages")
          .select(
            "id, group_id, user_id, display_name, message, created_at"
          )
          .eq("group_id", groupId)
          .gte("created_at", membership.joined_at)
          .order("created_at", {
            ascending: true,
          })
          .limit(100);

        if (error) {
          console.error(
            "Failed to fetch squad messages:",
            error
          );
          return;
        }

        if (!data || cancelled) return;

        const formatted: Message[] = data.map((msg) => ({
          id: msg.id,
          user_id: msg.user_id,
          sender_name:
            msg.display_name || "Aspirant",
          message: msg.message,
          created_at: msg.created_at,
        }));

        setMessages(formatted);
      } catch (error) {
        console.error("Messages error:", error);
      }
    };

    fetchMessages();

    // =======================================================
    // REAL-TIME CHAT
    // =======================================================

    const channel = supabase
      .channel(`squad-chat-${groupId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as any;

          const incoming: Message = {
            id: row.id,
            user_id: row.user_id,
            sender_name:
              row.display_name || "Aspirant",
            message: row.message,
            created_at: row.created_at,
          };

          // Don't duplicate a message
          setMessages((prev) => {
            if (
              prev.some(
                (message) => message.id === incoming.id
              )
            ) {
              return prev;
            }

            return [...prev, incoming];
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "Squad chat realtime:",
          status
        );
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [groupId, userId]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const handleSendMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const text = newMessage.trim();

    if (!text || sending) return;

    setSending(true);

    try {
      // Get user's display name
      const { data: profile, error: profileError } =
        await supabase
          .from("aspirants")
          .select("display_name")
          .eq("id", userId)
          .single();

      if (profileError) {
        console.error(
          "Profile fetch error:",
          profileError
        );
      }

      const displayName =
        profile?.display_name || "Aspirant";

      // Optimistic UI:
      // message appears IMMEDIATELY instead of waiting
      // for Supabase/realtime.
      const temporaryId = `temp-${Date.now()}`;

      const optimisticMessage: Message = {
        id: temporaryId,
        user_id: userId,
        sender_name: displayName,
        message: text,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        optimisticMessage,
      ]);

      setNewMessage("");

      // Save to database
      const { data, error } = await supabase
        .from("squad_messages")
        .insert({
          group_id: groupId,
          user_id: userId,
          display_name: displayName,
          message: text,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Failed to send message:",
          error
        );

        // Remove optimistic message
        setMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== temporaryId
          )
        );

        setNewMessage(text);

        alert(
          `Failed to send message: ${error.message}`
        );

        return;
      }

      // Replace temporary message with real DB message
      if (data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === temporaryId
              ? {
                  id: data.id,
                  user_id: data.user_id,
                  sender_name:
                    data.display_name ||
                    displayName,
                  message: data.message,
                  created_at:
                    data.created_at,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
    }
  };

  // =========================================================
  // SEND NUDGE
  // =========================================================

  const handleNudge = async (
    receiverId: string,
    receiverName: string
  ) => {
    if (
      receiverId === userId ||
      nudgingUser === receiverId
    ) {
      return;
    }

    setNudgingUser(receiverId);

    try {
      const { error } = await supabase
        .from("squad_nudges")
        .insert({
          group_id: groupId,

          // Main fields
          sender_id: userId,
          receiver_id: receiverId,

          // Compatibility with your existing schema/policies
          from_user_id: userId,
          to_user_id: receiverId,
        });

      if (error) {
        console.error(
          "Nudge failed:",
          error
        );

        alert(
          `Could not send nudge: ${error.message}`
        );

        return;
      }

      // Small confirmation
      console.log(
        `Nudged ${receiverName}`
      );
    } catch (error) {
      console.error(
        "Nudge error:",
        error
      );
    } finally {
      setTimeout(() => {
        setNudgingUser(null);
      }, 1000);
    }
  };

  // =========================================================
  // NUDGE REALTIME
  // =========================================================

  useEffect(() => {
    const channel = supabase
      .channel(`squad-nudges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_nudges",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const nudge = payload.new as Nudge;

          // Only react to this squad
          if (nudge.group_id !== groupId) {
            return;
          }

          const senderId =
            nudge.sender_id ||
            nudge.from_user_id;

          const { data: sender } =
            await supabase
              .from("aspirants")
              .select("display_name")
              .eq("id", senderId)
              .single();

          const senderName =
            sender?.display_name ||
            "Someone";

          // Browser notification if permission exists
          if (
            typeof window !== "undefined" &&
            "Notification" in window
          ) {
            if (
              Notification.permission ===
              "granted"
            ) {
              new Notification(
                "🔥 Squad Nudge",
                {
                  body: `${senderName} nudged you to study!`,
                }
              );
            }
          }

          // Also show normal alert
          alert(
            `🔥 ${senderName} nudged you to get back to studying!`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, userId]);

  // =========================================================
  // REQUEST NOTIFICATION PERMISSION
  // =========================================================

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full h-[75vh] min-h-[550px] bg-[#0c0d12]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden">

      {/* =====================================================
          LEFT SIDE - LIVE PRESENCE
      ===================================================== */}

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

          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 bg-zinc-950/60 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner"
            >

              <div className="flex items-center gap-3 min-w-0">

                <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xs">
                  {member.display_name
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-zinc-200 truncate max-w-[120px]">
                    {member.display_name}
                  </h4>

                  <p className="text-[10px] font-mono text-zinc-500">
                    Today:{" "}
                    {Math.floor(
                      member.today_total_seconds /
                        3600
                    )}
                    h{" "}
                    {Math.floor(
                      (member.today_total_seconds %
                        3600) /
                        60
                    )}
                    m
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">

                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide bg-zinc-900 text-zinc-400 border border-white/5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-orange-400" />

                  {formatTime(
                    member.today_total_seconds
                  )}
                </span>

                {/* ===============================
                    NUDGE BUTTON
                =============================== */}

                {member.id !== userId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleNudge(
                        member.id,
                        member.display_name
                      )
                    }
                    disabled={
                      nudgingUser === member.id
                    }
                    title={`Nudge ${member.display_name}`}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <Bell className="w-3 h-3" />

                    {nudgingUser ===
                    member.id
                      ? "Sent!"
                      : "Nudge"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center text-zinc-600 text-xs py-10">
              No squad members found.
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE - CHAT
      ===================================================== */}

      <div className="md:col-span-7 flex flex-col bg-transparent justify-between overflow-hidden">

        {/* Header */}

        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">

          <h3 className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" />
            Squad Chat
          </h3>

          <span className="text-[11px] text-zinc-500 font-mono">
            Real-time
          </span>
        </div>

        {/* Messages */}

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs font-light">

              <Sparkles className="w-6 h-6 mb-2 opacity-40" />

              No messages yet.
              <br />

              Start the conversation with your squad!
            </div>
          ) : (
            messages.map((msg) => {

              const isMe =
                msg.user_id === userId;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMe
                      ? "items-end"
                      : "items-start"
                  }`}
                >

                  <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
                    {isMe
                      ? "You"
                      : msg.sender_name}
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

                  {/* DATE + TIME */}

                  <span className="text-[9px] text-zinc-600 font-mono mt-1 px-1">
                    {formatDateTime(
                      msg.created_at
                    )}
                  </span>

                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}

        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-white/5 bg-black/20 flex items-center gap-3"
        >

          <input
            type="text"
            value={newMessage}
            onChange={(e) =>
              setNewMessage(e.target.value)
            }
            placeholder="Motivate your squad..."
            disabled={sending}
            className="flex-1 bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-600 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              sending ||
              !newMessage.trim()
            }
            className="p-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-2xl transition-colors shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>

        </form>
      </div>
    </div>
  );
}