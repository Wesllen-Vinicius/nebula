import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'

interface UseBackendHealthOptions {
  checkInterval?: number
}

export function useBackendHealth(options: UseBackendHealthOptions = {}) {
  const { checkInterval = 10000 } = options

  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const checkHealth = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const baseUrl = await invoke<string>('get_backend_url').catch(() => 'http://127.0.0.1:8080')

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: abortControllerRef.current.signal,
      })

      if (response.ok) {
        setStatus('connected')
        setError(null)
      } else {
        setStatus('disconnected')
        setError(`HTTP ${response.status}`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Ignorar erros de abort
      }

      setStatus('disconnected')
      setError(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setLastCheck(new Date())
    }
  }, [])

  // Check inicial e periódico
  useEffect(() => {
    checkHealth()

    intervalRef.current = window.setInterval(checkHealth, checkInterval)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [checkHealth, checkInterval])

  // Detectar mudanças de conectividade do navegador
  useEffect(() => {
    const handleOnline = () => {
      checkHealth()
    }

    const handleOffline = () => {
      setStatus('disconnected')
      setError('Sem conexão de rede')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkHealth])

  return {
    status,
    isConnected: status === 'connected',
    isDisconnected: status === 'disconnected',
    isConnecting: status === 'connecting',
    lastCheck,
    error,
    checkHealth,
  }
}

