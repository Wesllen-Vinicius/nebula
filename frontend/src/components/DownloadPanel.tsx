import { useState, useEffect, useCallback } from 'react'
import { Magnet, Upload } from 'lucide-react'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { useToast } from '../hooks/useToast'
import { useDownloadStore } from '../store/useDownloadStore'
import { useAppStore } from '../store/useAppStore'
import TorrentAnalysisModal from './TorrentAnalysisModal'
import DropZone from './DropZone'

interface DownloadPanelProps {
  initialMagnetLink?: string
}

function validateMagnetLink(magnetLink: string): { valid: boolean; error?: string } {
  const trimmed = magnetLink.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Magnet link vazio' }
  }
  
  if (!trimmed.startsWith('magnet:?')) {
    return { valid: false, error: 'Formato inválido. Deve começar com "magnet:?"' }
  }
  
  // Verificar se tem info hash (btih)
  const btihMatch = trimmed.match(/btih:([a-fA-F0-9]{40})/i)
  if (!btihMatch) {
    return { valid: false, error: 'Magnet link inválido: info hash (btih) não encontrado ou inválido' }
  }
  
  return { valid: true }
}

function extractInfoHash(magnetLink: string): string | null {
  const match = magnetLink.match(/btih:([a-fA-F0-9]{40})/i)
  if (match) {
    return match[1].toLowerCase()
  }
  return null
}

export default function DownloadPanel({ initialMagnetLink }: DownloadPanelProps) {
  const [magnetLink, setMagnetLink] = useState('')
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [torrentInfo, setTorrentInfo] = useState<{ name: string; files: Array<{ index: number }> } | null>(null)
  const [showValidationError, setShowValidationError] = useState(false)
  const { post, loading, error } = useNebulaApi()
  const toast = useToast()
  const addDownload = useDownloadStore((state) => state.addDownload)
  const updateDownload = useDownloadStore((state) => state.updateDownload)
  const setActiveView = useAppStore((state) => state.setActiveView)

  useEffect(() => {
    if (initialMagnetLink) {
      setMagnetLink(initialMagnetLink)
    }
  }, [initialMagnetLink])

  const handleAnalyze = useCallback(() => {
    const validation = validateMagnetLink(magnetLink)
    if (!validation.valid) {
      setShowValidationError(true)
      toast.error('Erro', validation.error || 'Magnet link inválido')
      return
    }
    setShowValidationError(false)
    setShowAnalysisModal(true)
  }, [magnetLink, toast])

  const handleMagnetDrop = (droppedMagnet: string) => {
    setMagnetLink(droppedMagnet)
    toast.success('Magnet link detectado', 'Link carregado')
  }

  const handleTorrentFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.torrent')) {
      toast.error('Arquivo inválido', 'Selecione um arquivo .torrent')
      return
    }

    const formData = new FormData()
    formData.append('torrent', file)

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const backendUrl = await invoke<string>('get_backend_url').catch(() => 'http://127.0.0.1:8080')
      const apiKey = await invoke<string>('get_api_key').catch(() => null)
      
      const headers: HeadersInit = {}
      if (apiKey) {
        headers['X-Api-Key'] = apiKey
      }
      
      const response = await fetch(`${backendUrl}/api/torrent/analyze`, {
        method: 'POST',
        body: formData,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Upload failed')
      }

      const data = await response.json()
      if (!data || !data.magnet_link) {
        throw new Error('Resposta inválida do servidor')
      }
      
      toast.success('Arquivo carregado', 'Analisando torrent')
      setMagnetLink(data.magnet_link)
      setShowAnalysisModal(true)
    } catch (err) {
      toast.error('Erro no upload', err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const handleDownload = useCallback(async (selectedIndices: number[], selectedOutputDir: string) => {
    setShowAnalysisModal(false)
    
    if (!magnetLink.trim() || !selectedOutputDir.trim() || selectedIndices.length === 0) {
      toast.error('Erro', 'Dados inválidos para download')
      return
    }

    if (selectedIndices.length === 0) {
      toast.error('Erro', 'Nenhum arquivo selecionado')
      return
    }

    if (selectedIndices.some(idx => idx < 0)) {
      toast.error('Erro', 'Índices de arquivo inválidos')
      return
    }

    const uniqueIndices = Array.from(new Set(selectedIndices))
    if (uniqueIndices.length !== selectedIndices.length) {
      toast.error('Erro', 'Índices duplicados detectados')
      return
    }

    // Criar ID temporário baseado no info hash
    const tempId = extractInfoHash(magnetLink) || `temp-${Date.now()}`
    const selectedFiles = torrentInfo?.files.filter(f => uniqueIndices.includes(f.index)) || []
    const totalSize = selectedFiles.reduce((sum, f) => sum + (f as any).size || 0, 0)

    // Adicionar download imediatamente na store com status "pending"
    addDownload({
      id: tempId,
      magnet_link: magnetLink,
      status: 'pending',
      progress: 0,
      speed: 0,
      torrent_name: torrentInfo?.name || 'Iniciando download...',
      output_dir: selectedOutputDir,
      total_size: totalSize,
      selected_indices: uniqueIndices,
      created_at: new Date().toISOString(),
    })

    // Redirecionar para página de downloads imediatamente
    setActiveView('downloads')

    try {
      const response = await post<{ id: string }>('/api/magnet/download', {
        magnet_link: magnetLink,
        output_dir: selectedOutputDir,
        selected_indices: uniqueIndices.sort((a, b) => a - b),
        sequential: false,
      })
      
      // Atualizar com o ID real do backend
      if (response?.id) {
        if (response.id !== tempId) {
          // Criar novo download com ID real e remover temporário
          const tempDownload = useDownloadStore.getState().downloads.find(d => d.id === tempId)
          if (tempDownload) {
            useDownloadStore.getState().addDownload({
              ...tempDownload,
              id: response.id,
              status: 'downloading',
            })
            useDownloadStore.getState().removeDownload(tempId)
          }
        } else {
          // Mesmo ID, apenas atualizar status
          updateDownload(tempId, { status: 'downloading' })
        }
      }
      
      toast.success('Download iniciado', `${uniqueIndices.length} arquivo(s) selecionado(s)`)
      setMagnetLink('')
    } catch (err) {
      // Ignorar erros de abort (cancelamento intencional)
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      // Atualizar status para erro
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      updateDownload(tempId, {
        status: 'error',
        error_message: errorMsg,
      })
      toast.error('Erro ao iniciar download', errorMsg)
    }
  }, [magnetLink, torrentInfo, addDownload, updateDownload, post, toast, setActiveView])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Novo Download</h1>
        <p className="text-sm text-slate-400">Cole o link magnético e escolha o destino</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <DropZone onMagnetDrop={handleMagnetDrop} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-950 text-slate-500">ou</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block">
              <div className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-2 border-dashed border-slate-800/50 rounded-lg hover:border-violet-500/50 cursor-pointer transition-all group">
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" />
                <span className="text-slate-400 group-hover:text-violet-400 transition-colors font-medium">
                  Carregar arquivo .torrent
                </span>
              </div>
              <input
                type="file"
                accept=".torrent"
                onChange={handleTorrentFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-950 text-slate-500">ou cole o link</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Link Magnético
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={magnetLink}
                  onChange={(e) => {
                    setMagnetLink(e.target.value)
                    if (showValidationError) {
                      setShowValidationError(false)
                    }
                  }}
                  onBlur={() => {
                    if (magnetLink.trim()) {
                      const validation = validateMagnetLink(magnetLink)
                      setShowValidationError(!validation.valid)
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && magnetLink.trim() && handleAnalyze()}
                  placeholder="magnet:?xt=urn:btih:..."
                  className={`flex-1 px-4 py-3 bg-gradient-to-br from-slate-900/90 to-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200 shadow-inner ${
                    showValidationError && magnetLink.trim()
                      ? 'border-yellow-500/50 focus:ring-yellow-500/50 focus:border-yellow-500/50' 
                      : 'border-slate-800/50'
                  }`}
                  aria-label="Magnet link"
                  aria-invalid={showValidationError ? 'true' : 'false'}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !magnetLink.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 disabled:shadow-none"
                  aria-label="Analisar magnet link"
                >
                  <Magnet className="w-5 h-5" />
                  {loading ? 'Analisando...' : 'Analisar'}
                </button>
              </div>
              {showValidationError && magnetLink.trim() && (() => {
                const validation = validateMagnetLink(magnetLink)
                if (!validation.valid && validation.error) {
                  return (
                    <p className="mt-2 text-sm text-yellow-400">
                      {validation.error}
                    </p>
                  )
                }
                return null
              })()}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error.message}
              </div>
            )}
          </div>

          <TorrentAnalysisModal
            open={showAnalysisModal}
            onOpenChange={setShowAnalysisModal}
            magnetLink={magnetLink}
            onConfirm={handleDownload}
            onTorrentInfoLoaded={setTorrentInfo}
          />
        </div>
      </div>
    </div>
  )
}
