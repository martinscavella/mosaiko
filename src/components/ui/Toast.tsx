import React, { useState, useEffect } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    setIsVisible(true)
    
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30 text-green-300'
      case 'error':
        return 'bg-red-500/20 border-red-500/30 text-red-300'
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
      case 'info':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-300'
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300'
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  return (
    <div
      className={`
        ${getToastStyles()}
        backdrop-blur-md rounded-xl border p-4 mb-3 transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-xl">{getIcon()}</span>
          <div>
            <h4 className="font-semibold text-white">{toast.title}</h4>
            <p className="text-sm opacity-90">{toast.message}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-white/60 hover:text-white/80 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm">
      {toasts.map(toast => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (title: string, message: string) => {
    addToast({ type: 'success', title, message })
  }

  const error = (title: string, message: string) => {
    addToast({ type: 'error', title, message })
  }

  const warning = (title: string, message: string) => {
    addToast({ type: 'warning', title, message })
  }

  const info = (title: string, message: string) => {
    addToast({ type: 'info', title, message })
  }

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
