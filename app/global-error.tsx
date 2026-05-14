"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

// Global error replaces the root layout — no providers, no imports from the app.
// Must include its own <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <head>
        <title>Critical Error — Trakzi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            min-height: 100svh;
            background: #FAF9F5;
            color: #1F1E1D;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            overflow: hidden;
          }

          @media (prefers-color-scheme: dark) {
            body { background: #212121; color: #ECECEC; }
            .card { background: #262624; border-color: #454540; }
            .detail-box { background: #30302E; border-color: #454540; color: #B4B4B4; }
            .label { color: #B4B4B4; }
            .btn-reset { background: #E5AA7F; color: #1F1E1D; }
            .btn-reset:hover { opacity: 0.88; }
          }

          .glow {
            position: fixed;
            inset: 0;
            pointer-events: none;
            background: radial-gradient(ellipse 50% 35% at 50% 50%, rgba(203, 90, 48, 0.09) 0%, transparent 70%);
          }

          .wrapper {
            position: relative;
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            animation: rise 0.5s cubic-bezier(0.2, 0, 0, 1) both;
          }

          @keyframes rise {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* Vertical bar chart — bars intentionally all at 0 except left side */
          .bars {
            display: flex;
            align-items: flex-end;
            gap: 6px;
            height: 64px;
          }

          .bar {
            flex: 1;
            border-radius: 4px 4px 0 0;
            opacity: 0.15;
            background: #C6613F;
            animation: bar-drop 0.6s cubic-bezier(0.2, 0, 0, 1) both;
          }

          @keyframes bar-drop {
            from { height: var(--h); opacity: 0.7; }
            to   { height: 4px; opacity: 0.15; }
          }

          .bar-label {
            text-align: center;
            font-size: 10px;
            color: #888;
            letter-spacing: 0.06em;
            margin-top: 6px;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            color: #C6613F;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid rgba(198, 97, 63, 0.35);
            background: rgba(198, 97, 63, 0.06);
          }

          .badge::before {
            content: "";
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #C6613F;
            animation: pulse 1.5s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.75); }
          }

          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            line-height: 1.2;
          }

          .label {
            font-size: 0.875rem;
            color: #73726C;
            line-height: 1.6;
            margin-top: 0.5rem;
          }

          .card {
            border: 1px solid #DDDDDD;
            border-radius: 12px;
            overflow: hidden;
          }

          .detail-box {
            font-family: ui-monospace, monospace;
            font-size: 11px;
            background: #F0EEE6;
            border: 1px solid #DDDDDD;
            border-radius: 8px;
            padding: 12px 14px;
            color: #73726C;
            word-break: break-all;
            line-height: 1.6;
          }

          .digest {
            font-size: 10px;
            opacity: 0.5;
            margin-top: 6px;
          }

          .actions {
            display: flex;
            gap: 10px;
          }

          button, a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            height: 40px;
            padding: 0 18px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            border: none;
            transition: opacity 0.15s;
            flex: 1;
          }

          .btn-reset {
            background: #C6613F;
            color: #fff;
          }

          .btn-reset:hover { opacity: 0.88; }

          .btn-home {
            background: transparent;
            border: 1px solid #DDDDDD;
            color: #1F1E1D;
          }

          @media (prefers-color-scheme: dark) {
            .btn-home { border-color: #454540; color: #ECECEC; }
          }

          .btn-home:hover { opacity: 0.75; }

          footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            letter-spacing: 0.05em;
          }
        `}</style>
      </head>
      <body>
        <div className="glow" />

        <div className="wrapper">
          {/* Collapsing bar chart visual */}
          <div>
            <div className="bars">
              {[52, 44, 60, 38, 55, 48, 62, 40, 50, 56, 35, 58].map((h, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{
                    ["--h" as string]: `${h}px`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              ))}
            </div>
            <div className="bar-label">SYSTEM UPTIME (%)</div>
          </div>

          {/* Status badge + heading */}
          <div>
            <span className="badge">System error</span>
            <h1 style={{ marginTop: "1rem" }}>Something critical<br />went wrong</h1>
            <p className="label">
              Trakzi hit an unrecoverable error at the root level.
              Your data is safe. Reloading usually fixes this.
            </p>
          </div>

          {/* Error detail */}
          {(error.message || error.digest) && (
            <div className="detail-box">
              {error.message || "Unknown error"}
              {error.digest && <div className="digest">Digest: {error.digest}</div>}
            </div>
          )}

          {/* Actions */}
          <div className="actions">
            <button className="btn-reset" onClick={reset}>
              ↺ Reload app
            </button>
            <a className="btn-home" href="/home">
              ⌂ Home
            </a>
          </div>

          <footer>TRAKZI · CRITICAL ERROR</footer>
        </div>
      </body>
    </html>
  )
}
