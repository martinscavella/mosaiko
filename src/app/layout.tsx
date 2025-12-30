import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { FinanceCacheProvider } from "@/lib/financeCache";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { BottomMenu } from "@/components/ui/BottomMenu";
import PWAManager from "@/components/PWAManager";
import { IOSPWASetup } from "@/components/IOSPWASetup";

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
  description: "La tua piattaforma intelligente per la gestione personale",
  keywords: ["gestione", "personale", "produttività", "finanze", "salute", "apprendimento"],
  authors: [{ name: "Mosaiko Team" }],
  robots: "index, follow",
  
  // PWA Metadata
  applicationName: "Mosaiko",
  appleWebApp: {
    capable: true,
    title: "Mosaiko",
    statusBarStyle: "default",
    startupImage: [
      {
        url: "/icons/apple-touch-startup-image-768x1004.png",
        media: "(device-width: 768px) and (device-height: 1024px)"
      },
      {
        url: "/icons/apple-touch-startup-image-1536x2008.png", 
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    title: "Mosaiko - Personal Life Management", 
    description: "La tua piattaforma intelligente per la gestione personale",
    siteName: "Mosaiko",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Mosaiko Logo"
      }
    ]
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Mosaiko - Personal Life Management",
    description: "La tua piattaforma intelligente per la gestione personale", 
    images: ["/icons/icon-512x512.png"]
  },
  
  // Icons
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "32x32" },
    { rel: "icon", url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180" },
    { rel: "mask-icon", url: "/icons/icon-192x192.png", color: "#3b82f6" }
  ],
  
  // Manifest
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1E90FF" },
    { media: "(prefers-color-scheme: dark)", color: "#1E90FF" }
  ],
  viewportFit: "cover",
  interactiveWidget: "resizes-content"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="scroll-smooth">
      <head>
        {/* Additional iOS and PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mosaiko" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS specific meta tags for better app-like behavior */}
        <meta name="apple-mobile-web-app-orientations" content="portrait" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport-fit" content="cover" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Additional Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
        
        {/* Startup images for iOS */}
        <link rel="apple-touch-startup-image" 
              media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" 
              href="/icons/apple-touch-startup-image-1290x2796.png" />
        <link rel="apple-touch-startup-image" 
              media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" 
              href="/icons/apple-touch-startup-image-1170x2532.png" />
        <link rel="apple-touch-startup-image" 
              media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" 
              href="/icons/apple-touch-startup-image-1125x2436.png" />
        <link rel="apple-touch-startup-image" 
              media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" 
              href="/icons/apple-touch-startup-image-750x1334.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} antialiased`}>
        <AuthProvider>
          <FinanceCacheProvider>
            <div className="flex h-screen bg-gray-50 safe-area-container">
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                <Sidebar />
              </div>
              
              {/* Main content with ultrawide optimization */}
              <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                <div className="w-full max-w-[2000px] mx-auto 3xl:px-8 4xl:px-12">
                  {children}
                </div>
              </main>
              
              {/* Mobile Bottom Menu */}
              <BottomMenu />
            </div>
            
            {/* PWA Manager Component */}
            <PWAManager />
            
            {/* iOS PWA Setup */}
            <IOSPWASetup />
          </FinanceCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}