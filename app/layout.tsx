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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
