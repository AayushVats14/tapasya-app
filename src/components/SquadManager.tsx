"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  Users,
  Plus,
  Key,
  LogOut,
  X,
  Clock,
  Trophy,
  MessageSquare,
  Send,
  Zap,
} from "lucide-react";

interface MemberProgress {
  user_id: string;
  display_name: string;
  total_seconds: number;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  display_name?: string;
}

export default function SquadManager({
  userId,
  refreshKey,
}: {
  userId: string;
  refreshKey: number;
}) {
  const [mySquads, setMySquads] = useState<any[]>([]);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [selectedSquad, setSelectedSquad] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<
    "progress" | "chat"
  >("progress");

  const [membersProgress, setMembersProgress] = useState<MemberProgress[]>(
    [],
  );
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [incomingNudge, setIncomingNudge] = useState<string | null>(null);

  // =========================================================
  // FETCH USER'S SQUADS
  // =========================================================

  const fetchUserSquads = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("group_members")
      .select(`
        group_id,
        joined_at,
        groups (
          id,
          name,
          join_code
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to fetch squads:", error.message);
      return;
    }

    if (data) {
      const squads = data
        .map((item: any) => ({
          ...item.groups,
          joined_at: item.joined_at,
        }))
        .filter(Boolean);

      setMySquads(squads);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserSquads();
    }
  }, [userId, refreshKey]);

  // =========================================================
  // INCOMING NUDGES
  // =========================================================

  useEffect(() => {
    if (!userId) return;

    const nudgeChannel = supabase
      .channel(`modal-nudges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_nudges",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const { data: sender } = await supabase
            .from("aspirants")
            .select("display_name")
            .eq("id", payload.new.sender_id)
            .single();

          const senderName = sender?.display_name || "A squad mate";

          setIncomingNudge(
            `@${senderName} just nudged you to get back to work! ⚡`,
          );

          setTimeout(() => {
            setIncomingNudge(null);
          }, 6000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nudgeChannel);
    };
  }, [userId]);

  // =========================================================
  // LOAD SQUAD PROGRESS
  // =========================================================

  const loadSquadProgress = async (groupId: string) => {
    setLoadingProgress(true);

    const { data: members, error: memError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (
      memError ||
      !members ||
      members.length === 0
    ) {
      setMembersProgress([]);
      setLoadingProgress(false);
      return;
    }

    const memberIds = members.map((m: any) => m.user_id);

    const { data: profileData, error: profileError } = await supabase
      .from("aspirants")
      .select("id, display_name")
      .in("id", memberIds);

    if (profileError) {
      console.error(
        "Failed to load squad profiles:",
        profileError.message,
      );
    }

    const now = new Date();

    const startOfDayLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();

    const { data: sessions, error: sessError } = await supabase
      .from("sessions")
      .select("user_id, duration_seconds, created_at")
      .in("user_id", memberIds)
      .gte("created_at", startOfDayLocal);

    if (sessError) {
      console.error(
        "Error loading sessions:",
        sessError.message,
      );
    }

    const progressMap: Record<string, number> = {};

    sessions?.forEach((session: any) => {
      progressMap[session.user_id] =
        (progressMap[session.user_id] || 0) +
        (session.duration_seconds || 0);
    });

    const formattedList: MemberProgress[] = (
      profileData || []
    )
      .map((profile: any) => ({
        user_id: profile.id,
        display_name:
          profile.display_name || "Aspirant",
        total_seconds:
          progressMap[profile.id] || 0,
      }))
      .sort(
        (a, b) =>
          b.total_seconds - a.total_seconds,
      );

    setMembersProgress(formattedList);
    setLoadingProgress(false);
  };

  // =========================================================
  // LOAD CHAT
  // ONLY SHOW MESSAGES AFTER USER JOINED
  // =========================================================

  const loadSquadChat = async (groupId: string) => {
    // First get this user's join time
    const { data: membership, error: membershipError } =
      await supabase
        .from("group_members")
        .select("joined_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .single();

    if (membershipError) {
      console.error(
        "Failed to get membership:",
        membershipError.message,
      );

      setMessages([]);
      return;
    }

    const joinedAt = membership?.joined_at;

    if (!joinedAt) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("squad_messages")
      .select(
        "id, group_id, user_id, display_name, message, created_at",
      )
      .eq("group_id", groupId)
      .gte("created_at", joinedAt)
      .order("created_at", {
        ascending: true,
      })
      .limit(100);

    if (error) {
      console.error(
        "Failed to load messages:",
        error.message,
      );
      return;
    }

    setMessages(data || []);
  };

  // =========================================================
  // SQUAD CHAT REALTIME
  // =========================================================

  useEffect(() => {
    if (!selectedSquad || !userId) return;

    const groupId = selectedSquad.id;

    loadSquadChat(groupId);

    const channel = supabase
      .channel(`squad-manager-chat-${groupId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newRow = payload.new as any;

          setMessages((prev) => {
            // Don't add duplicate
            if (
              prev.some(
                (message) =>
                  message.id === newRow.id,
              )
            ) {
              return prev;
            }

            // If it is our optimistic message,
            // replace it with the real DB message.
            const optimisticIndex =
              prev.findIndex(
                (message) =>
                  message.id.startsWith("temp-") &&
                  message.user_id === newRow.user_id &&
                  message.message === newRow.message,
              );

            if (optimisticIndex !== -1) {
              const updated = [...prev];

              updated[optimisticIndex] = {
                id: newRow.id,
                user_id: newRow.user_id,
                message: newRow.message,
                display_name:
                  newRow.display_name ||
                  "Aspirant",
                created_at: newRow.created_at,
              };

              return updated;
            }

            return [
              ...prev,
              {
                id: newRow.id,
                user_id: newRow.user_id,
                message: newRow.message,
                display_name:
                  newRow.display_name ||
                  "Aspirant",
                created_at: newRow.created_at,
              },
            ];
          });
        },
      )
      .subscribe((status) => {
        console.log(
          "Squad manager chat realtime:",
          status,
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSquad?.id, userId]);

  // =========================================================
  // REALTIME SESSION UPDATES
  // =========================================================

  useEffect(() => {
    if (!selectedSquad) return;

    const sessionChannel = supabase
      .channel(
        `squad-sessions-${selectedSquad.id}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessions",
        },
        () => {
          loadSquadProgress(selectedSquad.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [selectedSquad?.id]);

  // =========================================================
  // OPEN SQUAD
  // =========================================================

  const openSquadModal = async (squad: any) => {
    setSelectedSquad(squad);
    setActiveModalTab("progress");
    setMessages([]);

    await loadSquadProgress(squad.id);
    await loadSquadChat(squad.id);
  };

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop =
        chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeModalTab]);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendChatMessage = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const text = newMessage.trim();

    if (!text) return;
    if (!selectedSquad) return;
    if (!userId) return;
    if (sending) return;

    // Get username
    const { data: profile, error: profileError } =
      await supabase
        .from("aspirants")
        .select("display_name")
        .eq("id", userId)
        .single();

    if (profileError) {
      console.error(
        "Failed to get username:",
        profileError.message,
      );

      alert(
        "Could not get your username. Please try again.",
      );

      return;
    }

    const senderName =
      profile?.display_name || "Aspirant";

    // Clear input immediately
    setNewMessage("");

    // Optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const optimisticMessage: ChatMessage = {
      id: tempId,
      user_id: userId,
      display_name: senderName,
      message: text,
      created_at: new Date().toISOString(),
    };

    // Show immediately
    setMessages((prev) => [
      ...prev,
      optimisticMessage,
    ]);

    setSending(true);

    try {
      const { data, error } = await supabase
        .from("squad_messages")
        .insert({
          group_id: selectedSquad.id,
          user_id: userId,
          display_name: senderName,
          message: text,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Failed to send message:",
          error.message,
        );

        setMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== tempId,
          ),
        );

        setNewMessage(text);

        alert(
          `Failed to send message: ${error.message}`,
        );

        return;
      }

      if (data) {
        const realMessage: ChatMessage = {
          id: data.id,
          user_id: data.user_id,
          display_name:
            data.display_name ||
            senderName,
          message: data.message,
          created_at: data.created_at,
        };

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? realMessage
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error(
        "Unexpected send error:",
        error,
      );

      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== tempId,
        ),
      );

      setNewMessage(text);

      alert(
        "Something went wrong while sending the message.",
      );
    } finally {
      setSending(false);
    }
  };

  // =========================================================
  // CREATE SQUAD
  // =========================================================

  const createSquad = async () => {
    if (!newSquadName.trim() || !userId) return;

    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const { data: group, error: groupError } =
      await supabase
        .from("groups")
        .insert({
          name: newSquadName.trim(),
          join_code: code,
          admin_id: userId,
        })
        .select()
        .single();

    if (groupError) {
      alert(
        "Error creating squad: " +
          groupError.message,
      );
      return;
    }

    if (group) {
      const { error: memberError } =
        await supabase
          .from("group_members")
          .insert({
            group_id: group.id,
            user_id: userId,
            joined_at:
              new Date().toISOString(),
          });

      if (memberError) {
        alert(
          "Squad created, but joining failed: " +
            memberError.message,
        );
        return;
      }

      setNewSquadName("");
      fetchUserSquads();
    }
  };

  // =========================================================
  // JOIN SQUAD
  // =========================================================

  const joinSquad = async () => {
    if (!joinCode.trim() || !userId) return;

    const { data: group, error } =
      await supabase
        .from("groups")
        .select("*")
        .eq(
          "join_code",
          joinCode.trim().toUpperCase(),
        )
        .single();

    if (error || !group) {
      alert("Invalid Squad Code!");
      return;
    }

    const { error: joinError } =
      await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: userId,
          joined_at:
            new Date().toISOString(),
        });

    if (
      joinError &&
      joinError.code !== "23505"
    ) {
      alert(
        "Error joining squad: " +
          joinError.message,
      );
    } else {
      setJoinCode("");
      fetchUserSquads();
    }
  };

  // =========================================================
  // LEAVE SQUAD
  // =========================================================

  const leaveSquad = async (
    groupId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    const { error } = await supabase
      .from("group_members")
      .delete()
      .match({
        group_id: groupId,
        user_id: userId,
      });

    if (error) {
      alert(
        "Failed to leave squad: " +
          error.message,
      );
      return;
    }

    if (selectedSquad?.id === groupId) {
      setSelectedSquad(null);
      setMessages([]);
    }

    fetchUserSquads();
  };

  // =========================================================
  // FORMAT STUDY TIME
  // =========================================================

  const formatTime = (
    totalSeconds: number,
  ) => {
    const h = Math.floor(
      totalSeconds / 3600,
    );

    const m = Math.floor(
      (totalSeconds % 3600) / 60,
    );

    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h}h ${m}m`;
    }

    if (m > 0) {
      return `${m}m ${s}s`;
    }

    return `${s}s`;
  };

  // =========================================================
  // FORMAT MESSAGE DATE + TIME
  // =========================================================

  const formatMessageDate = (
    timestamp: string,
  ) => {
    const date = new Date(timestamp);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-xl space-y-6">

      {/* HEADER */}

      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-zinc-400" />

        <h3 className="text-lg font-medium text-white">
          My Squad Management
        </h3>
      </div>

      {/* ACTIVE SQUADS */}

      {mySquads.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Your Active Squads
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mySquads.map((squad) => (
              <div
                key={squad.id}
                onClick={() =>
                  openSquadModal(squad)
                }
                className="flex justify-between items-center px-4 py-3 bg-zinc-950/60 rounded-2xl border border-white/5 hover:border-orange-500/20 cursor-pointer transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100 group-hover:text-white">
                    {squad.name}
                  </p>

                  <span className="text-xs font-mono text-zinc-500">
                    Code: {squad.join_code}
                  </span>
                </div>

                <button
                  onClick={(e) =>
                    leaveSquad(
                      squad.id,
                      e,
                    )
                  }
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-xl hover:bg-zinc-900"
                  title="Leave Squad"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-zinc-400 text-sm font-light">
          You aren't in any squads yet.
          Create your own or join an existing
          one below.
        </p>
      )}

      {/* CREATE / JOIN */}

      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">
          Create or Join Another Squad
        </p>

        <div className="flex flex-col sm:flex-row gap-3">

          {/* CREATE */}

          <div className="relative flex-1">
            <Plus className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />

            <input
              type="text"
              placeholder="New Squad Name"
              value={newSquadName}
              onChange={(e) =>
                setNewSquadName(
                  e.target.value,
                )
              }
              className="w-full pl-11 pr-20 py-3 rounded-xl bg-zinc-950/60 border border-white/5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/30"
            />

            <button
              onClick={createSquad}
              className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium rounded-lg transition-colors"
            >
              Create
            </button>
          </div>

          {/* JOIN */}

          <div className="relative flex-1">
            <Key className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />

            <input
              type="text"
              placeholder="Enter 6-Digit Code"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value.toUpperCase(),
                )
              }
              className="w-full pl-11 pr-20 py-3 rounded-xl bg-zinc-950/60 border border-white/5 text-sm text-zinc-200 uppercase placeholder-zinc-600 focus:outline-none focus:border-orange-500/30"
            />

            <button
              onClick={joinSquad}
              className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
            >
              Join
            </button>
          </div>

        </div>
      </div>

      {/* =====================================================
          SQUAD MODAL
      ===================================================== */}

      {selectedSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[600px] relative">

            {/* NUDGE */}

            {incomingNudge && (
              <div className="absolute top-4 left-6 right-6 z-50 bg-orange-500 text-zinc-950 px-4 py-3 rounded-2xl text-xs font-medium shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {incomingNudge}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setIncomingNudge(null)
                  }
                  className="font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* HEADER */}

            <div className="flex justify-between items-center pb-4 border-b border-white/5">

              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-widest">
                  Squad Command Center
                </span>

                <h4 className="text-xl font-medium text-white flex items-center gap-2 mt-0.5">
                  <Trophy className="w-5 h-5 text-orange-400" />
                  {selectedSquad.name}
                </h4>
              </div>

              <button
                onClick={() => {
                  setSelectedSquad(null);
                  setMessages([]);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* TABS */}

            <div className="flex p-1 bg-zinc-900/60 rounded-xl border border-white/5 my-4">

              <button
                onClick={() =>
                  setActiveModalTab(
                    "progress",
                  )
                }
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg ${
                  activeModalTab ===
                  "progress"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Today's Progress
              </button>

              <button
                onClick={() =>
                  setActiveModalTab("chat")
                }
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg ${
                  activeModalTab === "chat"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Chat
              </button>

            </div>

            {/* =================================================
                PROGRESS
            ================================================= */}

            {activeModalTab ===
              "progress" && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">

                {loadingProgress ? (
                  <p className="text-center py-12 text-zinc-500 text-sm">
                    Loading members progress...
                  </p>
                ) : membersProgress.length ===
                  0 ? (
                  <p className="text-center py-12 text-zinc-500 text-sm">
                    No members found.
                  </p>
                ) : (
                  membersProgress.map(
                    (member, index) => {
                      const isMe =
                        member.user_id ===
                        userId;

                      return (
                        <div
                          key={
                            member.user_id
                          }
                          className="flex justify-between items-center p-3.5 bg-zinc-900/60 rounded-2xl border border-white/5"
                        >

                          <div className="flex items-center gap-3">

                            <span
                              className={`text-xs font-mono font-bold w-5 ${
                                index === 0
                                  ? "text-orange-400"
                                  : "text-zinc-500"
                              }`}
                            >
                              0
                              {index + 1}
                            </span>

                            <span className="text-sm text-zinc-200">
                              {
                                member.display_name
                              }{" "}
                              {isMe &&
                                "(You)"}
                            </span>

                          </div>

                          <div className="flex items-center gap-3">

                            <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
                              <Clock className="w-3.5 h-3.5" />

                              {formatTime(
                                member.total_seconds,
                              )}
                            </div>

                            {!isMe && (
                              <button
                                onClick={async () => {
                                  const {
                                    error,
                                  } =
                                    await supabase
                                      .from(
                                        "squad_nudges",
                                      )
                                      .insert({
                                        group_id:
                                          selectedSquad.id,
                                        sender_id:
                                          userId,
                                        receiver_id:
                                          member.user_id,
                                      });

                                  if (
                                    error
                                  ) {
                                    alert(
                                      "Failed to send nudge.",
                                    );
                                    return;
                                  }

                                  alert(
                                    `⚡ Nudged ${member.display_name}!`,
                                  );
                                }}
                                className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[10px] font-medium rounded-lg flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                Nudge
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    },
                  )
                )}

              </div>
            )}

            {/* =================================================
                CHAT
            ================================================= */}

            {activeModalTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">

                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4"
                >

                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-sm">
                      No messages yet.
                      Say hello to your
                      squad! 👋
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe =
                        msg.user_id ===
                        userId;

                      const isPending =
                        msg.id.startsWith(
                          "temp-",
                        );

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isMe
                              ? "items-end"
                              : "items-start"
                          }`}
                        >

                          <span className="text-[10px] text-zinc-500 mb-1 px-1">
                            {isMe
                              ? "You"
                              : msg.display_name ||
                                "Aspirant"}
                          </span>

                          <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs ${
                              isMe
                                ? "bg-orange-500 text-zinc-950 font-medium rounded-br-none"
                                : "bg-zinc-900 text-zinc-200 border border-white/5 rounded-bl-none"
                            }`}
                          >
                            {msg.message}
                          </div>

                          {/* DATE + TIME */}

                          <span className="text-[9px] text-zinc-600 mt-1 px-1">
                            {isPending
                              ? "Sending..."
                              : formatMessageDate(
                                  msg.created_at,
                                )}
                          </span>

                        </div>
                      );
                    })
                  )}

                </div>

                <form
                  onSubmit={
                    sendChatMessage
                  }
                  className="flex gap-2"
                >

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) =>
                      setNewMessage(
                        e.target.value,
                      )
                    }
                    placeholder="Type a message..."
                    maxLength={500}
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 bg-zinc-900/80 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !newMessage.trim()
                    }
                    className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                </form>

              </div>
            )}

            {/* FOOTER */}

            <div className="pt-4 border-t border-white/5 mt-4">
              <button
                onClick={() => {
                  setSelectedSquad(null);
                  setMessages([]);
                }}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl border border-white/5"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}