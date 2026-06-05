#!/usr/bin/env node
/**
 * Generates a 4-second 16kHz mono WAV file with a 440 Hz sine tone.
 * Used as the fake microphone input for Playwright Chromium tests.
 * Run: node scripts/e2e/gen-fixture.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "fixtures", "test-audio.wav");

const SAMPLE_RATE = 16000;
const DURATION = 4; // seconds
const FREQ = 440; // Hz
const AMPLITUDE = 0.3;
const NUM_SAMPLES = SAMPLE_RATE * DURATION;

const pcm = new Int16Array(NUM_SAMPLES);
for (let i = 0; i < NUM_SAMPLES; i++) {
  pcm[i] = Math.round(32767 * AMPLITUDE * Math.sin((2 * Math.PI * FREQ * i) / SAMPLE_RATE));
}

function buildWav(samples, sampleRate) {
  const dataBytes = samples.length * 2; // 16-bit = 2 bytes per sample
  const buf = Buffer.allocUnsafe(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);       // PCM chunk size
  buf.writeUInt16LE(1, 20);        // PCM format
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buf;
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, buildWav(pcm, SAMPLE_RATE));
console.log(`Generated: ${OUT}`);
