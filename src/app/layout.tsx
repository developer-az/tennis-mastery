import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import "./globals.css";

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Strokeform — Scientific Tennis Form Coaching",
  description:
    "Explore elite tennis biomechanics in 3D. Joint angles, kinetic-chain timing, spin, and racket-path data mapped onto interactive player models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden font-sans">
        <AppHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
