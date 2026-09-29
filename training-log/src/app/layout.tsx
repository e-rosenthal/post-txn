import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppDataProvider } from "@/components/AppData";
import { Shell } from "@/components/Shell";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cadence — training log",
  description: "Plan your running week, tick off what you actually did, and watch the weeks stack up.",
  // Opens full-screen once added to an iOS home screen.
  appleWebApp: { capable: true, title: "Cadence", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

/** Applies the saved theme before first paint so there is no flash. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('cadence-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={geist.variable}>
        <AppDataProvider>
          <Shell>{children}</Shell>
        </AppDataProvider>
      </body>
    </html>
  );
}
