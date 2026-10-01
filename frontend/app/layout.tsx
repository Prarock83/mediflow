import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediFlow - Patient Portal",
  description: "MediFlow Patient Portal & Healthcare Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-slate-50 font-body-md text-body-md text-on-surface antialiased relative min-h-screen selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}

