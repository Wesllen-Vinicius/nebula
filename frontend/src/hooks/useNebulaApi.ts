import { useState, useCallback, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../store/useAppStore'

const API_BASE = 'http://127.0.0.1:8080/api'

let cachedApiKey: string | null = null

async function getBackendUrl(): Promise<string> {
  try {
    const result = await invoke<string>('get_backend_url')
    return result || API_BASE.replace('/api', '')
  } catch {
    return API_BASE.replace('/api', '')
  }
}

async function getApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey
  
  try {
    const result = await invoke<string>('get_api_key')
    cachedApiKey = result || null
    return cachedApiKey
  } catch {
    return null
  }
}

export interface ApiError {
  message: string
  status?: number
}

export function useNebulaApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const setBackendConnected = useAppStore((state) => state.setBackendConnected)

  // Cancelar requisições pendentes ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const request = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    // Não cancelar requisições de download ou outras operações importantes
    const isImportantRequest = endpoint.includes('/download') || 
                                endpoint.includes('/magnet/download') ||
                                endpoint.includes('/progress')
    
    // Só cancelar requisições anteriores se não for uma requisição importante
    if (abortControllerRef.current && !isImportantRequest) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    
    // Só armazenar o controller se não for uma requisição importante
    // (requisições importantes não devem ser canceladas por novas requisições)
    if (!isImportantRequest) {
      abortControllerRef.current = controller
    }

    setLoading(true)
    setError(null)

    try {
      const baseUrl = await getBackendUrl()
      const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      
      // Buscar API Key se disponível
      const apiKey = await getApiKey()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      }
      
      // Adicionar API Key se disponível (produção)
      if (apiKey) {
        headers['X-Api-Key'] = apiKey
      }
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setBackendConnected(true)
      return data as T
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
        // Não definir erro nem desconectar backend para abortos
        const abortError = new Error('Requisição cancelada')
        abortError.name = 'AbortError'
        throw abortError
      }
      
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      }
      setError(apiError)
      setBackendConnected(false)
      throw apiError
    } finally {
      setLoading(false)
      // Só limpar se for o controller atual
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [setBackendConnected])

  const get = useCallback(<T>(endpoint: string) => {
    return request<T>(endpoint, { method: 'GET' })
  }, [request])

  const post = useCallback(<T>(endpoint: string, body?: unknown) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }, [request])

  const put = useCallback(<T>(endpoint: string, body?: unknown) => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }, [request])

  const del = useCallback(<T>(endpoint: string) => {
    return request<T>(endpoint, { method: 'DELETE' })
  }, [request])

  return {
    get,
    post,
    put,
    delete: del,
    loading,
    error,
  }
}

