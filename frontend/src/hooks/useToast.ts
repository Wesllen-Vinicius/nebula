import { useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info'
  open: boolean
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2, 11)
    const newToast: ToastMessage = {
      id,
      title,
      description,
      type,
      open: true,
    }
    setToasts((prev) => [...prev, newToast])

    // Auto-remove após 5 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }, [])

  return {
    toasts,
    showToast,
    hideToast,
    success: (title: string, description?: string) => showToast(title, description, 'success'),
    error: (title: string, description?: string) => showToast(title, description, 'error'),
    info: (title: string, description?: string) => showToast(title, description, 'info'),
  }
}

