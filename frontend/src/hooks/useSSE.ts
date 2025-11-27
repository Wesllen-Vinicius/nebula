import { useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

export interface SSEMessage {
  id: string
  data: {
    type: string
    percentage?: number
    downloadSpeed?: number
    uploadSpeed?: number
    name?: string
    totalSize?: number
    peers?: number
    eta?: number
    [key: string]: unknown
  }
}

async function getBackendUrl(): Promise<string> {
  try {
    const result = await invoke<string>('get_backend_url')
    return result || 'http://127.0.0.1:8080'
  } catch {
    return 'http://127.0.0.1:8080'
  }
}

async function getApiKey(): Promise<string | null> {
  try {
    const result = await invoke<string>('get_api_key')
    return result || null
  } catch {
    return null
  }
}

export function useSSE(onMessage: (message: SSEMessage) => void) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  const isConnectingRef = useRef(false)
  const messageQueueRef = useRef<SSEMessage[]>([])
  const processingRef = useRef(false)

  // Atualizar ref sem causar re-renders - fazer durante render é seguro
  onMessageRef.current = onMessage

  const processQueue = useCallback(() => {
    if (processingRef.current || messageQueueRef.current.length === 0) {
      return
    }

    processingRef.current = true
    
    // Processar mensagens em batch usando requestAnimationFrame para evitar loops
    requestAnimationFrame(() => {
      const messages = messageQueueRef.current.splice(0, 10) // Processar até 10 por vez
      
      for (const message of messages) {
        try {
          onMessageRef.current(message)
        } catch (error) {
          // Ignorar erros no processamento
        }
      }
      
      processingRef.current = false
      
      if (messageQueueRef.current.length > 0) {
        setTimeout(processQueue, 50) // Processar próximo batch após 50ms
      }
    })
  }, [])


  const connect = useCallback(async () => {
    if (isConnectingRef.current || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    isConnectingRef.current = true

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      const baseUrl = await getBackendUrl()
      const apiKey = await getApiKey()
      const url = `${baseUrl}/api/progress${apiKey ? `?api_key=${apiKey}` : ''}`
      
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        isConnectingRef.current = false
      }

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return
          const message: SSEMessage = JSON.parse(event.data)
          // Usar diretamente para evitar dependência circular
          if (!message?.id || !message?.data) {
            return
          }
          messageQueueRef.current.push(message)
          processQueue()
        } catch (error) {
          // Invalid JSON, ignore
        }
      }

      eventSource.onerror = () => {
        isConnectingRef.current = false
        
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close()
          eventSourceRef.current = null
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      }
    } catch (error) {
      isConnectingRef.current = false
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // handleMessage é estável via ref, não precisa de dependência

  useEffect(() => {
    connect()

    return () => {
      isConnectingRef.current = false
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      messageQueueRef.current = []
      processingRef.current = false
    }
  }, [connect])

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    },
    reconnect: connect,
  }
}

