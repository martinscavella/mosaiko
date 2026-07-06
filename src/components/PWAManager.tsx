'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)
    
    // Check if running in standalone mode (app-like)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as unknown as { standalone?: boolean }).standalone === true || 
                      document.referrer.includes('android-app://') ||
                      window.location.search.includes('source=pwa')
    setIsStandalone(standalone)
    
    // Check if already installed
    setIsInstalled(standalone)

    // Add iOS launch handler
    if (iOS && standalone) {
      // Prevents iOS from showing Safari UI
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
      
      // Handle iOS viewport height changes
      const handleResize = () => {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
      }
      window.addEventListener('resize', handleResize)
      window.addEventListener('orientationchange', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('orientationchange', handleResize)
      }
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          console.log('✅ Service Worker registrato:', registration.scope)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, reload to update
                  if (confirm('È disponibile una nuova versione. Ricarica per aggiornarla?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        } catch (error) {
          console.error('❌ Errore Service Worker:', error)
        }
      })
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const beforeInstallEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(beforeInstallEvent)
      
      // Show install prompt after a delay (for better UX)
      setTimeout(() => {
        if (!isInstalled && !isStandalone) {
          setShowInstallPrompt(true)
        }
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ App installata!')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isInstalled, isStandalone])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('✅ Utente ha accettato l\'installazione')
      } else {
        console.log('❌ Utente ha rifiutato l\'installazione')
      }
    } catch (error) {
      console.error('Errore durante l\'installazione:', error)
    } finally {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setShowInstallPrompt(false)
    }
  }, [])

  // iOS Install Instructions Modal
  const IOSInstallModal = () => {
    if (!isIOS || isStandalone || !showInstallPrompt) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mb-4 animate-slide-up">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Installa Mosaiko
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Aggiungi Mosaiko alla schermata home per utilizzarla come un'app nativa
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs">1</span>
              </div>
              <span>Tocca il pulsante di condivisione</span>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs">2</span>
              </div>
              <span>Seleziona "Aggiungi alla schermata Home"</span>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={dismissInstallPrompt}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Non ora
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Android/Chrome Install Prompt
  const AndroidInstallPrompt = () => {
    if (isIOS || !showInstallPrompt || !deferredPrompt) return null

    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                Installa Mosaiko
              </p>
              <p className="text-xs text-gray-600">
                Accesso rapido dalla schermata home
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={dismissInstallPrompt}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Non ora
              </button>
              <button
                onClick={handleInstallClick}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                Installa
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <IOSInstallModal />
      <AndroidInstallPrompt />
    </>
  )
}
