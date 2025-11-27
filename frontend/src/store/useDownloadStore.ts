import { create } from 'zustand'
import { shallow } from 'zustand/shallow'

export interface DownloadRecord {
  id: string
  magnet_link: string
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error'
  progress: number
  speed: number
  torrent_name: string
  output_dir: string
  error_message?: string
  created_at?: string
  updated_at?: string
  download_speed?: number
  upload_speed?: number
  eta?: number
  peers?: number
  total_size?: number
  downloaded_bytes?: number
  selected_indices?: number[]
}

interface DownloadStore {
  downloads: DownloadRecord[]
  
  setDownloads: (downloads: DownloadRecord[]) => void
  addDownload: (download: DownloadRecord) => void
  updateDownload: (id: string, data: Partial<DownloadRecord>) => void
  removeDownload: (id: string) => void
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  downloads: [],
  
  setDownloads: (downloads) => {
    set({ downloads })
  },
  
  addDownload: (download) => {
    if (!download.id) return
    set((state) => {
      if (state.downloads.find(d => d.id === download.id)) {
        return state
      }
      return { downloads: [...state.downloads, download] }
    })
  },
  
  updateDownload: (id, data) => {
    if (!id) return
    set((state) => {
      const index = state.downloads.findIndex(d => d.id === id)
      if (index === -1) {
        // Criar novo download
        const newDownload: DownloadRecord = {
          id,
          magnet_link: '',
          status: 'downloading',
          progress: 0,
          speed: 0,
          torrent_name: data.torrent_name || 'Download em andamento',
          output_dir: '',
          ...data,
        }
        return { downloads: [...state.downloads, newDownload] }
      }
      
      const existing = state.downloads[index]
      const updated = { ...existing, ...data }
      
      // Verificar se algo mudou
      if (shallow(existing, updated)) {
        return state
      }
      
      const newDownloads = [...state.downloads]
      newDownloads[index] = updated
      return { downloads: newDownloads }
    })
  },
  
  removeDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.filter(d => d.id !== id)
    }))
  },
}))

// Selectors simples
export const useDownloads = () => {
  return useDownloadStore((state) => state.downloads)
}

export const useDownload = (id: string) => {
  return useDownloadStore((state) => state.downloads.find(d => d.id === id))
}

// Stats - usar seletores primitivos separados para evitar criação de objeto
export const useActiveCount = () => {
  return useDownloadStore(
    (state) => state.downloads.filter(d => d.status === 'downloading' || d.status === 'paused').length
  )
}

export const useCompletedCount = () => {
  return useDownloadStore(
    (state) => state.downloads.filter(d => d.status === 'completed').length
  )
}

export const useTotalCount = () => {
  return useDownloadStore((state) => state.downloads.length)
}

// Hook combinado que usa os seletores primitivos
export function useDownloadStats() {
  const active = useActiveCount()
  const completed = useCompletedCount()
  const total = useTotalCount()
  return { active, completed, total }
}
