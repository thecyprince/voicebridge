import { defineConfig, devices } from "@playwright/test";
import path from "path";

// CJS-compatible path resolution (Playwright's TS loader runs CJS)
const FIXTURES = path.resolve(__dirname, "fixtures");
const FIXTURE = path.join(FIXTURES, "test-audio.wav");

export default defineConfig({
  testDir: __dirname,
  timeout: 120_000,
  expect: { timeout: 90_000 },
  retries: 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-fake-mic",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            `--use-file-for-fake-audio-capture=${FIXTURE}`,
            "--allow-file-access-from-files",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
        permissions: ["microphone"],
      },
    },
    {
      name: "webkit-smoke",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});
