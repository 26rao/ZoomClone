"use client";

import React, { useState } from "react";
import { Copy, Check, X, Video, Calendar, Link2, Shield } from "lucide-react";
import { Meeting } from "../lib/api";
import toast from "react-hot-toast";

interface MeetingInviteModalProps {
  meeting: Meeting;
  actionLabel?: string;
  onStart: () => void;
  onClose: () => void;
  isScheduled?: boolean;
}

export default function MeetingInviteModal({
  meeting,
  actionLabel = "Start Meeting",
  onStart,
  onClose,
  isScheduled = false,
}: MeetingInviteModalProps) {
  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/meeting/${meeting.meeting_id}${
          meeting.passcode ? `?passcode=${meeting.passcode}` : ""
        }`
      : meeting.invite_link;

  const [copiedField, setCopiedField] = useState<"id" | "code" | "link" | "all" | null>(null);

  const copy = (field: "id" | "code" | "link" | "all", text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const copyFullInvitation = () => {
    const lines: string[] = [
      `Join my Zoom meeting:`,
      `Topic: ${meeting.title}`,
      ``,
      `Meeting ID: ${meeting.meeting_id}`,
      ...(meeting.passcode ? [`Passcode: ${meeting.passcode}`] : []),
      ``,
      `Join Link: ${inviteLink}`,
    ];
    copy("all", lines.join("\n"));
  };

  const CopyBtn = ({ field, value }: { field: "id" | "code" | "link"; value: string }) => (
    <button
      onClick={() => copy(field, value)}
      className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-all shrink-0"
      title="Copy"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#1C1C25] rounded-2xl w-full max-w-md text-white shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                isScheduled
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                  : "bg-gradient-to-br from-green-500 to-emerald-600"
              }`}
            >
              {isScheduled ? (
                <Calendar className="w-5 h-5 text-white" />
              ) : (
                <Video className="w-5 h-5 text-white fill-current" />
              )}
            </div>
            <div>
              <h2 id="invite-modal-title" className="text-lg font-bold text-white leading-tight">
                {isScheduled ? "Meeting Scheduled!" : "Your Meeting is Ready!"}
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">{meeting.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[11px] font-semibold text-green-400">
              End-to-End Encrypted &bull; Only invited participants can join
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Meeting ID</p>
            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3">
              <span className="font-mono text-xl font-bold text-white flex-1 tracking-widest">
                {meeting.meeting_id}
              </span>
              <CopyBtn field="id" value={meeting.meeting_id} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Passcode</p>
            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3">
              {meeting.passcode ? (
                <>
                  <span className="font-mono text-xl font-bold text-amber-400 flex-1 tracking-widest">
                    {meeting.passcode}
                  </span>
                  <CopyBtn field="code" value={meeting.passcode} />
                </>
              ) : (
                <span className="text-sm text-zinc-500 italic flex-1">No passcode required</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Invite Link</p>
            <div className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3">
              <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-300 flex-1 break-all leading-relaxed">{inviteLink}</span>
              <CopyBtn field="link" value={inviteLink} />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={copyFullInvitation}
            className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            {copiedField === "all" ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Invitation
              </>
            )}
          </button>
          <button
            onClick={onStart}
            className="flex-1 py-3 bg-[#0E72ED] hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}