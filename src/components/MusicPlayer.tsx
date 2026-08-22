"use client";

import { useState } from "react";
import { Music, X, Minus, MonitorPlay, Play } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  // Default is the user requested video
  const [embedId, setEmbedId] = useState("oPVte6aMprI");

  // YouTube URL Parser
  const handleUpdateUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Regex to extract the 11-character YouTube video ID
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = inputValue.match(regExp);

    if (match && match[7].length === 11) {
      setEmbedId(match[7]);
      setInputValue("");
      setIsMinimized(false); // Auto-expand when a new video is loaded
    } else {
      toast.error("Please enter a valid YouTube link.");
    }
  };

  const closePlayer = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* The Expanded / Minimized Player Widget */}
      {isOpen && (
        <div
          className={`bg-[#0c0d12]/95 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ${
            isMinimized ? "w-64 rounded-full p-2.5" : "w-80 rounded-3xl p-4"
          }`}
        >
          {/* Header Row */}
          <div
            className={`flex items-center justify-between ${isMinimized ? "" : "mb-3"}`}
          >
            <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm pl-2">
              <MonitorPlay className="w-4 h-4 text-orange-500" />
              {isMinimized ? "Playing Ambient..." : "Focus Ambient"}
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize/Maximize Toggle */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                title={isMinimized ? "Expand Player" : "Minimize Player"}
              >
                {isMinimized ? (
                  <Music className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={closePlayer}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form & Video (Hidden via CSS when minimized so music keeps playing) */}
          <div
            className={
              isMinimized
                ? "hidden"
                : "block animate-in fade-in zoom-in-95 duration-200"
            }
          >
            {/* URL Input Form */}
            <form onSubmit={handleUpdateUrl} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Paste YouTube Link..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-zinc-900/80 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
              />
              <button
                type="submit"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-xl transition-colors border border-white/5"
                title="Play Custom Link"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </form>

            {/* YouTube iframe Embedded Player */}
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-black relative">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-none"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* The Floating Toggle Button (Hidden when widget is open) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3.5 rounded-full shadow-2xl transition-all duration-300 border bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/5 hover:border-orange-500/30"
          title="Focus Music"
        >
          <Music className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
