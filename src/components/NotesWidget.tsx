"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  X,
  Plus,
  Trash2,
  Search,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Link,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string; // Now stores HTML instead of raw text
  updatedAt: number;
}

export default function NotesWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Reference for our custom rich text editor
  const editorRef = useRef<HTMLDivElement>(null);

  // Load notes from local storage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("tapasya_notes");
    if (savedNotes) {
      const parsed = JSON.parse(savedNotes);
      setNotes(parsed);
      if (parsed.length > 0) setActiveNoteId(parsed[0].id);
    } else {
      const defaultNote = {
        id: Date.now().toString(),
        title: "Micro-Commitments",
        content:
          "Break your deep work session into smaller, manageable tasks here...",
        updatedAt: Date.now(),
      };
      setNotes([defaultNote]);
      setActiveNoteId(defaultNote.id);
    }
  }, []);

  // Save notes to local storage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("tapasya_notes", JSON.stringify(notes));
    } else {
      localStorage.removeItem("tapasya_notes");
    }
  }, [notes]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  // Sync the editor content when switching notes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    }
  }, [activeNoteId]);

  const handleAddNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled",
      content: "",
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleDeleteNote = () => {
    if (!activeNoteId) return;
    const filtered = notes.filter((n) => n.id !== activeNoteId);
    setNotes(filtered);
    setActiveNoteId(filtered.length > 0 ? filtered[0].id : null);
  };

  const handleUpdateNote = (field: "title" | "content", value: string) => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, [field]: value, updatedAt: Date.now() }
          : n,
      ),
    );
  };

  // --------------------------------------------------------
  // RICH TEXT COMMANDS
  // --------------------------------------------------------
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Force an update to React state after the native DOM command runs
    if (editorRef.current) {
      handleUpdateNote("content", editorRef.current.innerHTML);
    }
  };

  // Helper to strip HTML for word/character counts
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const rawText = activeNote ? stripHtml(activeNote.content) : "";

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stripHtml(n.content).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[5.5rem] left-6 z-40 p-3.5 rounded-full shadow-2xl transition-all duration-300 border bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/5 hover:border-orange-500/30"
        title="Open Notes"
      >
        <FileText className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[75vh] min-h-[500px] bg-[#0c0d12]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">
            {/* LEFT SIDEBAR */}
            <div className="w-1/3 min-w-[250px] bg-black/40 border-r border-white/5 flex flex-col">
              <div className="px-6 py-5 border-b border-white/5">
                <h3 className="text-zinc-100 font-semibold flex items-center gap-2">
                  Notes{" "}
                  <span className="text-zinc-500 font-normal text-sm">
                    ({notes.length})
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 ${
                      activeNoteId === note.id
                        ? "bg-zinc-200 text-zinc-950 shadow-md"
                        : "text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    <h4 className="font-semibold truncate text-sm mb-1">
                      {note.title || "Untitled"}
                    </h4>
                    <p
                      className={`text-[11px] font-mono ${activeNoteId === note.id ? "text-zinc-500" : "text-zinc-600"}`}
                    >
                      {new Date(note.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL: Editor */}
            <div className="flex-1 flex flex-col relative bg-transparent">
              {/* Header Actions */}
              <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button
                  onClick={handleAddNote}
                  className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 w-64 focus-within:border-white/20 transition-colors">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-600 w-full"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDeleteNote}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors ml-2 border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 text-zinc-400 shrink-0 overflow-x-auto custom-scrollbar">
                <select
                  className="bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1 outline-none text-zinc-300 cursor-pointer"
                  onChange={(e) => {
                    executeCommand("formatBlock", e.target.value);
                    e.target.value = "P"; // Reset select back to default visually
                  }}
                  defaultValue="P"
                >
                  <option value="P">Paragraph</option>
                  <option value="H1">Heading 1</option>
                  <option value="H2">Heading 2</option>
                </select>

                <div className="w-px h-4 bg-white/10" />

                {/* Note: using onMouseDown + preventDefault stops the editor from losing focus! */}
                <div className="flex items-center gap-3">
                  <Bold
                    className="w-3.5 h-3.5 hover:text-white cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("bold");
                    }}
                  />
                  <Italic
                    className="w-3.5 h-3.5 hover:text-white cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("italic");
                    }}
                  />
                  <Underline
                    className="w-3.5 h-3.5 hover:text-white cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("underline");
                    }}
                  />
                </div>

                <div className="w-px h-4 bg-white/10" />

                <div className="flex items-center gap-3">
                  <List
                    className="w-3.5 h-3.5 hover:text-white cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("insertUnorderedList");
                    }}
                  />
                  <ListOrdered
                    className="w-3.5 h-3.5 hover:text-white cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("insertOrderedList");
                    }}
                  />
                </div>
              </div>

              {/* Text Area Body */}
              {activeNote ? (
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => handleUpdateNote("title", e.target.value)}
                    placeholder="Note Title"
                    className="bg-transparent text-3xl font-bold text-zinc-100 placeholder-zinc-700 outline-none mb-4"
                  />

                  {/* The actual Rich Text Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) =>
                      handleUpdateNote("content", e.currentTarget.innerHTML)
                    }
                    className="flex-1 bg-transparent text-zinc-300 outline-none overflow-y-auto custom-scrollbar leading-relaxed text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold"
                  />
                  {!activeNote.content && (
                    <div className="absolute top-[120px] left-6 text-zinc-700 text-sm pointer-events-none">
                      Start typing your notes here...
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                  Select or create a note to start typing.
                </div>
              )}

              {/* Footer Character Count */}
              {activeNote && (
                <div className="px-6 py-3 border-t border-white/5 text-[10px] font-mono text-zinc-600 flex justify-between items-center bg-black/20 shrink-0">
                  <span>
                    {rawText.length.toLocaleString()}/5,000 characters
                  </span>
                  <span>
                    {rawText.trim() === ""
                      ? 0
                      : rawText.trim().split(/\s+/).length}{" "}
                    words
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
