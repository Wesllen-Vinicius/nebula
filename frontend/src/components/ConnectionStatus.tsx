import { memo } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBackendHealth, type ConnectionStatus as Status } from '../hooks/useBackendHealth'

function ConnectionStatus() {
  const { status, error, checkHealth } = useBackendHealth()

  const getStatusConfig = (s: Status) => {
    switch (s) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          label: 'Conectado',
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Desconectado',
        }
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          label: 'Conectando...',
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  // Só mostrar quando desconectado ou conectando
  if (status === 'connected') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border ${config.bgColor} ${config.borderColor} flex items-center gap-2 shadow-lg`}
      >
        <Icon
          className={`w-4 h-4 ${config.color} ${status === 'connecting' ? 'animate-spin' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {status === 'disconnected' && (
          <button
            onClick={checkHealth}
            className="ml-2 px-2 py-0.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300"
          >
            Reconectar
          </button>
        )}
      </motion.div>
      {status === 'disconnected' && error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 text-xs text-red-400"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(ConnectionStatus)

