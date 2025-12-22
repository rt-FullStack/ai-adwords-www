// src/app/layout.js - CORRECTED VERSION
import { Inter } from "next/font/google";
import ScrollToTop from "@/components/ScrollToTop";
import Header from "@/components/Header";
import { AuthProvider } from "@/components/authContext";
import "./globals.css";
import Footer from "@/components/Footer";
import PersistentToastWrapper from "@/components/PersistentToastWrapper";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  title: "AI-ADWORDS",
  description: "AI-ADWORDS application - Powered by AdSaver",
  icons: {
    // CORRECTED: Use absolute path from public folder
    icon: "/adSaver.png", // Changed from "./public/adSaver.png"
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-gradient-to-b from-[#B2DAFF] to-[#FFFFFF] min-h-screen mx-auto max-w-7xl px-4 pb-4 ${inter.className}`}
        suppressHydrationWarning>
        <AuthProvider>
          <ScrollToTop />
          <Header />
          <main className="pt-[170px]">
            {children}
          </main>
          <Footer />
          <PersistentToastWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}