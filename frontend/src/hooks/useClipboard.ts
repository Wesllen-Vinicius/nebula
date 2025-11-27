import { useEffect, useState, useCallback, useRef } from 'react'

export function useClipboard() {
  const [clipboardText, setClipboardText] = useState('')
  const [hasPermission, setHasPermission] = useState(false)
  const lastClipboardRef = useRef('')

  const checkClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return
      }

      const text = await navigator.clipboard.readText()
      
      // Verificar se é um magnet link E se é diferente do último
      if (text && text.trim().startsWith('magnet:?') && text.trim() !== lastClipboardRef.current) {
        lastClipboardRef.current = text.trim()
        setClipboardText(text.trim())
      }
    } catch (error) {
      // Permissão negada ou erro ao ler clipboard
      setHasPermission(false)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        setHasPermission(false)
        return false
      }

      const result = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
      setHasPermission(result.state === 'granted' || result.state === 'prompt')
      
      if (result.state === 'granted') {
        checkClipboard()
      }

      return result.state === 'granted'
    } catch (error) {
      setHasPermission(false)
      return false
    }
  }, [checkClipboard])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  const clearClipboard = useCallback(() => {
    setClipboardText('')
    // NÃO limpar lastClipboardRef para evitar re-detecção
  }, [])

  return {
    clipboardText,
    hasPermission,
    checkClipboard,
    requestPermission,
    clearClipboard,
  }
}

