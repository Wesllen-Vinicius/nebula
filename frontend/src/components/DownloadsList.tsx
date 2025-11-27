import { useMemo, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { useToast } from '../hooks/useToast'
import { useDownloads, useDownloadStore, type DownloadRecord } from '../store/useDownloadStore'
import EmptyState from './EmptyState'
import DownloadCard from './DownloadCard'
import DeleteConfirmModal from './DeleteConfirmModal'
import SkeletonLoader from './SkeletonLoader'

interface DownloadsListProps {
  filter?: 'all' | 'completed' | 'active'
}

export default function DownloadsList({ filter = 'all' }: DownloadsListProps) {
  const { post, delete: del, loading } = useNebulaApi()
  const toast = useToast()
  const downloads = useDownloads()
  const updateDownload = useDownloadStore((state) => state.updateDownload)
  const removeDownload = useDownloadStore((state) => state.removeDownload)
  
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    downloadId: string
    downloadName: string
    outputDir: string
  }>({ open: false, downloadId: '', downloadName: '', outputDir: '' })

  const filteredDownloads = useMemo(() => {
    if (!Array.isArray(downloads)) return []
    
    switch (filter) {
      case 'completed':
        return downloads.filter((d) => d.status === 'completed')
      case 'active':
        return downloads.filter(
          (d) => d.status === 'downloading' || d.status === 'paused' || d.status === 'pending'
        )
      default:
        return downloads
    }
  }, [filter, downloads])

  // TODOS os useCallback DEVEM vir ANTES de qualquer return condicional
  const handlePause = useCallback(async (id: string) => {
    try {
      await post(`/api/download/${id}/pause`, {})
      updateDownload(id, { status: 'paused' })
      toast.success('Download pausado')
    } catch (err) {
      toast.error('Erro ao pausar', err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [post, updateDownload, toast])

  const handleResume = useCallback(async (id: string) => {
    try {
      await post(`/api/download/${id}/resume`, {})
      updateDownload(id, { status: 'downloading' })
      toast.success('Download retomado')
    } catch (err) {
      toast.error('Erro ao retomar', err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [post, updateDownload, toast])

  const handleCancel = useCallback((id: string) => {
    const download = downloads.find((d) => d.id === id)
    if (!download) return
    
    setDeleteModal({
      open: true,
      downloadId: id,
      downloadName: download.torrent_name || 'Download',
      outputDir: download.output_dir || '',
    })
  }, [downloads])

  const handleConfirmDelete = useCallback(async (deleteFiles: boolean) => {
    const { downloadId } = deleteModal
    setDeleteModal({ open: false, downloadId: '', downloadName: '', outputDir: '' })
    
    if (!downloadId) {
      return
    }

    try {
      if (deleteFiles) {
        await del(`/api/download/${downloadId}/delete-files`)
        toast.success('Download e arquivos deletados')
      } else {
        await del(`/api/download/${downloadId}`)
        toast.success('Download removido')
      }
      removeDownload(downloadId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error('Erro ao deletar', errorMsg)
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        removeDownload(downloadId)
        toast.info('Download removido localmente', 'O registro não existia no servidor')
      }
    }
  }, [deleteModal, del, removeDownload, toast])

  const handleOpenFolder = useCallback(async (download: DownloadRecord) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('open_folder', { path: download.output_dir })
    } catch {
      navigator.clipboard.writeText(download.output_dir)
      toast.info('Caminho copiado', download.output_dir)
    }
  }, [toast])

  const handleDeleteFiles = useCallback((download: DownloadRecord) => {
    setDeleteModal({
      open: true,
      downloadId: download.id,
      downloadName: download.torrent_name || 'Download',
      outputDir: download.output_dir || '',
    })
  }, [])

  const handleCopyMagnet = useCallback((magnetLink: string) => {
    navigator.clipboard.writeText(magnetLink)
    toast.success('Magnet link copiado')
  }, [toast])

  if (loading && downloads.length === 0) {
    return <SkeletonLoader count={3} />
  }

  if (filteredDownloads.length === 0) {
    const emptyMessages = {
      all: {
        title: 'Nenhum download encontrado',
        description: 'Adicione um magnet link para começar',
      },
      completed: {
        title: 'Nenhum download concluído',
        description: 'Downloads finalizados aparecerão aqui',
      },
      active: {
        title: 'Nenhum download ativo',
        description: 'Inicie um novo download para vê-lo aqui',
      },
    }

    const message = emptyMessages[filter] || emptyMessages.all

    return (
      <EmptyState
        icon={Download}
        title={message.title}
        description={message.description}
      />
    )
  }

  return (
    <>
      <div className="p-4">
        <div className="space-y-2">
          {filteredDownloads.map((download) => (
            <DownloadCard
              key={download.id}
              download={download}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onOpenFolder={handleOpenFolder}
              onCopyMagnet={handleCopyMagnet}
              onDeleteFiles={handleDeleteFiles}
            />
          ))}
        </div>
      </div>
      
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal((prev) => ({ ...prev, open }))}
        downloadName={deleteModal.downloadName}
        outputDir={deleteModal.outputDir}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
