const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Participant {
  id: number;
  meeting_id: string;
  user_name: string;
  joined_at: string;
}

export interface Meeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string | null;
  host_id: string;
  host_name: string;
  start_time: string;
  scheduled_time?: string | null;
  duration: number;
  status: string;
  invite_link: string;
  passcode?: string | null;
  is_active?: boolean;
  is_demo?: boolean;
  demo_participants?: string[];
  participants: Participant[];
}

export interface MeetingCreateInput {
  title: string;
  description?: string;
  duration: number;
  host_id: string;
  host_name: string;
  start_time: string; // ISO String
}

export async function fetchUpcomingMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch(`${API_URL}/meetings/upcoming`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch upcoming meetings");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchRecentMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch(`${API_URL}/meetings/recent`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch recent meetings");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createInstantMeeting(input: MeetingCreateInput): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/instant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create instant meeting");
  }
  return await res.json();
}

export async function scheduleMeeting(input: MeetingCreateInput): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to schedule meeting");
  }
  return await res.json();
}

export async function joinMeeting(meetingId: string, userName: string, userId?: string): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/join/${meetingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: userName, user_id: userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to join meeting");
  }
  return await res.json();
}

export async function fetchMeetingDetails(meetingId: string): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch meeting details");
  }
  return await res.json();
}

export async function removeParticipant(meetingId: string, userName: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/participants/${encodeURIComponent(userName)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to remove participant");
  }
}

export interface TokenResponse {
  token: string;
  api_key: string;
}

export async function fetchStreamToken(userId: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/meetings/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch stream token");
  }
  return await res.json();
}

export interface AuthResponse {
  token: string;
  user_id: string;
  name: string;
  email: string;
}

export async function registerUser(name: string, email: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to register user");
  }
  return await res.json();
}

export async function loginUser(email: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to sign in. Please verify your email.");
  }
  return await res.json();
}

export async function fetchAuthMe(token: string): Promise<any> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user session");
  }
  return await res.json();
}


