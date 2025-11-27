import { memo } from 'react'
import { Home, Download, Star, BarChart3, Settings, FolderOpen, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import type { AppView } from '../store/useAppStore'

interface SidebarProps {
  activeView: AppView
  onViewChange: (view: AppView) => void
  stats?: {
    active: number
    completed: number
    total: number
  }
}

function Sidebar({ activeView, onViewChange, stats }: SidebarProps) {
  const menuItems: Array<{ id: AppView; icon: typeof Home; label: string; badge?: number }> = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'downloads', icon: Download, label: 'Downloads', badge: stats?.active || 0 },
    { id: 'favorites', icon: Star, label: 'Favoritos' },
    { id: 'metrics', icon: BarChart3, label: 'Métricas' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
    { id: 'about', icon: Info, label: 'Sobre' },
  ]

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="w-64 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/80 border-r border-slate-800/50 backdrop-blur-sm flex flex-col shadow-xl shadow-black/20"
    >
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FolderOpen className="w-7 h-7 text-white drop-shadow-sm" />
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500/25 via-violet-500/15 to-transparent text-violet-300 shadow-lg shadow-violet-500/20 border-l-2 border-violet-500'
                  : 'text-slate-400 hover:bg-gradient-to-r hover:from-slate-800/60 hover:to-slate-800/30 hover:text-slate-200'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30'
                      : 'bg-slate-800/60 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="p-3 bg-slate-800/50 rounded-lg space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Total</span>
            <span className="font-semibold text-slate-300">{stats?.total || 0}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Ativos</span>
            <span className="font-semibold text-violet-400">{stats?.active || 0}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Completos</span>
            <span className="font-semibold text-green-400">{stats?.completed || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default memo(Sidebar)
