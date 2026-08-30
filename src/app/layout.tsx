import type { Metadata, Viewport } from "next";
import { Outfit, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileAppNav } from "@/components/layout/MobileAppNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Strokeform — Tennis Mold, Form Lab & Gear Intelligence",
    template: "%s · Strokeform",
  },
  description:
    "Scrub elite stroke rails in 3D, mold your bag with skill spans and quirks, and keep every gear change accountable to how you play.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

/** Inline script avoids flash before React hydrates theme from localStorage / prefers-color-scheme. */
const themeBoot = `(function(){try{var k='strokeform-theme';var s=localStorage.getItem(k);var m=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',m);document.documentElement.style.colorScheme=m;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden font-sans">
        <ThemeProvider>
          <AuthProvider>
            <AppHeader />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
              {children}
            </div>
            <MobileAppNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
