"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Video, 
  PlusSquare, 
  Calendar, 
  Monitor, 
  Clock, 
  User, 
  Copy, 
  Check, 
  X,
  ExternalLink,
  ChevronRight,
  LogOut,
  Edit2,
  Bell,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { 
  fetchUpcomingMeetings, 
  fetchRecentMeetings, 
  createInstantMeeting, 
  scheduleMeeting, 
  joinMeeting,
  Meeting,
  registerUser,
  loginUser,
  getApiUrl
} from "../lib/api";
import MeetingInviteModal from "../components/MeetingInviteModal";


export default function Dashboard() {
  const router = useRouter();
  
  // App states
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // User states
  const [userName, setUserName] = useState("Alex River");
  const [userId, setUserId] = useState("user-999");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [tempUserName, setTempUserName] = useState("");

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Modals state
  const [activeModal, setActiveModal] = useState<"new" | "join" | "schedule" | "share" | null>(null);


  // Form states
  // 1. Join Meeting Form
  const [joinMeetingId, setJoinMeetingId] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  
  // 2. Schedule Meeting Form
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleDuration, setScheduleDuration] = useState(45);
  const [scheduleTimezone, setScheduleTimezone] = useState("UTC");
  const [scheduleHostName, setScheduleHostName] = useState("");

  // 3. New Meeting Options
  const [newVideoOn, setNewVideoOn] = useState(true);

  // 4. Copied status mapping
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 5. Invite modal after meeting creation
  const [inviteMeeting, setInviteMeeting] = useState<Meeting | null>(null);
  const [inviteIsScheduled, setInviteIsScheduled] = useState(false);

  // API Connection states
  const [apiConnectionError, setApiConnectionError] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState("");

  const [mounted, setMounted] = useState(false);

  // Update clock every second
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hydrate user and data from localStorage/API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("zoom_user_name");
      const storedId = localStorage.getItem("zoom_user_id");
      const storedToken = localStorage.getItem("zoom_auth_token");
      const storedApiUrl = localStorage.getItem("zoom_api_url");
      if (storedName && storedToken) {
        setUserName(storedName);
        setJoinDisplayName(storedName);
        setIsAuthenticated(true);
      }
      if (storedId) {
        setUserId(storedId);
      }
      if (storedApiUrl) {
        setCustomApiUrl(storedApiUrl);
      } else {
        setCustomApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");
      }
    }
    loadMeetings();
  }, []);



  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    if (authMode === "signup" && !authName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      toast.loading(authMode === "signup" ? "Creating account..." : "Signing in...", { id: "auth" });
      
      let res;
      if (authMode === "signup") {
        res = await registerUser(authName.trim(), authEmail.trim());
      } else {
        res = await loginUser(authEmail.trim());
      }

      localStorage.setItem("zoom_user_name", res.name);
      localStorage.setItem("zoom_user_id", res.user_id);
      localStorage.setItem("zoom_auth_token", res.token);
      
      setUserName(res.name);
      setUserId(res.user_id);
      setJoinDisplayName(res.name);
      setIsAuthenticated(true);
      
      toast.success(`Welcome back, ${res.name}!`, { id: "auth" });
      loadMeetings();
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please verify your credentials.", { id: "auth" });
    }
  };

  const handleGuestSignIn = () => {
    const guestName = "Guest User";
    const guestId = "guest-" + Math.floor(100 + Math.random() * 900);
    
    localStorage.setItem("zoom_user_name", guestName);
    localStorage.setItem("zoom_user_id", guestId);
    localStorage.setItem("zoom_auth_token", "guest_token_" + Date.now());
    
    setUserName(guestName);
    setUserId(guestId);
    setJoinDisplayName(guestName);
    setIsAuthenticated(true);
    toast.success("Signed in as Guest!");
    loadMeetings();
  };

  const loadMeetings = async () => {
    setLoading(true);
    setApiConnectionError(false);
    try {
      const up = await fetchUpcomingMeetings();
      const rec = await fetchRecentMeetings();
      setUpcoming(up);
      setRecent(rec);
    } catch (e) {
      console.error("Connection error loading meetings:", e);
      setApiConnectionError(true);
      toast.error("Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    if (!customApiUrl.trim()) return;
    localStorage.setItem("zoom_api_url", customApiUrl.trim());
    toast.success("API Endpoint saved! Reconnecting...");
    loadMeetings();
  };

  const handleResetApiUrl = () => {
    localStorage.removeItem("zoom_api_url");
    setCustomApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");
    toast.success("API Endpoint reset to default. Reconnecting...");
    loadMeetings();
  };

  // User edit handlers
  const handleSaveUserName = () => {
    if (!tempUserName.trim()) return;
    setUserName(tempUserName.trim());
    setJoinDisplayName(tempUserName.trim());
    localStorage.setItem("zoom_user_name", tempUserName.trim());
    setIsEditingUser(false);
    toast.success("Username updated!");
  };

  // Action flow handlers
  const handleStartInstantMeeting = async () => {
    try {
      toast.loading("Creating instant meeting...", { id: "instant-meeting" });
      const meeting = await createInstantMeeting({
        title: `${userName}'s Instant Meeting`,
        duration: 40,
        host_id: userId,
        host_name: userName,
        start_time: new Date().toISOString(),
      });
      
      // Auto-join meeting
      await joinMeeting(meeting.meeting_id, userName, userId);
      
      toast.success("Redirecting to room...", { id: "instant-meeting" });
      setActiveModal(null);
      // Redirect immediately to meeting room
      router.push(`/meeting/${meeting.meeting_id}?video=${newVideoOn}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start meeting", { id: "instant-meeting" });
    }
  };

  const handleJoinMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinMeetingId.trim()) {
      toast.error("Please enter a Meeting ID or Invite URL");
      return;
    }
    
    let cleanId = joinMeetingId.trim();
    
    // Parse invite link URL if pasted
    if (cleanId.includes("/meeting/")) {
      try {
        const url = new URL(cleanId);
        const pathParts = url.pathname.split("/");
        const extractedId = pathParts[pathParts.length - 1];
        if (extractedId) {
          cleanId = extractedId;
          // Set passcode if present in url
          const passcodeParam = url.searchParams.get("passcode");
          if (passcodeParam) {
            toast.success("Extracted passcode from link");
          }
        }
      } catch (err) {
        // Fallback to raw input
      }
    }

    const finalName = joinDisplayName.trim() || userName;

    try {
      toast.loading("Joining room...", { id: "join-meeting" });
      const meeting = await joinMeeting(cleanId, finalName, userId);
      
      // Save display name for convenience
      localStorage.setItem("zoom_user_name", finalName);
      setUserName(finalName);
      
      toast.success("Joined meeting successfully!", { id: "join-meeting" });
      setActiveModal(null);
      
      // Pass code if present
      const queryStr = meeting.passcode ? `?passcode=${meeting.passcode}` : "";
      router.push(`/meeting/${meeting.meeting_id}${queryStr}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to find or join meeting", { id: "join-meeting" });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }
    if (!scheduleDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      toast.loading("Scheduling...", { id: "schedule" });
      
      // Combine date and time
      const dateParts = scheduleDate.split("-"); // YYYY-MM-DD
      const timeParts = scheduleTime.split(":"); // HH:MM
      const meetingDateTime = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1])
      );

      const meeting = await scheduleMeeting({
        title: scheduleTitle,
        description: scheduleDescription.trim() || undefined,
        duration: scheduleDuration,
        host_id: userId,
        host_name: scheduleHostName.trim() || userName,
        start_time: meetingDateTime.toISOString()
      });

      toast.success("Meeting scheduled!", { id: "schedule" });
      setActiveModal(null);
      
      // Reset form
      setScheduleTitle("");
      setScheduleDescription("");
      setScheduleDate("");
      setScheduleTime("12:00");
      setScheduleDuration(45);
      setScheduleTimezone("UTC");
      
      // Refresh list
      loadMeetings();

      // Show invite modal for the scheduled meeting
      setInviteIsScheduled(true);
      setInviteMeeting(meeting);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule meeting", { id: "schedule" });
    }
  };

  const copyToClipboard = (meetingId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(meetingId);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerDirectJoin = async (meetingId: string) => {
    try {
      await joinMeeting(meetingId, userName, userId);
      router.push(`/meeting/${meetingId}`);
    } catch (e: any) {
      toast.error(e.message || "Could not join meeting");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-zoom-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-zoom-gray-border p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-zoom-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zoom-blue/25 mb-4">
              <Video className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zoom-text-primary">
              {authMode === "signup" ? "Create Zoom Account" : "Sign In to Zoom"}
            </h2>
            <p className="text-xs text-zoom-text-secondary mt-1.5 font-medium text-center">
              {authMode === "signup"
                ? "Register a new profile to host and schedule meetings"
                : "Enter your registered email to access your personal dashboard"}
            </p>
          </div>

          {/* Login/Signup Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200/50">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "login" ? "bg-white text-zoom-text-primary shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === "signup" ? "bg-white text-zoom-text-primary shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5 tracking-wider">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex River"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zoom-blue focus:ring-1 focus:ring-zoom-blue transition-all bg-slate-50 placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5 tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. alex@company.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full border border-zoom-gray-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zoom-blue focus:ring-1 focus:ring-zoom-blue transition-all bg-slate-50 placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                className="w-full py-3 bg-zoom-blue hover:bg-zoom-blue-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-zoom-blue/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                {authMode === "signup" ? "Register & Enter" : "Sign In"}
              </button>
              
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zoom-gray-border"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Or</span>
                <div className="flex-grow border-t border-zoom-gray-border"></div>
              </div>

              <button
                type="button"
                onClick={handleGuestSignIn}
                className="w-full py-3 border border-zoom-gray-border text-zoom-text-primary rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                Continue as Guest
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zoom-gray-bg text-zoom-text-primary">
      {/* 1. Header/Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-zoom-gray-border px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="w-10 h-10 bg-zoom-blue rounded-xl flex items-center justify-center text-white shadow-md shadow-zoom-blue/20">
            <Video className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zoom-blue flex items-center gap-1">
              zoom
              <span className="text-sm font-semibold text-zoom-text-secondary bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                Clone
              </span>
            </h1>
          </div>
        </div>

        {/* User Identity and Profile */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            {isEditingUser ? (
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  className="border border-zoom-blue rounded px-2 py-0.5 text-sm focus:outline-none w-32"
                  autoFocus
                />
                <button 
                  onClick={handleSaveUserName}
                  className="p-1 bg-green-500 rounded text-white hover:bg-green-600"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsEditingUser(false)}
                  className="p-1 bg-slate-300 rounded text-slate-800 hover:bg-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-end">
                <p className="font-semibold text-sm text-zoom-text-primary">{userName}</p>
                <button 
                  onClick={() => {
                    setTempUserName(userName);
                    setIsEditingUser(true);
                  }}
                  className="p-1 text-zoom-text-secondary hover:text-zoom-blue transition-colors"
                  title="Edit Name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-zoom-text-secondary font-mono">{userId}</p>
          </div>
          
          {/* User Profile Avatar, Settings, Notifications, and Logout button */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-zoom-text-secondary hover:text-zoom-blue rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-zoom-text-secondary hover:text-zoom-blue rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <span className="text-slate-200 mx-1">|</span>
            <div className="w-10 h-10 rounded-full bg-zoom-blue/10 border border-zoom-blue/20 text-zoom-blue flex items-center justify-center font-bold text-base shadow-inner">
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("zoom_user_name");
                localStorage.removeItem("zoom_user_id");
                localStorage.removeItem("zoom_auth_token");
                setIsAuthenticated(false);
                toast.success("Signed out successfully.");
              }}
              className="p-2 text-zoom-text-secondary hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {apiConnectionError && (
          <div className="lg:col-span-12 bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Settings className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-red-800">Unable to Connect to Backend API</h3>
                <p className="text-xs text-red-600 leading-relaxed max-w-2xl">
                  The frontend is unable to reach the backend server. This usually happens if the backend server is offline or if your browser blocks the connection due to Mixed Content constraints (e.g., if the frontend is hosted on HTTPS but defaults to localhost HTTP).
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-mono font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded uppercase">
                    Active URL: {getApiUrl()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
              <input
                type="text"
                placeholder="Enter Backend API URL (e.g., https://...)"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-200 bg-white text-zoom-text-primary focus:outline-none focus:ring-1 focus:ring-red-400 placeholder:text-slate-400 w-full sm:w-64"
              />
              <button
                onClick={handleSaveApiUrl}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap text-center"
              >
                Connect
              </button>
              <button
                onClick={handleResetApiUrl}
                className="px-3 py-1.5 border border-red-200 bg-white hover:bg-red-100/55 text-red-800 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center"
              >
                Reset
              </button>
            </div>
          </div>
        )}
        
        {/* Left Hand: Menu and lists (7 columns) */}
        <section className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Dashboard Icon Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* New Meeting */}
            <button 
              onClick={() => {
                setNewVideoOn(true);
                setActiveModal("new");
              }}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-zoom-gray-border hover:shadow-lg transition-all text-center group cursor-pointer"
            >
              <div className="w-14 h-14 bg-zoom-orange rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zoom-orange/20 group-hover:scale-105 transition-transform duration-200">
                <Video className="w-8 h-8 fill-current" />
              </div>
              <div>
                <p className="font-semibold text-sm text-zoom-text-primary">New Meeting</p>
                <p className="text-[11px] text-zoom-text-secondary mt-0.5">Start instantly</p>
              </div>
            </button>

            {/* Join Meeting */}
            <button 
              onClick={() => {
                setJoinDisplayName(userName);
                setActiveModal("join");
              }}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-zoom-gray-border hover:shadow-lg transition-all text-center group cursor-pointer"
            >
              <div className="w-14 h-14 bg-zoom-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zoom-blue/20 group-hover:scale-105 transition-transform duration-200">
                <PlusSquare className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-sm text-zoom-text-primary">Join</p>
                <p className="text-[11px] text-zoom-text-secondary mt-0.5">Via Meeting ID</p>
              </div>
            </button>

            {/* Schedule */}
            <button 
              onClick={() => {
                setScheduleHostName(userName);
                setActiveModal("schedule");
              }}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-zoom-gray-border hover:shadow-lg transition-all text-center group cursor-pointer"
            >
              <div className="w-14 h-14 bg-zoom-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zoom-blue/20 group-hover:scale-105 transition-transform duration-200">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-sm text-zoom-text-primary">Schedule</p>
                <p className="text-[11px] text-zoom-text-secondary mt-0.5">Plan future session</p>
              </div>
            </button>

            {/* Share Screen */}
            <button 
              onClick={() => setActiveModal("share")}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-zoom-gray-border hover:shadow-lg transition-all text-center group cursor-pointer"
            >
              <div className="w-14 h-14 bg-zoom-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zoom-blue/20 group-hover:scale-105 transition-transform duration-200">
                <Monitor className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-sm text-zoom-text-primary">Share Screen</p>
                <p className="text-[11px] text-zoom-text-secondary mt-0.5">Present in desktop</p>
              </div>
            </button>
          </div>

          {/* Upcoming Meetings Section */}
          <div className="bg-white rounded-2xl border border-zoom-gray-border p-6 shadow-xs flex-1 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zoom-gray-border">
              <h2 className="text-lg font-bold text-zoom-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-zoom-blue" />
                Upcoming Meetings
              </h2>
              <button 
                onClick={loadMeetings}
                className="text-xs font-semibold text-zoom-blue hover:underline hover:text-zoom-blue-hover"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                <div className="w-8 h-8 border-4 border-zoom-blue border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-zoom-text-secondary">Loading meetings list...</p>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="font-medium text-sm text-zoom-text-primary">No upcoming meetings</p>
                <p className="text-xs text-zoom-text-secondary max-w-[240px] mt-1">
                  Schedule a meeting or start an instant meeting to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {upcoming.map((meeting) => {
                  const mDate = new Date(meeting.start_time);
                  return (
                    <div 
                      key={meeting.meeting_id}
                      className="p-4 rounded-xl border border-zoom-gray-border bg-slate-50 hover:bg-slate-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-zoom-blue bg-zoom-blue/10 px-2 py-0.5 rounded-full uppercase">
                          {format(mDate, "h:mm a")} ({meeting.duration} min)
                        </span>
                        <h3 className="font-bold text-sm text-zoom-text-primary mt-1">{meeting.title}</h3>
                        <p className="text-[11px] text-zoom-text-secondary flex items-center gap-1.5 font-medium">
                          <span>Host: {meeting.host_name}</span>
                          <span className="text-slate-300">•</span>
                          <span>ID: {meeting.meeting_id}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => copyToClipboard(meeting.meeting_id, meeting.invite_link)}
                          className="p-2 border border-zoom-gray-border bg-white rounded-lg hover:bg-slate-50 text-zoom-text-secondary hover:text-zoom-blue transition-colors cursor-pointer"
                          title="Copy Invitation Link"
                        >
                          {copiedId === meeting.meeting_id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => triggerDirectJoin(meeting.meeting_id)}
                          className="px-4 py-2 bg-zoom-blue text-white rounded-lg font-bold text-xs hover:bg-zoom-blue-hover shadow-xs transition-colors cursor-pointer"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Hand: Time Sidebar and Recent History (5 columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Desktop Zoom-style Live Card */}
          <div className="bg-gradient-to-br from-zoom-blue to-indigo-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[170px]">
            {/* Background circles ornament */}
            <div className="absolute top-[-50px] right-[-50px] w-[180px] h-[180px] bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between z-10">
              <div className="bg-white/15 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
                Local Time
              </div>
              <Clock className="w-5 h-5 opacity-70" />
            </div>

            <div className="mt-4 z-10">
              <p className="text-4xl font-extrabold tracking-tight font-mono">
                {mounted ? format(currentTime, "hh:mm:ss") : "--:--:--"}
                <span className="text-xl font-medium ml-1">{mounted ? format(currentTime, "a") : "--"}</span>
              </p>
              <p className="text-xs opacity-90 mt-1.5 font-medium tracking-wide">
                {mounted ? format(currentTime, "EEEE, MMMM d, yyyy") : "Loading date..."}
              </p>
            </div>
          </div>

          {/* Recent History Section */}
          <div className="bg-white rounded-2xl border border-zoom-gray-border p-6 shadow-xs flex-1 flex flex-col">
            <h2 className="text-sm font-bold text-zoom-text-secondary uppercase tracking-wider mb-4">
              Recent Meeting History
            </h2>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-zoom-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <p className="text-xs text-zoom-text-secondary">No history found</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[200px] pr-1 flex-1">
                {recent.map((meeting) => {
                  const mDate = new Date(meeting.start_time);
                  const participantsList = meeting.participants
                    ?.map((p) => p.user_name)
                    .join(", ");
                  return (
                    <div 
                      key={meeting.meeting_id}
                      className="py-3 px-4 rounded-xl border border-dashed border-zoom-gray-border bg-slate-50/50 hover:bg-slate-50 flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-zoom-text-primary line-clamp-1">{meeting.title}</h4>
                          <p className="text-[10px] text-zoom-text-secondary mt-0.5 font-medium">
                            {format(mDate, "MMM d, yyyy • h:mm a")} • {meeting.duration}m
                          </p>
                        </div>
                        <button
                          onClick={() => triggerDirectJoin(meeting.meeting_id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-zoom-blue hover:text-white border border-zoom-gray-border text-zoom-text-primary rounded-md text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Rejoin
                        </button>
                      </div>
                      
                      {participantsList && (
                        <div className="text-[10px] text-zoom-text-secondary bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-medium">
                          <span className="font-bold text-slate-400">In Call:</span>
                          <span className="truncate flex-1 max-w-[200px]" title={participantsList}>
                            {participantsList}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 3. Modals implementation */}
      
      {/* A. NEW MEETING MODAL */}
      {activeModal === "new" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-zoom-gray-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-zoom-text-secondary hover:text-zoom-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zoom-text-primary mb-4">Start a Meeting</h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-zoom-gray-border hover:bg-slate-50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={newVideoOn}
                  onChange={(e) => setNewVideoOn(e.target.checked)}
                  className="w-4 h-4 text-zoom-blue border-zoom-gray-border rounded focus:ring-zoom-blue"
                />
                <div>
                  <p className="text-sm font-bold text-zoom-text-primary">Start with Video</p>
                  <p className="text-[11px] text-zoom-text-secondary">Enable camera immediately on load</p>
                </div>
              </label>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-zoom-gray-border text-zoom-text-secondary rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartInstantMeeting}
                  className="flex-1 py-2.5 bg-zoom-orange text-white rounded-xl text-sm font-semibold hover:bg-zoom-orange-hover shadow-xs transition-colors cursor-pointer"
                >
                  Start Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. JOIN MEETING MODAL */}
      {activeModal === "join" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-zoom-gray-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-zoom-text-secondary hover:text-zoom-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zoom-text-primary mb-4">Join Meeting</h3>
            
            <form onSubmit={handleJoinMeetingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                  Meeting ID or Personal Link Name
                </label>
                <input 
                  type="text" 
                  value={joinMeetingId}
                  onChange={(e) => setJoinMeetingId(e.target.value)}
                  placeholder="e.g. 111-222-333"
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                  Your Name
                </label>
                <input 
                  type="text" 
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-zoom-gray-border text-zoom-text-secondary rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zoom-blue text-white rounded-xl text-sm font-semibold hover:bg-zoom-blue-hover shadow-xs transition-colors cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. SCHEDULE MEETING MODAL */}
      {activeModal === "schedule" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-zoom-gray-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-zoom-text-secondary hover:text-zoom-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zoom-text-primary mb-4">Schedule Meeting</h3>
            
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                  Topic / Title
                </label>
                <input 
                  type="text" 
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="e.g. Weekly Status Sync"
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                  Description
                </label>
                <textarea 
                  value={scheduleDescription}
                  onChange={(e) => setScheduleDescription(e.target.value)}
                  placeholder="Review agenda and project updates"
                  rows={2}
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                    Start Time
                  </label>
                  <input 
                    type="time" 
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={scheduleTimezone}
                    onChange={(e) => setScheduleTimezone(e.target.value)}
                    className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="PST">PST (Pacific Standard Time)</option>
                    <option value="IST">IST (India Standard Time)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                    Duration
                  </label>
                  <select
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(parseInt(e.target.value))}
                    className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>1h</option>
                    <option value={90}>1.5h</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zoom-text-secondary uppercase mb-1.5">
                  Host Display Name
                </label>
                <input 
                  type="text" 
                  value={scheduleHostName}
                  onChange={(e) => setScheduleHostName(e.target.value)}
                  placeholder={userName}
                  className="w-full border border-zoom-gray-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zoom-blue transition-colors bg-slate-50"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-zoom-gray-border text-zoom-text-secondary rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zoom-blue text-white rounded-xl text-sm font-semibold hover:bg-zoom-blue-hover shadow-xs transition-colors cursor-pointer"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. SHARE SCREEN HELP MODAL */}
      {activeModal === "share" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-zoom-gray-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-zoom-text-secondary hover:text-zoom-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zoom-text-primary mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-zoom-blue" />
              Share Screen
            </h3>
            
            <p className="text-xs text-zoom-text-secondary leading-relaxed mb-4">
              To present your screen, first enter a meeting. Screen sharing controls are available in the bottom toolbar of any active meeting room.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveModal("join");
                }}
                className="w-full py-2.5 bg-zoom-blue text-white rounded-xl text-xs font-semibold hover:bg-zoom-blue-hover shadow-xs transition-colors cursor-pointer"
              >
                Join an Existing Meeting
              </button>
              <button
                onClick={handleStartInstantMeeting}
                className="w-full py-2.5 border border-zoom-gray-border text-zoom-text-primary rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Start an Instant Meeting instead
              </button>
            </div>
          </div>
        </div>
      )}
      {/* E. MEETING INVITE MODAL */}
      {inviteMeeting && (
        <MeetingInviteModal
          meeting={inviteMeeting}
          isScheduled={inviteIsScheduled}
          actionLabel={inviteIsScheduled ? "View Dashboard" : "Start Meeting"}
          onClose={() => setInviteMeeting(null)}
          onStart={() => {
            if (inviteIsScheduled) {
              setInviteMeeting(null);
            } else {
              router.push(`/meeting/${inviteMeeting.meeting_id}?video=${newVideoOn}`);
            }
          }}
        />
      )}
    </div>
  );
}
