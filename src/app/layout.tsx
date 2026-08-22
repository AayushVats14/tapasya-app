import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tapasya | Deep Work Workspace for JEE/NEET",
  description:
    "Set your daily Sankalp, eliminate digital distractions, and climb the Virtual Kota leaderboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Toaster
          position="top-center" // Moves it up toward the center-top where it's easily noticed
          toastOptions={{
            duration: 4000,
            style: {
              background: "#18181b", // Dark zinc background
              color: "#f4f4f5", // Bright text
              border: "1px solid rgba(249, 115, 22, 0.3)", // Subtle orange border to match your theme
              padding: "16px 24px", // Makes the box physically larger and chunkier
              fontSize: "15px", // Larger, more readable text
              borderRadius: "16px", // Smooth rounded edges
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)", // Deep shadow for depth
            },
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
