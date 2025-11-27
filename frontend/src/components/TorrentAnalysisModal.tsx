import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { useToast } from '../hooks/useToast'
import { useConfigStore } from '../store/useConfigStore'
import { TorrentInfoHeader, OutputDirSelector, FileList } from './torrent-modal'

interface TorrentFile {
  index: number
  path: string
  size: number
}

interface TorrentInfo {
  name: string
  total_size: number
  files: TorrentFile[]
}

interface TorrentAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  magnetLink: string
  onConfirm: (selectedIndices: number[], outputDir: string) => void
  onTorrentInfoLoaded?: (info: TorrentInfo) => void
}

export default function TorrentAnalysisModal({
  open,
  onOpenChange,
  magnetLink,
  onConfirm,
  onTorrentInfoLoaded,
}: TorrentAnalysisModalProps) {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())
  const [outputDir, setOutputDir] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { post } = useNebulaApi()
  const toast = useToast()
  
  const isAnalyzingRef = useRef(false)
  const lastMagnetRef = useRef('')

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      // Delay para evitar flash durante animação de saída
      const timer = setTimeout(() => {
        setTorrentInfo(null)
        setSelectedFiles(new Set())
        setSearchTerm('')
        isAnalyzingRef.current = false
        lastMagnetRef.current = ''
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Carregar diretório padrão
  useEffect(() => {
    if (open && !outputDir) {
      const defaultDir = useConfigStore.getState().config.defaultDownloadDir
      if (defaultDir) {
        setOutputDir(defaultDir)
      }
    }
  }, [open, outputDir])

  // Analisar torrent
  useEffect(() => {
    if (!open || !magnetLink.trim()) return
    if (isAnalyzingRef.current) return
    if (lastMagnetRef.current === magnetLink) return
    
    // Validar magnet link antes de analisar
    const trimmed = magnetLink.trim()
    if (!trimmed.startsWith('magnet:?')) {
      toast.error('Erro', 'Formato de magnet link inválido')
      onOpenChange(false)
      return
    }
    
    const btihMatch = trimmed.match(/btih:([a-fA-F0-9]{40})/i)
    if (!btihMatch) {
      toast.error('Erro', 'Magnet link inválido: info hash (btih) não encontrado')
      onOpenChange(false)
      return
    }
    
    const analyze = async () => {
      isAnalyzingRef.current = true
      lastMagnetRef.current = magnetLink
      setLoading(true)
      
      try {
        const result = await post<TorrentInfo>('/api/magnet/analyze', {
          magnet_link: magnetLink.trim(),
        })
        
        if (!result?.files) {
          throw new Error('Resposta inválida do servidor')
        }
        
        setTorrentInfo(result)
        setSelectedFiles(new Set(result.files.map((f) => f.index)))
        onTorrentInfoLoaded?.(result)
      } catch (error) {
        // Ignorar erros de abort (cancelamento intencional)
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          return
        }
        
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        toast.error('Erro ao analisar', message)
        onOpenChange(false)
      } finally {
        setLoading(false)
        isAnalyzingRef.current = false
      }
    }
    
    analyze()
  }, [open, magnetLink, post, toast, onOpenChange, onTorrentInfoLoaded])

  const toggleFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (!torrentInfo) return
    
    const filtered = torrentInfo.files.filter((f) =>
      f.path.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    setSelectedFiles((prev) => {
      if (prev.size === filtered.length && filtered.length > 0) {
        return new Set()
      }
      return new Set(filtered.map((f) => f.index))
    })
  }, [torrentInfo, searchTerm])

  const handleConfirm = useCallback(() => {
    if (!outputDir.trim()) {
      toast.error('Erro', 'Selecione um diretório')
      return
    }
    if (selectedFiles.size === 0) {
      toast.error('Erro', 'Selecione ao menos um arquivo')
      return
    }
    onConfirm(Array.from(selectedFiles), outputDir)
  }, [outputDir, selectedFiles, onConfirm, toast])

  const selectedSize = useMemo(() => {
    if (!torrentInfo) return 0
    return torrentInfo.files
      .filter((f) => selectedFiles.has(f.index))
      .reduce((sum, f) => sum + f.size, 0)
  }, [torrentInfo, selectedFiles])

  const filteredFiles = useMemo(() => {
    if (!torrentInfo) return []
    if (!searchTerm.trim()) return torrentInfo.files
    const term = searchTerm.toLowerCase()
    return torrentInfo.files.filter((f) => f.path.toLowerCase().includes(term))
  }, [torrentInfo, searchTerm])

  if (!open) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] bg-slate-900 rounded-xl border border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Análise do Torrent
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-400 mt-0.5">
                  Selecione os arquivos para baixar
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-slate-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400">Analisando...</div>
                </div>
              ) : torrentInfo ? (
                <div className="space-y-4">
                  <TorrentInfoHeader
                    name={torrentInfo.name}
                    totalSize={torrentInfo.total_size}
                    fileCount={torrentInfo.files.length}
                    selectedSize={selectedSize}
                  />

                  <OutputDirSelector 
                    outputDir={outputDir} 
                    onSelect={setOutputDir} 
                  />

                  <FileList
                    files={filteredFiles}
                    selectedFiles={selectedFiles}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onToggleFile={toggleFile}
                    onToggleAll={toggleAll}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between p-5 border-t border-slate-800">
              <span className="text-sm text-slate-500">
                {selectedFiles.size > 0 && `${selectedFiles.size} selecionado(s)`}
              </span>
              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleConfirm}
                  disabled={selectedFiles.size === 0 || loading || !outputDir.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-all duration-200 flex items-center gap-2 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 disabled:shadow-none"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
