"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Send, Circle, Flame } from "lucide-react";

interface SquadRoomProps {
  groupId: string;
  userId: string;
  userName: string;
  isStudying: boolean; // We will pass this from the timer!
}

export default function SquadRoom({
  groupId,
  userId,
  userName,
  isStudying,
}: SquadRoomProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Fetch initial chat history
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("squad_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchMessages();

    // 2. Connect to Supabase Realtime Channel
    const roomChannel = supabase.channel(`squad_${groupId}`, {
      config: { presence: { key: userId } },
    });

    // 3. Listen for Live Chat Messages
    roomChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "squad_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      },
    );

    // 4. Listen for Live Presence (Who is online & studying)
    roomChannel.on("presence", { event: "sync" }, () => {
      const state = roomChannel.presenceState();
      const users = Object.values(state).map((u: any) => u[0]); // Get latest state per user
      setOnlineUsers(users);
    });

    // 5. Subscribe and broadcast our own status
    roomChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomChannel.track({
          user_id: userId,
          display_name: userName,
          is_studying: isStudying,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [groupId, userId, userName]); // Only run on mount or ID change

  // Update presence when study status changes without reconnecting
  useEffect(() => {
    const channel = supabase.channel(`squad_${groupId}`);
    if (channel.state === "joined") {
      channel.track({
        user_id: userId,
        display_name: userName,
        is_studying: isStudying,
        online_at: new Date().toISOString(),
      });
    }
  }, [isStudying]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = newMessage;
    setNewMessage(""); // Optimistic clear

    await supabase.from("squad_messages").insert({
      group_id: groupId,
      user_id: userId,
      display_name: userName,
      message: msg,
    });
  };

  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl flex flex-col h-[500px] overflow-hidden">
      {/* Live Presence Header */}
      <div className="p-4 border-b border-white/5 bg-zinc-950/30 overflow-x-auto whitespace-nowrap custom-scrollbar">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          Live Presence
        </p>
        <div className="flex gap-4">
          {onlineUsers.map((user) => (
            <div key={user.user_id} className="flex items-center gap-2">
              {user.is_studying ? (
                <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              ) : (
                <Circle className="w-3 h-3 fill-green-500 text-green-500" />
              )}
              <span
                className={`text-sm ${user.is_studying ? "text-orange-400 font-medium" : "text-zinc-300"}`}
              >
                {user.display_name} {user.is_studying && "(Deep Work)"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => {
          const isMe = msg.user_id === userId;
          return (
            <div
              key={i}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-zinc-500 mb-1 ml-1">
                {isMe ? "You" : msg.display_name}
              </span>
              <div
                className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                  isMe
                    ? "bg-zinc-100 text-zinc-900 rounded-br-none"
                    : "bg-zinc-800 text-zinc-200 border border-white/5 rounded-bl-none"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-white/5 bg-zinc-950/50 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Motivate your squad..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
        />
        <button
          type="submit"
          className="p-2.5 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
