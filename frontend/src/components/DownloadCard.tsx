import { memo, useCallback } from 'react'
import { Play, Pause, X, FolderOpen, Star, AlertCircle, CheckCircle, Folder } from 'lucide-react'
import { motion } from 'framer-motion'
import DownloadContextMenu from './DownloadContextMenu'
import type { DownloadRecord } from '../store/useDownloadStore'
import { useFavoritesStore, useIsFavorite } from '../store/useFavoritesStore'
import { useToast } from '../hooks/useToast'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { formatSpeed, formatBytes } from '../utils/format'
import { formatETA } from '../utils/eta'

interface DownloadCardProps {
  download: DownloadRecord
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  onOpenFolder: (download: DownloadRecord) => void
  onCopyMagnet: (magnet: string) => void
  onDeleteFiles: (download: DownloadRecord) => void
}

function DownloadCard({
  download,
  onPause,
  onResume,
  onCancel,
  onOpenFolder,
  onCopyMagnet,
  onDeleteFiles,
}: DownloadCardProps) {
  const { addFavorite, removeFavorite } = useFavoritesStore()
  const { post, delete: del } = useNebulaApi()
  const toast = useToast()
  const isFav = useIsFavorite(download.magnet_link)

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!download.magnet_link) {
      toast.error('Erro', 'Magnet link não disponível')
      return
    }

    if (isFav) {
      try {
        const favorites = useFavoritesStore.getState().favorites
        const fav = favorites.find(f => f.magnet_link === download.magnet_link)
        if (fav) {
          await del(`/api/favorites/${fav.id}`)
          removeFavorite(fav.id)
          toast.success('Removido dos favoritos')
        }
      } catch (err) {
        toast.error('Erro ao remover', err instanceof Error ? err.message : 'Erro desconhecido')
      }
    } else {
      try {
        const newFav = {
          id: crypto.randomUUID(),
          name: download.torrent_name || 'Download',
          magnet_link: download.magnet_link,
          created_at: new Date().toISOString(),
        }
        await post('/api/favorites', newFav)
        addFavorite(newFav)
        toast.success('Adicionado aos favoritos')
      } catch (err) {
        toast.error('Erro ao favoritar', err instanceof Error ? err.message : 'Erro desconhecido')
      }
    }
  }, [isFav, download.magnet_link, download.torrent_name, addFavorite, removeFavorite, post, del, toast])

  const handlePauseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPause(download.id)
  }, [download.id, onPause])

  const handleResumeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onResume(download.id)
  }, [download.id, onResume])

  const handleCancelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCancel(download.id)
  }, [download.id, onCancel])

  const handleOpenFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenFolder(download)
  }, [download, onOpenFolder])

  const getStatusColor = () => {
    switch (download.status) {
      case 'completed':
        return 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/5'
      case 'downloading':
        return 'border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-violet-500/8 to-transparent shadow-lg shadow-violet-500/10 pulse-glow'
      case 'pending':
        return 'border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent shadow-lg shadow-blue-500/5'
      case 'paused':
        return 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-lg shadow-amber-500/5'
      case 'error':
        return 'border-red-500/40 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent shadow-lg shadow-red-500/5'
      default:
        return 'border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-900/40 shadow-md'
    }
  }

  const getStatusBadge = () => {
    const base = 'px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1.5'
    switch (download.status) {
      case 'completed':
        return (
          <span className={`${base} bg-gradient-to-r from-emerald-500/25 to-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20`}>
            <CheckCircle className="w-3 h-3" />
            Concluído
          </span>
        )
      case 'downloading':
        return (
          <span className={`${base} bg-gradient-to-r from-violet-500/25 to-purple-600/20 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/20`}>
            <span className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-pulse shadow-sm shadow-violet-400" />
            Baixando
          </span>
        )
      case 'pending':
        return (
          <span className={`${base} bg-gradient-to-r from-blue-500/25 to-cyan-600/20 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-500/20`}>
            <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse shadow-sm shadow-blue-400" />
            Conectando...
          </span>
        )
      case 'paused':
        return (
          <span className={`${base} bg-gradient-to-r from-amber-500/25 to-orange-600/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/20`}>
            <Pause className="w-3 h-3" />
            Pausado
          </span>
        )
      case 'error':
        return (
          <span className={`${base} bg-red-500/20 text-red-400`}>
            <AlertCircle className="w-3 h-3" />
            Erro
          </span>
        )
      default:
        return (
          <span className={`${base} bg-slate-700/50 text-slate-400`}>
            Pendente
          </span>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-4 border rounded-lg transition-all ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-200 truncate text-lg">
            {download.torrent_name || 'Download'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 truncate flex items-center gap-1.5">
            <Folder className="w-3 h-3" />
            {download.output_dir}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {getStatusBadge()}
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFav ? 'bg-amber-500/20' : 'hover:bg-amber-500/10'
              }`}
              title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star className={`w-4 h-4 ${
                isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-400 hover:text-amber-400'
              }`} />
            </button>

            {download.status === 'downloading' && (
              <button
                type="button"
                onClick={handlePauseClick}
                className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
                title="Pausar download"
                aria-label="Pausar download"
              >
                <Pause className="w-4 h-4 text-slate-400 hover:text-amber-400" />
              </button>
            )}

            {download.status === 'paused' && (
              <button
                type="button"
                onClick={handleResumeClick}
                className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                title="Retomar download"
                aria-label="Retomar download"
              >
                <Play className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
              </button>
            )}

            {download.status === 'completed' && (
              <button
                type="button"
                onClick={handleOpenFolderClick}
                className="p-2 hover:bg-violet-500/20 rounded-lg transition-colors"
                title="Abrir pasta"
                aria-label="Abrir pasta"
              >
                <FolderOpen className="w-4 h-4 text-slate-400 hover:text-violet-400" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCancelClick}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Cancelar download"
              aria-label="Cancelar download"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>

            <DownloadContextMenu
              status={download.status}
              onPause={() => onPause(download.id)}
              onResume={() => onResume(download.id)}
              onCancel={() => onCancel(download.id)}
              onOpenFolder={() => onOpenFolder(download)}
              onCopyMagnet={() => onCopyMagnet(download.magnet_link)}
              onShowInfo={() => {}}
              onDeleteFiles={() => onDeleteFiles(download)}
            />
          </div>
        </div>
      </div>

      {(download.status === 'downloading' || download.status === 'paused' || download.status === 'pending') && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold text-violet-400 text-lg">
              {download.progress.toFixed(1)}%
            </span>
            {download.status === 'downloading' && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-400 font-mono">
                  {formatSpeed(download.download_speed || download.speed)}
                </span>
                {download.upload_speed && download.upload_speed > 0 && (
                  <span className="text-blue-400 font-mono">
                    {formatSpeed(download.upload_speed)}
                  </span>
                )}
              </div>
            )}
          </div>
          
                   <div className="relative w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden shadow-inner">
                     <motion.div
                       className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 h-full shadow-lg shadow-violet-500/50"
                       initial={false}
                       animate={{ width: `${download.progress}%` }}
                       transition={{ duration: 0.3, ease: 'easeOut' }}
                     >
                       {download.status === 'downloading' && (
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent gradient-shimmer" />
                       )}
                     </motion.div>
                   </div>

                   {download.status === 'downloading' && (
                     <div className="flex justify-between text-xs text-slate-400 pt-1">
                       <span className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                         {download.peers || 0} peers
                         {download.selected_indices && download.selected_indices.length > 0 && (
                           <span className="text-slate-500">
                             • {download.selected_indices.length} arquivo(s)
                           </span>
                         )}
                       </span>
                       <div className="flex flex-col items-end gap-1">
                         <span>
                           {download.total_size 
                             ? `${formatBytes((download.progress / 100) * download.total_size)} / ${formatBytes(download.total_size)}`
                             : 'Calculando...'}
                         </span>
                         {download.eta !== undefined && download.eta > 0 && download.progress < 100 && (
                           <span className="text-slate-500">
                             {formatETA(download.eta)}
                           </span>
                         )}
                       </div>
                     </div>
                   )}
        </div>
      )}

      {download.status === 'completed' && (
        <div className="flex items-center justify-between text-sm text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Download concluído
          </span>
          <button
            type="button"
            onClick={handleOpenFolderClick}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-xs font-medium transition-colors"
          >
            Abrir Pasta
          </button>
        </div>
      )}

      {download.error_message && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Erro</p>
            <p className="text-red-300">{download.error_message}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default memo(DownloadCard, (prevProps, nextProps) => {
  return (
    prevProps.download.id === nextProps.download.id &&
    prevProps.download.status === nextProps.download.status &&
    prevProps.download.progress === nextProps.download.progress &&
    prevProps.download.speed === nextProps.download.speed &&
    prevProps.download.download_speed === nextProps.download.download_speed &&
    prevProps.download.upload_speed === nextProps.download.upload_speed &&
    prevProps.download.peers === nextProps.download.peers &&
    prevProps.download.torrent_name === nextProps.download.torrent_name &&
    prevProps.download.error_message === nextProps.download.error_message
  )
})
