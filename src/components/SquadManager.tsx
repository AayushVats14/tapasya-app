"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Users, Plus, Key, LogOut, X, Clock, Trophy, MessageSquare, Send } from "lucide-react";

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
  aspirants?: { display_name: string };
}

export default function SquadManager({ userId, refreshKey }: { userId: string; refreshKey: number }) {
  const [mySquads, setMySquads] = useState<any[]>([]);
  const [newSquadName, setNewSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  // Modal state
  const [selectedSquad, setSelectedSquad] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"progress" | "chat">("progress");
  
  // Progress state
  const [membersProgress, setMembersProgress] = useState<MemberProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const fetchUserSquads = async () => {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        group_id,
        groups (id, name, join_code)
      `)
      .eq("user_id", userId);

    if (!error && data) {
      const squads = data.map((item: any) => item.groups).filter(Boolean);
      setMySquads(squads);
    }
  };

  useEffect(() => {
    if (userId) fetchUserSquads();
  }, [userId, refreshKey]);

  // Open squad modal and load data
  const openSquadModal = async (squad: any) => {
    setSelectedSquad(squad);
    setActiveModalTab("progress");
    loadSquadProgress(squad.id);
    loadSquadChat(squad.id);
  };

  // Load progress
  const loadSquadProgress = async (groupId: string) => {
    setLoadingProgress(true);
    const { data: members, error: memError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (memError || !members || members.length === 0) {
      setMembersProgress([]);
      setLoadingProgress(false);
      return;
    }

    const memberIds = members.map((m: any) => m.user_id);

    const { data: profileData } = await supabase
      .from("aspirants")
      .select("id, display_name")
      .in("id", memberIds);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("user_id, duration_seconds")
      .in("user_id", memberIds)
      .gte("created_at", startOfDay.toISOString());

    const progressMap: Record<string, number> = {};
    sessions?.forEach((s: any) => {
      progressMap[s.user_id] = (progressMap[s.user_id] || 0) + (s.duration_seconds || 0);
    });

    const formattedList: MemberProgress[] = (profileData || []).map((profile: any) => ({
      user_id: profile.id,
      display_name: profile.display_name || "Aspirant",
      total_seconds: progressMap[profile.id] || 0,
    })).sort((a, b) => b.total_seconds - a.total_seconds);

    setMembersProgress(formattedList);
    setLoadingProgress(false);
  };

  // Load chat & subscribe to real-time messages
  const loadSquadChat = async (groupId: string) => {
    // 1. Fetch initial messages
    const { data } = await supabase
      .from("squad_messages")
      .select(`*`)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(50);

    setMessages(data || []);

    // 2. Setup Supabase Realtime Channel cleanly
    const channel = supabase.channel(`squad-chat-${groupId}`);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeModalTab]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSquad || !userId) return;

    // Fetch the user's display name first
    const { data: profile } = await supabase
      .from("aspirants")
      .select("display_name")
      .eq("id", userId)
      .single();

    // Insert message including the display_name column
    await supabase.from("squad_messages").insert({
      group_id: selectedSquad.id,
      user_id: userId,
      message: newMessage.trim(),
      display_name: profile?.display_name || "Aspirant",
    });

    setNewMessage("");
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const createSquad = async () => {
    if (!newSquadName.trim() || !userId) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ name: newSquadName, join_code: code, admin_id: userId })
      .select()
      .single();

    if (groupError) {
      alert("Error creating squad: " + groupError.message);
      return;
    }

    if (group) {
      await supabase.from("group_members").insert({ group_id: group.id, user_id: userId });
      setNewSquadName("");
      fetchUserSquads();
    }
  };

  const joinSquad = async () => {
    if (!joinCode.trim() || !userId) return;
    const { data: group, error } = await supabase
      .from("groups")
      .select("*")
      .eq("join_code", joinCode.toUpperCase())
      .single();

    if (error || !group) {
      alert("Invalid Squad Code!");
      return;
    }

    const { error: joinError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: userId });

    if (joinError && joinError.code !== '23505') {
      alert("Error joining squad.");
    } else {
      setJoinCode("");
      fetchUserSquads();
    }
  };

  const leaveSquad = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase
      .from("group_members")
      .delete()
      .match({ group_id: groupId, user_id: userId });

    if (selectedSquad?.id === groupId) setSelectedSquad(null);
    fetchUserSquads();
  };

  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-zinc-400" />
        <h3 className="text-lg font-medium text-white">My Squad Management</h3>
      </div>

      {/* List of Active Squads */}
      {mySquads.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Your Active Squads (Click to view progress & live chat)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mySquads.map((squad) => (
              <div 
                key={squad.id} 
                onClick={() => openSquadModal(squad)}
                className="flex justify-between items-center px-4 py-3 bg-zinc-950/60 rounded-2xl border border-white/5 hover:border-white/20 cursor-pointer transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100 group-hover:text-white">{squad.name}</p>
                  <span className="text-xs font-mono text-zinc-500">Code: {squad.join_code}</span>
                </div>
                <button
                  onClick={(e) => leaveSquad(squad.id, e)}
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
          You aren't in any squads yet. Create your own or join an existing one below.
        </p>
      )}

      {/* Always Visible Create & Join Inputs */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Create or Join Another Squad</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Plus className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="New Squad Name"
              value={newSquadName}
              onChange={(e) => setNewSquadName(e.target.value)}
              className="w-full pl-11 pr-20 py-3 rounded-xl bg-zinc-950/60 border border-white/5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/10"
            />
            <button
              onClick={createSquad}
              className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium rounded-lg transition-colors"
            >
              Create
            </button>
          </div>

          <div className="relative flex-1">
            <Key className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Enter 6-Digit Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full pl-11 pr-20 py-3 rounded-xl bg-zinc-950/60 border border-white/5 text-sm text-zinc-200 uppercase placeholder-zinc-600 focus:outline-none focus:border-white/10"
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

      {/* Squad Modal (Progress & Live Chat) */}
      {selectedSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[500px] relative animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Squad Command Center</span>
                <h4 className="text-xl font-medium text-white flex items-center gap-2 mt-0.5">
                  <Trophy className="w-5 h-5 text-amber-400" /> {selectedSquad.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedSquad(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs (Progress vs Chat) */}
            <div className="flex p-1 bg-zinc-900/60 rounded-xl border border-white/5 my-4">
              <button
                onClick={() => setActiveModalTab("progress")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${activeModalTab === "progress" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <Trophy className="w-3.5 h-3.5" /> Today's Progress
              </button>
              <button
                onClick={() => setActiveModalTab("chat")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${activeModalTab === "chat" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Live Chat
              </button>
            </div>

            {/* Tab 1: Progress View */}
            {activeModalTab === "progress" && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingProgress ? (
                  <p className="text-center py-12 text-zinc-500 text-sm animate-pulse">Loading members progress...</p>
                ) : membersProgress.length === 0 ? (
                  <p className="text-center py-12 text-zinc-500 text-sm">No members found in this squad.</p>
                ) : (
                  membersProgress.map((member, index) => (
                    <div 
                      key={member.user_id} 
                      className="flex justify-between items-center p-3.5 bg-zinc-900/60 rounded-2xl border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-bold w-5 ${index === 0 ? "text-amber-400" : "text-zinc-500"}`}>
                          0{index + 1}
                        </span>
                        <span className="text-sm font-light text-zinc-200">
                          {member.display_name} {member.user_id === userId && "(You)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatTime(member.total_seconds)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Live Chat View */}
            {activeModalTab === "chat" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-center py-12 text-zinc-500 text-sm font-light">No messages yet. Say hello to your squad! 👋</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.user_id === userId;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] text-zinc-500 mb-1 px-1">
                            {isMe ? "You" : msg.aspirants?.display_name || "Aspirant"}
                          </span>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-light ${isMe ? "bg-zinc-100 text-zinc-950 rounded-br-none" : "bg-zinc-900 text-zinc-200 border border-white/5 rounded-bl-none"}`}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault(); 
                    sendChatMessage(e);
                  }} 
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-zinc-900/80 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Modal Footer Close */}
            <div className="pt-4 border-t border-white/5 mt-auto">
              <button
                onClick={() => setSelectedSquad(null)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl transition-colors border border-white/5"
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