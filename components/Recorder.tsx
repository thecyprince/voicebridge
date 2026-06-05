"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Memo } from "@/types";
import { toast } from "sonner";

// ---------- helpers ----------

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ---------- waveform ----------

function Waveform({
  analyserRef,
}: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BARS = 16;

    function draw() {
      const analyser = analyserRef.current;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const barW = canvas!.width / BARS;
        for (let i = 0; i < BARS; i++) {
          const idx = Math.floor((i / BARS) * buf.length);
          const level = buf[idx] / 255;
          const h = Math.max(2, level * canvas!.height);
          const alpha = 0.35 + 0.65 * level;
          ctx!.fillStyle = `rgba(239,68,68,${alpha})`;
          ctx!.beginPath();
          ctx!.roundRect(i * barW + 1, canvas!.height - h, barW - 2, h, 2);
          ctx!.fill();
        }
      } else {
        // idle dots
        for (let i = 0; i < BARS; i++) {
          ctx!.fillStyle = "rgba(209,213,219,0.6)";
          ctx!.beginPath();
          ctx!.roundRect(i * (canvas!.width / BARS) + 1, canvas!.height / 2 - 1, (canvas!.width / BARS) - 2, 2, 1);
          ctx!.fill();
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);

  return <canvas ref={canvasRef} width={80} height={20} className="block" />;
}

// ---------- types ----------

type Stage =
  | "idle"
  | "recording"
  | "preview"       // captured, awaiting send or discard
  | "uploading"
  | "transcribing"
  | "summarizing"
  | "error";

const PROCESS_STAGES: Stage[] = ["uploading", "transcribing", "summarizing"];
const STAGE_LABEL: Record<Stage, string> = {
  idle: "⏺",
  recording: "⏹",
  preview: "↑",
  uploading: "↑",
  transcribing: "↑",
  summarizing: "↑",
  error: "⏺",
};

// ---------- component ----------

interface RecorderProps {
  onMemoCreated: (memo: Memo) => void;
}

export function Recorder({ onMemoCreated }: RecorderProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const capturedRef = useRef<{ blob: Blob; mimeType: string } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // cleanup on unmount
  useEffect(() => () => { stopStream(); clearTimers(); }, []);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    progressTimersRef.current.forEach(clearTimeout);
    progressTimersRef.current = [];
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }

  const startRecording = useCallback(async () => {
    setError(null);
    setElapsed(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      setStage("error");
      toast.error("Microphone access denied.");
      return;
    }

    // waveform (non-critical)
    try {
      const actx = new AudioContext();
      audioCtxRef.current = actx;
      const src = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;
    } catch {}

    streamRef.current = stream;
    const mimeType = pickMimeType();

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err: any) {
      stopStream();
      const msg = err?.message ?? "Could not start recorder.";
      setError(msg);
      setStage("error");
      toast.error(msg);
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      const finalMime = recorder.mimeType || mimeType || "audio/webm";
      capturedRef.current = {
        blob: new Blob(chunksRef.current, { type: finalMime }),
        mimeType: finalMime,
      };
      setStage("preview");
    };

    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setStage("recording");
    timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const discard = useCallback(() => {
    capturedRef.current = null;
    setElapsed(0);
    setStage("idle");
    toast("Recording discarded.");
  }, []);

  const upload = useCallback(async () => {
    const captured = capturedRef.current;
    if (!captured) return;
    const { blob, mimeType } = captured;
    const ext = mimeToExt(mimeType);

    setStage("uploading");
    const t1 = setTimeout(() => setStage("transcribing"), 3500);
    const t2 = setTimeout(() => setStage("summarizing"), 11000);
    progressTimersRef.current = [t1, t2];

    try {
      const form = new FormData();
      form.append("audio", blob, `memo.${ext}`);
      const res = await fetch("/api/memos", { method: "POST", body: form });
      clearTimers();
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error ${res.status}`);
      }
      const { memo } = await res.json();
      onMemoCreated(memo);
      capturedRef.current = null;
      setElapsed(0);
      setStage("idle");
      toast.success("Memo saved!");
    } catch (err: any) {
      clearTimers();
      const msg = err?.message ?? "Upload failed.";
      setError(msg);
      setStage("error");
      toast.error(msg);
    }
  }, [onMemoCreated]);

  const isProcessing = PROCESS_STAGES.includes(stage);
  const processLabel: Record<string, string> = {
    uploading: "Uploading audio…",
    transcribing: "Transcribing…",
    summarizing: "Summarizing with AI…",
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full select-none">
      {/* waveform + timer during recording */}
      {stage === "recording" && (
        <div className="flex items-center gap-2">
          <Waveform analyserRef={analyserRef} />
          <span className="text-xs text-red-500 font-mono tabular-nums">
            {fmtTime(elapsed)}
          </span>
        </div>
      )}

      {/* preview: duration + discard */}
      {stage === "preview" && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{fmtTime(elapsed)} recorded</span>
          <span>·</span>
          <button
            onClick={discard}
            className="text-red-400 hover:text-red-600 underline underline-offset-2"
          >
            Discard
          </button>
        </div>
      )}

      {/* processing label */}
      {isProcessing && (
        <p className="text-xs text-gray-400 animate-pulse text-center">
          {processLabel[stage]}
        </p>
      )}

      {/* main button */}
      <button
        data-testid={
          stage === "recording"
            ? "btn-stop"
            : stage === "preview"
              ? "btn-send"
              : "btn-record"
        }
        onClick={
          stage === "recording"
            ? stopRecording
            : stage === "preview"
              ? upload
              : !isProcessing
                ? startRecording
                : undefined
        }
        disabled={isProcessing}
        title={
          stage === "recording"
            ? "Stop recording"
            : stage === "preview"
              ? "Upload memo"
              : stage === "error"
                ? "Retry"
                : "Start recording"
        }
        className={[
          "w-14 h-14 rounded-full text-white text-xl font-bold shadow-lg transition-all shrink-0",
          stage === "recording"
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : isProcessing
              ? "bg-gray-300 cursor-not-allowed dark:bg-gray-600"
              : stage === "preview"
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600",
        ].join(" ")}
      >
        {STAGE_LABEL[stage]}
      </button>

      {error && (
        <p className="text-xs text-red-500 max-w-[180px] text-center leading-tight">
          {error}
        </p>
      )}
    </div>
  );
}
