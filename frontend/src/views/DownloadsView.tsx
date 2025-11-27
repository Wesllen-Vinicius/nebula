import { useState, useMemo } from 'react'
import { Download, Clock, CheckCircle2 } from 'lucide-react'
import DownloadsList from '../components/DownloadsList'
import { useDownloads, useDownloadStats } from '../store/useDownloadStore'

type TabType = 'active' | 'completed' | 'all'

export default function DownloadsView() {
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const downloads = useDownloads()
  const stats = useDownloadStats()
  
  const activeCount = stats.active
  const completedCount = stats.completed

  const tabs = useMemo(() => [
    { id: 'active' as TabType, label: 'Ativos', icon: Download, count: activeCount },
    { id: 'completed' as TabType, label: 'Concluídos', icon: CheckCircle2, count: completedCount },
    { id: 'all' as TabType, label: 'Todos', icon: Clock, count: downloads.length },
  ], [activeCount, completedCount, downloads.length])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-4">Downloads</h1>
        
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
                  isActive
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <DownloadsList filter={activeTab} />
      </div>
    </div>
  )
}
