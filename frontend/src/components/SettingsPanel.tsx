import { useEffect, useCallback } from 'react'
import { Settings, Download, Upload, Folder, Zap, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { useToast } from '../hooks/useToast'
import { useConfig, useConfigStore } from '../store/useConfigStore'
import FileDialogButton from './FileDialog'
import * as Slider from '@radix-ui/react-slider'
import { formatSpeed as formatSpeedUtil } from '../utils/format'

const formatSpeedLimit = (bytesPerSec: number): string => {
  if (bytesPerSec === 0) return 'Ilimitado'
  return formatSpeedUtil(bytesPerSec)
}

export default function SettingsPanel() {
  const { get, put, post } = useNebulaApi()
  const toast = useToast()
  const config = useConfig()
  const updateConfig = useConfigStore((state) => state.updateConfig)

  const loadConfig = useCallback(async () => {
    try {
      const data = await get<{
        max_download_speed?: number
        max_upload_speed?: number
        default_download_dir?: string
      }>('/api/config')
      if (data) {
        updateConfig({
          maxDownloadSpeed: data.max_download_speed || 0,
          maxUploadSpeed: data.max_upload_speed || 0,
          defaultDownloadDir: data.default_download_dir || config.defaultDownloadDir,
        })
      }
    } catch {
    }
  }, [get, updateConfig, config.defaultDownloadDir])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleDownloadSpeedChange = useCallback((value: number[]) => {
    const speed = value[0]
    updateConfig({ maxDownloadSpeed: speed })
  }, [updateConfig])

  const handleDownloadSpeedCommit = useCallback(async (value: number[]) => {
    const speed = value[0]
    try {
      await put('/api/config/download-speed', { max_download_speed: speed })
      toast.success('Velocidade de download atualizada')
    } catch {
      toast.error('Erro', 'Falha ao atualizar velocidade de download')
    }
  }, [put, toast])

  const handleUploadSpeedChange = useCallback((value: number[]) => {
    const speed = value[0]
    updateConfig({ maxUploadSpeed: speed })
  }, [updateConfig])

  const handleUploadSpeedCommit = useCallback(async (value: number[]) => {
    const speed = value[0]
    try {
      await put('/api/config/upload-speed', { max_upload_speed: speed })
      toast.success('Velocidade de upload atualizada')
    } catch {
      toast.error('Erro', 'Falha ao atualizar velocidade de upload')
    }
  }, [put, toast])

  const handleDirectorySelect = useCallback(async (dir: string) => {
    updateConfig({ defaultDownloadDir: dir })
    
    try {
      await put('/api/config/default-dir', { default_download_dir: dir })
      toast.success('Pasta atualizada', dir)
    } catch {
      toast.error('Erro', 'Falha ao salvar diretório padrão')
    }
  }, [updateConfig, put, toast])

  const handleResetConfig = useCallback(async () => {
    if (!confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
      return
    }

    try {
      await post('/api/config/reset', {})
      await loadConfig()
      toast.success('Configurações resetadas', 'Valores padrão restaurados')
    } catch {
      toast.error('Erro', 'Falha ao resetar configurações')
    }
  }, [post, loadConfig, toast])

  const maxSpeedValue = 100 * 1024 * 1024

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header Padronizado */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500/25 to-purple-600/20 rounded-xl shadow-lg shadow-violet-500/20">
              <Settings className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Configurações</h1>
              <p className="text-sm text-slate-400 font-medium">Ajuste o comportamento do Nebula</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetConfig}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800/50 text-slate-300 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar
          </button>
        </div>
      </div>

      {/* Conteúdo Scrollavel */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* SECTION 1: LIMITES */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-yellow-400" />
            Controle de Banda
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-6 bg-slate-900/50 border border-slate-800/60 rounded-xl shadow-sm backdrop-blur-sm"
          >
            {/* Download Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Download className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-200 block">Download Máximo</label>
                    <span className="text-xs text-slate-500">Limite a velocidade de entrada</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  {formatSpeedLimit(config.maxDownloadSpeed || 0)}
                </span>
              </div>
              
              <div className="pt-2 px-1">
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5 group"
                  value={[config.maxDownloadSpeed || 0]}
                  onValueChange={handleDownloadSpeedChange}
                  onValueCommit={handleDownloadSpeedCommit}
                  max={maxSpeedValue}
                  step={1024 * 100}
                >
                  <Slider.Track className="bg-slate-800 relative grow rounded-full h-1.5 overflow-hidden">
                    <Slider.Range className="absolute bg-gradient-to-r from-green-500 to-emerald-400 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white shadow-lg shadow-black/50 rounded-full hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-transform cursor-grab active:cursor-grabbing"
                    aria-label="Download Speed"
                  />
                </Slider.Root>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800/50 my-6" />

            {/* Upload Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Upload className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-200 block">Upload Máximo</label>
                    <span className="text-xs text-slate-500">Limite a velocidade de saída</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  {formatSpeedLimit(config.maxUploadSpeed || 0)}
                </span>
              </div>
              
              <div className="pt-2 px-1">
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5 group"
                  value={[config.maxUploadSpeed || 0]}
                  onValueChange={handleUploadSpeedChange}
                  onValueCommit={handleUploadSpeedCommit}
                  max={maxSpeedValue}
                  step={1024 * 100}
                >
                  <Slider.Track className="bg-slate-800 relative grow rounded-full h-1.5 overflow-hidden">
                    <Slider.Range className="absolute bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white shadow-lg shadow-black/50 rounded-full hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-transform cursor-grab active:cursor-grabbing"
                    aria-label="Upload Speed"
                  />
                </Slider.Root>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* SECTION 2: DIRETÓRIOS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Folder className="w-4 h-4 text-violet-400" />
            Armazenamento
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="p-6 bg-slate-900/50 border border-slate-800/60 rounded-xl shadow-sm hover:border-violet-500/20 transition-colors"
          >
            <label className="block text-sm font-medium text-slate-200 mb-3">Pasta Padrão de Downloads</label>
            <div className="flex gap-3">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={config.defaultDownloadDir || ''}
                  readOnly
                  placeholder="Nenhuma pasta selecionada"
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-700/50 rounded-lg text-slate-300 placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all font-mono"
                />
              </div>
              <FileDialogButton
                onSelect={handleDirectorySelect}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 active:scale-95 flex items-center justify-center min-w-[50px]"
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
              Novos downloads serão salvos automaticamente neste local
            </p>
          </motion.div>
        </motion.section>
      </div>
    </div>
  )
}