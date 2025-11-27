import { useCallback } from 'react'
import { BarChart3, Download, Upload, Activity, TrendingUp, Clock, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMetricsStore } from '../store/useMetricsStore'
import { useDownloadStats } from '../store/useDownloadStore'
import { useToast } from '../hooks/useToast'
import { formatBytes, formatSpeed } from '../utils/format'

export default function MetricsView() {
  const totalDownloaded = useMetricsStore((state) => state.totalDownloaded)
  const totalUploaded = useMetricsStore((state) => state.totalUploaded)
  const totalDownloads = useMetricsStore((state) => state.totalDownloads)
  const totalSessions = useMetricsStore((state) => state.totalSessions)
  const averageSpeed = useMetricsStore((state) => state.averageSpeed)
  const peakSpeed = useMetricsStore((state) => state.peakSpeed)
  const resetMetrics = useMetricsStore((state) => state.reset)
  const downloadStats = useDownloadStats()
  const toast = useToast()

  const handleResetMetrics = useCallback(() => {
    if (!confirm('Tem certeza que deseja resetar todas as métricas? Esta ação não pode ser desfeita.')) {
      return
    }

    resetMetrics()
    toast.success('Métricas resetadas', 'Todas as estatísticas foram zeradas')
  }, [resetMetrics, toast])

  return (
    // Removi o 'overflow-hidden' e 'h-full' forçado do container principal para deixar fluir
    <div className="flex flex-col h-full bg-transparent"> 
      
      {/* HEADER: Restaurado padding p-6 para dar ar */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500/25 to-purple-600/20 rounded-xl shadow-lg shadow-violet-500/20">
              <BarChart3 className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Métricas</h1>
              <p className="text-sm text-slate-400 font-medium">Estatísticas de uso do Nebula</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetMetrics}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800/50 text-slate-300 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar
          </button>
        </div>
      </div>

      {/* CONTEÚDO: Padding consistente e scrollavel se necessário */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* SECTION 1: STATUS ATUAL */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-violet-400" />
            Status em Tempo Real
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Ativos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-violet-500/30 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-400 group-hover:text-violet-300 transition-colors">Ativos</span>
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Download className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{downloadStats.active}</p>
            </motion.div>

            {/* Card Concluídos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-green-500/30 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-400 group-hover:text-green-300 transition-colors">Concluídos</span>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{downloadStats.completed}</p>
            </motion.div>

            {/* Card Total */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-blue-500/30 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-400 group-hover:text-blue-300 transition-colors">Total da Sessão</span>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{downloadStats.total}</p>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 2: DADOS HISTÓRICOS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <h2 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Performance Global
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center gap-4 hover:border-green-500/30 transition-colors"
            >
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Download className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Baixado</p>
                <p className="text-2xl font-bold text-white mt-0.5">{formatBytes(totalDownloaded)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center gap-4 hover:border-blue-500/30 transition-colors"
            >
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Compartilhado</p>
                <p className="text-2xl font-bold text-white mt-0.5">{formatBytes(totalUploaded)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center gap-4 hover:border-violet-500/30 transition-colors"
            >
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Velocidade Média</p>
                <p className="text-2xl font-bold text-white mt-0.5">{formatSpeed(averageSpeed)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}
              className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center gap-4 hover:border-yellow-500/30 transition-colors"
            >
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Velocidade de Pico</p>
                <p className="text-2xl font-bold text-white mt-0.5">{formatSpeed(peakSpeed)}</p>
              </div>
            </motion.div>

          </div>
        </motion.section>

        {/* SECTION 3: SESSÕES (Resumo) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="border-t border-slate-800/50 pt-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 uppercase">Downloads Totais</span>
              <span className="text-xl font-bold text-slate-200 mt-1">{totalDownloads}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase">Sessões Iniciadas</span>
              <span className="text-xl font-bold text-slate-200 mt-1">{totalSessions}</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}