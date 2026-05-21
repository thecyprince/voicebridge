"use client";

import { useState, useRef, useCallback } from "react";
import { Memo } from "@/types";

interface RecorderProps {
  onMemoCreated: (memo: Memo) => void;
}

type State = "idle" | "recording" | "uploading" | "error";

export function Recorder({ onMemoCreated }: RecorderProps) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await upload(blob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch (err: any) {
      setError("Microphone access denied.");
      setState("error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setState("uploading");
  }, []);

  const upload = async (blob: Blob) => {
    try {
      const form = new FormData();
      form.append("audio", blob, "memo.webm");
      const res = await fetch("/api/memos", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const { memo } = await res.json();
      onMemoCreated(memo);
      setState("idle");
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
      setState("error");
    }
  };

  const label: Record<State, string> = {
    idle: "⏺ Record",
    recording: "⏹ Stop",
    uploading: "Processing…",
    error: "⏺ Retry",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "uploading"}
        className={[
          "w-16 h-16 rounded-full text-white font-bold text-sm shadow-lg transition-all",
          state === "recording"
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : state === "uploading"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600",
        ].join(" ")}
      >
        {state === "uploading" ? (
          <span className="animate-spin inline-block">⏳</span>
        ) : (
          label[state]
        )}
      </button>
      {error && <p className="text-xs text-red-500 max-w-[180px] text-center">{error}</p>}
    </div>
  );
}
