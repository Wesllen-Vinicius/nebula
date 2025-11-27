import { useState, useCallback, useRef, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import DownloadPanel from './components/DownloadPanel'
import DownloadsView from './views/DownloadsView'
import FavoritesView from './views/FavoritesView'
import MetricsView from './views/MetricsView'
import SettingsPanel from './components/SettingsPanel'
import AboutView from './views/AboutView'
import ClipboardMonitor from './components/ClipboardMonitor'
import ConnectionStatus from './components/ConnectionStatus'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider, Toast } from './components/Toast'
import { useToast } from './hooks/useToast'
import { useSSE, type SSEMessage } from './hooks/useSSE'
import { useNebulaApi } from './hooks/useNebulaApi'
import { useActiveView, useAppStore } from './store/useAppStore'
import { useDownloadStore, useDownloadStats, type DownloadRecord } from './store/useDownloadStore'
import { useMetricsStore } from './store/useMetricsStore'

function AppContent() {
  const activeView = useActiveView()
  const setActiveView = useAppStore((state) => state.setActiveView)
  const stats = useDownloadStats()
  
  const updateDownload = useDownloadStore((state) => state.updateDownload)
  const addDownloadedBytes = useMetricsStore((state) => state.addDownloadedBytes)
  const recordSpeed = useMetricsStore((state) => state.recordSpeed)
  const incrementSessions = useMetricsStore((state) => state.incrementSessions)
  
  const [magnetLinkFromClipboard, setMagnetLinkFromClipboard] = useState('')
  const { toasts, hideToast, success } = useToast()
  const { get } = useNebulaApi()
  const setDownloads = useDownloadStore((state) => state.setDownloads)

  // Refs para callbacks estáveis
  const updateDownloadRef = useRef(updateDownload)
  const addDownloadedBytesRef = useRef(addDownloadedBytes)
  const recordSpeedRef = useRef(recordSpeed)
  const lastBytesRef = useRef<Record<string, number>>({})
  const lastUpdateRef = useRef<Record<string, { progress: number; speed: number; timestamp: number }>>({})
  
  // Atualizar refs
  updateDownloadRef.current = updateDownload
  addDownloadedBytesRef.current = addDownloadedBytes
  recordSpeedRef.current = recordSpeed

  // Incrementar sessão apenas uma vez
  useEffect(() => {
    incrementSessions()
  }, [])

  // Carregar downloads do backend ao iniciar
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const downloads = await get<Array<{
          id: string
          magnet_link: string
          status: string
          progress: number
          speed: number
          torrent_name: string
          output_dir: string
          selected_indices?: number[]
          created_at?: string
          updated_at?: string
          download_speed?: number
          upload_speed?: number
          eta?: number
          peers?: number
          total_size?: number
          downloaded_bytes?: number
          error_message?: string
        }>>('/api/download')
        
        if (Array.isArray(downloads)) {
          const validDownloads = downloads
            .filter(d => d.id && d.magnet_link && d.status)
            .map(d => ({
              id: d.id,
              magnet_link: d.magnet_link,
              status: d.status as DownloadRecord['status'],
              progress: d.progress || 0,
              speed: d.speed || 0,
              torrent_name: d.torrent_name || 'Download',
              output_dir: d.output_dir || '',
              selected_indices: d.selected_indices,
              created_at: d.created_at,
              updated_at: d.updated_at,
              download_speed: d.download_speed,
              upload_speed: d.upload_speed,
              eta: d.eta,
              peers: d.peers,
              total_size: d.total_size,
              downloaded_bytes: d.downloaded_bytes,
              error_message: d.error_message,
            }))
          setDownloads(validDownloads)
        }
      } catch {
        // Silently fail - will retry on next mount
      }
    }
    
    loadDownloads()
  }, [get, setDownloads])

  // Handler SSE com throttling
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    if (!message?.id || !message?.data || message.data.type !== 'progress') return

    const speed = message.data.downloadSpeed || 0
    const progress = Math.min(100, Math.max(0, message.data.percentage || 0))
    const totalSize = message.data.totalSize || 0
    
    const currentBytes = Math.floor((progress / 100) * totalSize)
    const lastBytes = lastBytesRef.current[message.id] || 0
    const deltaBytes = currentBytes - lastBytes
    
    if (deltaBytes > 0) {
      addDownloadedBytesRef.current(deltaBytes)
      lastBytesRef.current[message.id] = currentBytes
    }
    
    if (speed > 0) {
      recordSpeedRef.current(speed)
    }
    
    // Throttle: só atualiza se passou 500ms ou mudança significativa
    const lastUpdate = lastUpdateRef.current[message.id]
    const now = Date.now()
    
    if (lastUpdate && (now - lastUpdate.timestamp) < 500) {
      if (Math.abs(progress - lastUpdate.progress) < 1.0 && Math.abs(speed - lastUpdate.speed) < 10000) {
        return
      }
    }
    
    lastUpdateRef.current[message.id] = { progress, speed, timestamp: now }
    
    updateDownloadRef.current(message.id, {
      progress,
      speed,
      download_speed: speed,
      upload_speed: message.data.uploadSpeed || 0,
      peers: message.data.peers || 0,
      status: progress >= 100 ? 'completed' : 'downloading',
      torrent_name: message.data.name || undefined,
      total_size: totalSize || undefined,
      eta: message.data.eta || undefined,
    })
  }, [])
  
  useSSE(handleSSEMessage)

  const handleClipboardAccept = useCallback((magnetLink: string) => {
    setMagnetLinkFromClipboard(magnetLink)
    setActiveView('home')
    success('Magnet link adicionado', 'Link carregado no painel de download')
  }, [setActiveView, success])

  const renderView = useCallback(() => {
    switch (activeView) {
      case 'home':
        return <DownloadPanel initialMagnetLink={magnetLinkFromClipboard} />
      case 'downloads':
        return <DownloadsView />
      case 'favorites':
        return <FavoritesView />
      case 'metrics':
        return <MetricsView />
      case 'settings':
        return <SettingsPanel />
      case 'about':
        return <AboutView />
      default:
        return <DownloadPanel initialMagnetLink={magnetLinkFromClipboard} />
    }
  }, [activeView, magnetLinkFromClipboard])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      <TitleBar />
      <ConnectionStatus />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} stats={stats} />
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>

      {activeView !== 'settings' && <ClipboardMonitor onAccept={handleClipboardAccept} />}

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type}
          open={toast.open}
          onOpenChange={(open) => !open && hideToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}
