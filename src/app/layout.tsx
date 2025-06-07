import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mosaiko - Personal Finance Management",
  description: "Your smart financial companion for tracking expenses, managing budgets, and achieving your financial goals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <AuthProvider>
          <div className="lg:flex h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="pt-16 lg:pt-0">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
