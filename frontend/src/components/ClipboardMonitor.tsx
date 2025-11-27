import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard, X, Download } from 'lucide-react'
import { useClipboard } from '../hooks/useClipboard'

interface ClipboardMonitorProps {
  onAccept: (magnetLink: string) => void
}

export default function ClipboardMonitor({ onAccept }: ClipboardMonitorProps) {
  const { clipboardText, checkClipboard, clearClipboard } = useClipboard()

  const checkClipboardRef = useRef(checkClipboard)
  
  useEffect(() => {
    checkClipboardRef.current = checkClipboard
  }, [checkClipboard])

  useEffect(() => {
    const interval = setInterval(() => {
      checkClipboardRef.current()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleAccept = () => {
    onAccept(clipboardText)
    clearClipboard()
  }

  return (
    <AnimatePresence>
      {clipboardText && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 max-w-md"
        >
          <div className="bg-slate-900 border border-violet-500/30 rounded-xl shadow-2xl shadow-violet-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Clipboard className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Magnet Link Detectado
                </h3>
                <p className="text-xs text-slate-400 truncate mb-3">
                  {clipboardText.substring(0, 60)}...
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                    aria-label="Adicionar magnet link"
                  >
                    <Download className="w-4 h-4" />
                    Adicionar
                  </button>
                  <button
                    onClick={clearClipboard}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-400 transition-colors"
                    aria-label="Fechar notificação"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
