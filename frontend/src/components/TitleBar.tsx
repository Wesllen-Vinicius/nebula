import { Minus, Square, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback } from 'react'

export default function TitleBar() {
  const handleMinimize = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const appWindow = getCurrentWindow()
      await appWindow.minimize()
    } catch {
      // Silently fail
    }
  }, [])

  const handleMaximize = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const appWindow = getCurrentWindow()
      const isMaximized = await appWindow.isMaximized()
      if (isMaximized) {
        await appWindow.unmaximize()
      } else {
        await appWindow.maximize()
      }
    } catch {
      // Silently fail
    }
  }, [])

  const handleClose = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const appWindow = getCurrentWindow()
      await appWindow.close()
    } catch {
      // Silently fail
    }
  }, [])

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    // Só inicia drag se clicar na área do título (não nos botões)
    const target = e.target as HTMLElement
    if (target.closest('button') || target.tagName === 'BUTTON') {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const appWindow = getCurrentWindow()
      await appWindow.startDragging()
    } catch {
      // Silently fail
    }
  }, [])

  return (
    <div 
      className="flex items-center justify-between h-10 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90 border-b border-slate-800/50 backdrop-blur-sm px-4 select-none cursor-default shadow-sm"
      onMouseDown={handleMouseDown}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm shadow-violet-500/50"></div>
        <span className="text-sm font-semibold text-slate-300">Nebula</span>
      </div>
      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-800/60 transition-all duration-200 rounded-sm"
          title="Minimizar"
          type="button"
        >
          <Minus className="w-4 h-4 text-slate-400 pointer-events-none" />
        </button>
        <button
          onClick={handleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-800/60 transition-all duration-200 rounded-sm"
          title="Maximizar"
          type="button"
        >
          <Square className="w-4 h-4 text-slate-400 pointer-events-none" />
        </button>
        <button
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 rounded-sm"
          title="Fechar"
          type="button"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-red-400 pointer-events-none" />
        </button>
      </div>
    </div>
  )
}
