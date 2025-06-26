import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { FinanceCacheProvider } from "@/lib/financeCache";
import { ModuleProvider } from "@/lib/moduleContext";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";
import BottomNavigation from "@/components/ui/BottomNavigation";
import MobileHeader from "@/components/ui/MobileHeader";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mosaiko",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1f2937",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="scroll-smooth">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mosaiko" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS Splash Screens */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-orientation" content="portrait" />
        
        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} antialiased`}>
        <AuthProvider>
          <ModuleProvider>
            <FinanceCacheProvider>
              <div className="flex h-screen bg-gray-50">
                {/* Desktop Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                  {/* Mobile Header */}
                  <MobileHeader />
                  
                  {/* Page Content */}
                  <div className="flex-1 overflow-y-auto pwa-scroll">
                    <div className="pb-16 md:pb-0">
                      {children}
                    </div>
                  </div>
                </main>
              </div>
              
              {/* Mobile Bottom Navigation */}
              <BottomNavigation />
              
              {/* PWA Install Prompt */}
              <PWAInstallPrompt />
            </FinanceCacheProvider>
          </ModuleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}