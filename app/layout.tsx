import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Mobile Check Up Registration",
  description: "Check Up Flow System — Team 2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* JsBarcode — load locally, no CDN dependency */}
        <script src="/jsbarcode.min.js" defer />
      </head>
      <body>
        {/* Global Loading Popup */}
        <div
          id="global-loading"
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 40, 55, 0.35)",
            backdropFilter: "blur(1px)",
            pointerEvents: "auto",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            background: "#fff",
            color: "#0c6075",
            padding: "26px 38px",
            borderRadius: 16,
            minWidth: 200,
            boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#109cbe" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
            <span id="global-loading-text" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.01em" }}>
              กำลังโหลด...
            </span>
          </div>
        </div>
        {children}
        <Toaster />
        <style>{`
          #global-loading { animation: fadeIn 0.15s ease; }
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          #global-loading svg { animation: spin 0.7s linear infinite; transform-origin: 50% 50%; }
          @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        `}</style>
      </body>
    </html>
  );
}
