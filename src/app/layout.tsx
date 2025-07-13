import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { FinanceCacheProvider } from "@/lib/financeCache";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { BottomMenu } from "@/components/ui/BottomMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// EB Garamond font configuration
const ebGaramond = EB_Garamond({
  variable: "--font-debbie-bc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mosaiko - Personal Life Management",
  description: "La tua piattaforma per la gestione personale",
  keywords: ["gestione", "personale", "produttività", "finanze", "salute", "apprendimento"],
  authors: [{ name: "Mosaiko Team" }],
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} antialiased`}>
        <AuthProvider>
          <FinanceCacheProvider>
            <div className="flex h-screen bg-gray-50">
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:block">
                <Sidebar />
              </div>
              
              {/* Main content */}
              <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
              </main>
              
              {/* Mobile Bottom Menu */}
              <BottomMenu />
            </div>
          </FinanceCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}