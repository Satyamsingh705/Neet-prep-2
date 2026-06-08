"use client";

import { useState } from "react";

async function waitForAttemptPage(attemptUrl: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(attemptUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (response.ok) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }

  throw new Error("Attempt page did not become ready in time.");
}

export function InstructionsClient({ testId }: { testId: string }) {
  const [accepted, setAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/";
  }

  async function startTestInNewWindow() {
    setIsStarting(true);

    const examWindow = window.open("about:blank", "_blank", "popup=yes,width=1440,height=960");

    if (!examWindow) {
      setIsStarting(false);
      window.alert("Allow popups to start the test window.");
      return;
    }

    examWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Starting Test</title>
          <style>
            :root {
              color-scheme: light;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background:
                radial-gradient(circle at top left, rgba(255, 255, 255, 0.92), transparent 28%),
                linear-gradient(180deg, #efebe4 0%, #e6e1d8 100%);
              color: #2f241c;
              font-family: Cambria, "Palatino Linotype", Georgia, serif;
            }

            .launch-screen {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
              padding: 32px 36px;
              border: 1px solid #dccfbe;
              border-radius: 28px;
              background: rgba(255, 255, 255, 0.88);
              box-shadow: 0 24px 60px rgba(79, 52, 26, 0.14);
            }

            .spinner {
              width: 68px;
              height: 68px;
              border-radius: 9999px;
              border: 6px solid rgba(215, 103, 27, 0.18);
              border-top-color: #d7671b;
              animation: spin 0.9s linear infinite;
            }

            .title {
              font-size: 1.55rem;
              font-weight: 700;
              letter-spacing: 0.01em;
            }

            .subtitle {
              max-width: 360px;
              text-align: center;
              font-size: 0.98rem;
              line-height: 1.7;
              color: #65584a;
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          </style>
        </head>
        <body>
          <div class="launch-screen">
            <div class="spinner" aria-hidden="true"></div>
            <div class="title">Starting Test</div>
            <div class="subtitle">Preparing your attempt and loading the exam window. This can take a few seconds.</div>
          </div>
        </body>
      </html>
    `);
    examWindow.document.close();

    try {
      const response = await fetch(`/api/tests/${testId}/start`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        examWindow.close();
        setIsStarting(false);
        window.alert(payload.error ?? "Failed to start test.");
        return;
      }

      const attemptUrl = new URL(`/attempts/${payload.attemptId}`, window.location.origin).toString();
      await waitForAttemptPage(attemptUrl);
      examWindow.location.replace(attemptUrl);
      setIsStarting(false);
    } catch {
      examWindow.close();
      setIsStarting(false);
      window.alert("Failed to start test.");
    }
  }

  return (
    <div className="mt-7 border-t border-[#e6d8ca] pt-6 pb-24 lg:pb-0">
      <label className="flex max-w-[760px] items-start gap-3 text-[1rem] leading-7 font-semibold text-[#3a3028] lg:text-[1.02rem]">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        <span>I have gone through the instructions, understood the legends, and will follow the rules.</span>
      </label>

      <div className="mt-6 hidden lg:flex lg:items-center lg:justify-between">
        <button type="button" className="btn-secondary min-w-[150px]" onClick={goBack}>
          Back
        </button>
        <button
          disabled={!accepted || isStarting}
          className="btn-primary min-w-[170px]"
          onClick={() => void startTestInNewWindow()}
          type="button"
        >
          Start Test
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d9cfc3] bg-[#f3f0ea] px-4 py-4 shadow-[0_-16px_30px_rgba(79,52,26,0.08)] lg:hidden">
        <div className="grid grid-cols-2 gap-4">
          <button type="button" className="btn-secondary w-full" onClick={goBack}>
            Back
          </button>
          <button
            disabled={!accepted || isStarting}
            className="btn-primary w-full"
            onClick={() => void startTestInNewWindow()}
            type="button"
          >
            {isStarting ? "Starting..." : "Start Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
