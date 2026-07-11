"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  useCall,
  User as StreamUser,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import {
  Mic, MicOff, Video, VideoOff, Share2, Users, MessageSquare,
  PhoneOff, Shield, Volume2, Send, X, UserX, Maximize2, Minimize2,
  Crown, Monitor, Smile, Copy, Check
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { fetchMeetingDetails, fetchStreamToken, removeParticipant, Meeting as DBMeeting } from "../../../lib/api";

// ─── Chat message type ───────────────────────────────────────────────────────
interface ChatMsg { sender: string; text: string; timestamp: string; isLocal: boolean; }

// ─── Inner component (must be inside StreamCall) ─────────────────────────────
function MeetingInner({
  meetingId, dbMeeting, userName, isMuted, isVideoOff, isSharingScreen,
  setIsMuted, setIsVideoOff, setIsSharingScreen, onLeave
}: {
  meetingId: string;
  dbMeeting: DBMeeting | null;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;
  setIsMuted: (v: boolean) => void;
  setIsVideoOff: (v: boolean) => void;
  setIsSharingScreen: (v: boolean) => void;
  onLeave: () => void;
}) {
  const call = useCall();
  const { useParticipants, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();

  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat">("participants");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { sender: "System", text: "Welcome! Your meeting is end-to-end encrypted.", timestamp: "now", isLocal: false }
  ]);
  const [newMsg, setNewMsg] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Dynamic meeting timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Raise Hand states
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handsMap, setHandsMap] = useState<{ [userId: string]: boolean }>({});

  // Demo simulation states
  const [showDemoParticipants, setShowDemoParticipants] = useState(false);
  const [activeDemoSpeaker, setActiveDemoSpeaker] = useState<string | null>(null);

  // ── Sync mute / camera / screenshare to Stream SDK ──────────────────────────
  useEffect(() => {
    if (!call) return;
    if (isMuted) call.microphone.disable().catch(console.error);
    else call.microphone.enable().catch(console.error);
  }, [isMuted, call]);

  useEffect(() => {
    if (!call) return;
    if (isVideoOff) call.camera.disable().catch(console.error);
    else call.camera.enable().catch(console.error);
  }, [isVideoOff, call]);

  useEffect(() => {
    if (!call) return;
    if (isSharingScreen) {
      call.screenShare.enable().catch((err: any) => {
        toast.error("Screen share failed or permission denied.");
        setIsSharingScreen(false);
      });
    } else {
      call.screenShare.disable().catch(console.error);
    }
  }, [isSharingScreen, call]);

  // ── Meeting Timer Interval ────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed time (HH:MM:SS or MM:SS)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (num: number) => String(num).padStart(2, "0");
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  // ── Sync Demo Mode Seeding ────────────────────────────────────────────────
  useEffect(() => {
    if (dbMeeting?.is_demo) {
      setShowDemoParticipants(true);
    }
  }, [dbMeeting]);

  // Simulating random talking status for mock participants
  useEffect(() => {
    if (!showDemoParticipants || !dbMeeting?.demo_participants) return;
    const interval = setInterval(() => {
      const list = dbMeeting.demo_participants;
      if (!list || list.length === 0) return;
      // Index to select speaking participant (with a chance of silence)
      const rand = Math.floor(Math.random() * (list.length + 2));
      if (rand < list.length) {
        setActiveDemoSpeaker(list[rand]);
      } else {
        setActiveDemoSpeaker(null);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [showDemoParticipants, dbMeeting]);

  // ── Chat & Hand Raise Custom Event Listeners ────────────────────────────────
  useEffect(() => {
    if (!call) return;
    const unsub = call.on("custom", (event: any) => {
      if (event?.custom?.type === "chat") {
        const { sender, text } = event.custom;
        if (sender !== userName) {
          setChatMessages(prev => [...prev, {
            sender,
            text,
            timestamp: format(new Date(), "h:mm a"),
            isLocal: false
          }]);
        }
      } else if (event?.custom?.type === "hand-raise") {
        const { userId, sender, isRaised } = event.custom;
        setHandsMap(prev => ({ ...prev, [userId]: isRaised }));
        if (sender !== userName) {
          if (isRaised) {
            toast(`${sender} raised their hand ✋`, { icon: "✋" });
          } else {
            toast(`${sender} lowered their hand`, { icon: "👇" });
          }
        }
      }
    });
    return () => unsub?.();
  }, [call, userName]);

  // Toggle Hand Raise
  const toggleRaiseHand = async () => {
    if (!call) return;
    const localUserId = call.currentUserId || "local-user";
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    setHandsMap(prev => ({ ...prev, [localUserId]: nextState }));
    try {
      await call.sendCustomEvent({
        type: "hand-raise",
        userId: localUserId,
        sender: userName,
        isRaised: nextState
      });
      toast.success(nextState ? "Hand raised!" : "Hand lowered");
    } catch {
      // Offline fallback
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !call) return;
    const text = newMsg.trim();
    setChatMessages(prev => [...prev, { sender: userName, text, timestamp: format(new Date(), "h:mm a"), isLocal: true }]);
    setNewMsg("");
    try {
      await call.sendCustomEvent({ type: "chat", sender: userName, text });
    } catch { /* offline fallback - message shows locally */ }
  };

  const handleMuteAll = async () => {
    if (!call) return;
    await call.muteAllUsers("audio").catch(console.error);
    toast.success("Muted all participants.");
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!call) return;
    try {
      await call.blockUser(userId);
      if (dbMeeting) await removeParticipant(dbMeeting.meeting_id, name).catch(console.error);
      toast.success(`Removed ${name}`);
    } catch { toast.error("Could not remove participant."); }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setIsFullScreen(true); }
    else { document.exitFullscreen().catch(() => {}); setIsFullScreen(false); }
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    setCopiedId(true);
    toast.success("Meeting ID copied!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getGridCols = (n: number) => {
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 md:grid-cols-2";
    if (n <= 4) return "grid-cols-2";
    return "grid-cols-2 lg:grid-cols-3";
  };

  const isLocalHost = dbMeeting?.host_name === userName;
  const demoCount = showDemoParticipants ? dbMeeting?.demo_participants?.length || 0 : 0;
  const totalGridCount = participants.length + demoCount;

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#1A1A2E] text-white overflow-hidden select-none">

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="bg-black/50 border-b border-white/5 px-6 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            Secure
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              {dbMeeting?.title || "Zoom Meeting"}
              <span className="text-[11px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-normal">
                Time elapsed: {formatTime(elapsedSeconds)}
              </span>
            </h2>
            <button
              onClick={copyMeetingId}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors mt-0.5"
            >
              <span className="font-mono">ID: {meetingId}</span>
              {copiedId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 text-green-400 font-bold">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </div>
          <span className="hidden sm:inline">Host: {dbMeeting?.host_name || "Unknown"}</span>
          <span className="text-white/10 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Stream Audio</span>
          </div>
        </div>
      </header>

      {/* ── Main: Video grid + Sidebar ────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Video grid */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden items-center justify-center relative">
          <div className={`w-full h-full grid ${getGridCols(totalGridCount)} gap-4 items-center justify-center max-w-6xl mx-auto overflow-y-auto`}>
            {participants.map((p) => {
              const hasHandRaised = handsMap[p.userId || ""] || false;
              return (
                <div
                  key={p.sessionId}
                  className={`w-full bg-slate-900 rounded-2xl border overflow-hidden relative flex flex-col items-center justify-center transition-all aspect-video max-h-[420px] ${
                    p.isSpeaking ? "border-green-500 shadow-lg shadow-green-500/15 scale-[1.01]" : "border-white/5"
                  }`}
                >
                  <ParticipantView participant={p} />
                  {/* Name tag */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-white/5 z-10">
                    {p.name === dbMeeting?.host_name && <Crown className="w-3 h-3 text-amber-400 fill-current" />}
                    <span className="truncate max-w-[120px]">{p.name || p.userId}</span>
                    {hasHandRaised && <span className="text-yellow-400 ml-1 text-sm">✋</span>}
                    {!p.audioStream && <MicOff className="w-3 h-3 text-red-500 ml-1" />}
                  </div>
                  {/* Hand raised floating overlay */}
                  {hasHandRaised && (
                    <div className="absolute top-3 left-3 bg-yellow-500/90 text-black font-bold text-[9px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg border border-yellow-400 z-10">
                      <span>✋</span>
                      <span>Hand Raised</span>
                    </div>
                  )}
                  {/* Speaking indicator */}
                  {p.isSpeaking && (
                    <div className="absolute top-3 right-3 bg-green-500/90 text-black font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                      Speaking
                    </div>
                  )}
                </div>
              );
            })}

            {/* Simulated Demo Avatars inside the Video Grid */}
            {showDemoParticipants && dbMeeting?.demo_participants?.map((name: string, idx: number) => {
              const isSpeaker = activeDemoSpeaker === name;
              const initials = name.split(" ").map(w => w[0]).join("").toUpperCase();
              return (
                <div
                  key={`demo-card-${idx}`}
                  className={`w-full bg-[#1E1E2F] rounded-2xl border overflow-hidden relative flex flex-col items-center justify-center transition-all aspect-video max-h-[420px] ${
                    isSpeaker ? "border-green-500 shadow-lg shadow-green-500/15 scale-[1.01]" : "border-white/5"
                  }`}
                >
                  {/* Premium circular Avatar */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-indigo-500/15 animate-pulse duration-[3s]">
                    {initials}
                  </div>

                  {/* Name tag & Equalizer */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-white/5 z-10">
                    <span className="truncate max-w-[120px]">{name}</span>
                    {isSpeaker && (
                      <div className="flex items-end gap-0.5 h-3 ml-1.5" title="Speaking">
                        <span className="w-0.75 h-full bg-green-400 rounded-full animate-eq-bar" style={{ animationDelay: "0.1s" }} />
                        <span className="w-0.75 h-full bg-green-400 rounded-full animate-eq-bar" style={{ animationDelay: "0.3s" }} />
                        <span className="w-0.75 h-full bg-green-400 rounded-full animate-eq-bar" style={{ animationDelay: "0.2s" }} />
                      </div>
                    )}
                  </div>

                  {/* Corner Speaking Badge */}
                  {isSpeaker && (
                    <div className="absolute top-3 right-3 bg-green-500/90 text-black font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                      Speaking
                    </div>
                  )}
                </div>
              );
            })}

            {totalGridCount === 0 && (
              <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 py-20">
                <Users className="w-12 h-12 opacity-30" />
                <p className="text-sm">Connecting to room...</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-full sm:w-80 bg-[#111118] border-l border-white/5 flex flex-col absolute sm:relative right-0 top-0 bottom-0 shrink-0 z-50 h-full animate-in slide-in-from-right duration-250">
            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-black/20">
              <button
                onClick={() => setSidebarTab("participants")}
                className={`flex-1 py-3.5 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-colors ${sidebarTab === "participants" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"}`}
              >
                <Users className="w-4 h-4" />
                In Call ({participants.length})
              </button>
              <button
                onClick={() => setSidebarTab("chat")}
                className={`flex-1 py-3.5 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-colors ${sidebarTab === "chat" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"}`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button onClick={() => setShowSidebar(false)} className="p-3.5 text-slate-400 hover:text-white border-l border-white/5 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === "participants" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Participants ({participants.length})</p>
                    {isLocalHost && (
                      <button onClick={handleMuteAll} className="px-2.5 py-1 bg-yellow-600/25 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer">
                        Mute All
                      </button>
                    )}
                  </div>
                  {participants.map((p) => {
                    const isHandUp = handsMap[p.userId || ""] || false;
                    return (
                      <div key={p.sessionId} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {(p.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold flex items-center gap-1.5">
                              {p.name || p.userId}
                              {p.name === dbMeeting?.host_name && <Crown className="w-3 h-3 text-amber-400" />}
                              {isHandUp && <span title="Hand Raised">✋</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {p.name === userName ? "You" : "Participant"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!p.audioStream && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                          {isLocalHost && p.name !== userName && p.userId && (
                            <button onClick={() => handleRemove(p.userId!, p.name || p.userId!)} className="p-1 hover:bg-slate-700 text-red-500 rounded transition-colors ml-2" title="Remove">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sidebarTab === "chat" && (
                <div className="flex flex-col h-full justify-between gap-4">
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[300px]">
                    {chatMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col ${m.isLocal ? "items-end text-right" : "items-start text-left"}`}>
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-300">{m.sender}</span>
                          <span className="text-[9px] text-slate-500">{m.timestamp}</span>
                        </div>
                        <div className={`p-2.5 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                          m.sender === "System" ? "bg-slate-800/80 border border-white/5 text-amber-400 text-center font-medium w-full"
                          : m.isLocal ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white/10 text-slate-100 rounded-tl-none"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-white/5">
                    <input
                      type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Send to everyone..."
                      className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/5 focus:border-blue-500 rounded-xl px-3 py-2 text-xs focus:outline-none text-white transition-colors placeholder:text-slate-500"
                    />
                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xs transition-colors cursor-pointer">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Toolbar ────────────────────────────────────────────── */}
      <footer className="bg-black/80 border-t border-white/5 py-4 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold hidden md:flex">
          <span>AES-256 Encryption</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 mx-auto">
          <button onClick={() => { setIsMuted(!isMuted); toast.success(isMuted ? "Mic on" : "Mic off"); }}
            className={`flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${isMuted ? "text-red-500" : "text-slate-200"}`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button onClick={() => { setIsVideoOff(!isVideoOff); toast.success(isVideoOff ? "Camera on" : "Camera off"); }}
            className={`flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${isVideoOff ? "text-red-500" : "text-slate-200"}`}>
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>

          <button onClick={() => { setIsSharingScreen(!isSharingScreen); }}
            className={`flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${isSharingScreen ? "text-green-400" : "text-slate-200"}`}>
            <Share2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">{isSharingScreen ? "Sharing" : "Share"}</span>
          </button>

          <button onClick={toggleRaiseHand}
            className={`flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${isHandRaised ? "text-yellow-400" : "text-slate-200"}`}>
            <span className="text-lg">✋</span>
            <span className="text-[10px] font-bold">{isHandRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>

          <button onClick={() => { setShowSidebar(true); setSidebarTab("participants"); }}
            className="flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-colors cursor-pointer">
            <div className="relative">
              <Users className="w-5 h-5" />
              {participants.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-600 text-[9px] font-bold px-1 rounded-full text-white">
                  {participants.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">People</span>
          </button>

          <button onClick={() => { setShowSidebar(true); setSidebarTab("chat"); }}
            className="flex flex-col items-center gap-1 p-2 w-16 md:w-20 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-colors cursor-pointer">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold">Chat</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleFullScreen} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer hidden sm:block" title="Toggle Fullscreen">
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={onLeave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-2">
            <PhoneOff className="w-4 h-4" />
            Leave
          </button>
        </div>
      </footer>
    </div>
  );
}

// ─── Stream Connection Wrapper ─────────────────────────────────────────────────
function MeetingRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.id as string;

  const [userName, setUserName] = useState("Guest User");
  const [userId, setUserId] = useState("guest-001");
  const [dbMeeting, setDbMeeting] = useState<DBMeeting | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<"loading" | "connected" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("zoom_auth_token");
    if (!token) { toast.error("Please sign in first."); router.push("/"); return; }
    const storedName = localStorage.getItem("zoom_user_name") || "Guest User";
    const storedId = localStorage.getItem("zoom_user_id") || "guest-001";
    setUserName(storedName);
    setUserId(storedId);
  }, []);

  useEffect(() => {
    fetchMeetingDetails(meetingId)
      .then(setDbMeeting)
      .catch(() => toast.error("Could not fetch meeting details."));
  }, [meetingId]);

  useEffect(() => {
    if (!userId || userId === "guest-001" && !localStorage.getItem("zoom_user_id")) return;
    let active = true;
    let localClient: StreamVideoClient | null = null;
    let localCall: any = null;

    async function init() {
      try {
        setConnectionState("loading");
        const tokenData = await fetchStreamToken(userId);

        if (tokenData.api_key === "mock_api_key" || tokenData.token.startsWith("dummy_token")) {
          setErrorMsg("Stream API credentials are not configured. Please set STREAM_API_KEY and STREAM_API_SECRET in backend/.env and restart the server.");
          setConnectionState("error");
          return;
        }

        if (!active) return;

        const user: StreamUser = {
          id: userId,
          name: userName,
          image: `https://getstream.io/random_png/?id=${userId}&name=${encodeURIComponent(userName)}`,
        };

        localClient = new StreamVideoClient({ apiKey: tokenData.api_key, user, token: tokenData.token });
        localCall = localClient.call("default", meetingId);
        await localCall.join({ create: true });

        if (!active) {
          localCall.leave().catch(console.error);
          localClient.disconnectUser().catch(console.error);
          return;
        }

        setClient(localClient);
        setCall(localCall);
        setConnectionState("connected");
        toast.success("Connected to meeting!");
      } catch (err: any) {
        if (active) {
          setErrorMsg(err.message || "Failed to connect to video server.");
          setConnectionState("error");
        }
      }
    }

    init();
    return () => {
      active = false;
      localCall?.leave().catch(console.error);
      localClient?.disconnectUser().catch(console.error);
    };
  }, [userId, userName, meetingId]);

  const handleLeave = () => {
    call?.leave().catch(console.error);
    client?.disconnectUser().catch(console.error);
    toast.success("You left the meeting.");
    router.push("/");
  };

  if (!mounted) {
    return (
      <div className="h-screen bg-[#1A1A2E] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading...</p>
      </div>
    );
  }

  if (connectionState === "loading") {
    return (
      <div className="h-screen bg-[#1A1A2E] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Connecting to secure video room...</p>
        <p className="text-xs text-slate-500">Meeting ID: {meetingId}</p>
      </div>
    );
  }

  if (connectionState === "error") {
    return (
      <div className="h-screen bg-[#1A1A2E] flex flex-col items-center justify-center gap-4 text-white p-8">
        <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center text-2xl mb-2">!</div>
        <h2 className="text-xl font-bold">Connection Failed</h2>
        <p className="text-sm text-slate-400 max-w-md text-center leading-relaxed">{errorMsg}</p>
        <div className="bg-zinc-900 p-4 rounded-xl text-left text-xs font-mono max-w-lg mt-2 text-zinc-300 border border-zinc-800">
          <p className="font-bold text-amber-400 mb-1">To enable Real-Time Video:</p>
          <p>1. Create a free account at <a href="https://getstream.io" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">getstream.io</a></p>
          <p>2. Add to <code className="bg-black/50 px-1 rounded text-red-400">backend/.env</code>:</p>
          <pre className="text-[10px] mt-1 bg-black/30 p-2 rounded text-slate-300">STREAM_API_KEY=your_key{"\n"}STREAM_API_SECRET=your_secret</pre>
          <p className="mt-1">3. Restart the backend server.</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!client || !call) return null;

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <MeetingInner
          meetingId={meetingId}
          dbMeeting={dbMeeting}
          userName={userName}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isSharingScreen={isSharingScreen}
          setIsMuted={setIsMuted}
          setIsVideoOff={setIsVideoOff}
          setIsSharingScreen={setIsSharingScreen}
          onLeave={handleLeave}
        />
      </StreamCall>
    </StreamVideo>
  );
}

export default function MeetingRoomPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen bg-[#1A1A2E] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MeetingRoom />
    </React.Suspense>
  );
}