import { memo } from 'react'
import { FolderOpen, Check } from 'lucide-react'
import FileDialogButton from '../FileDialog'

interface OutputDirSelectorProps {
  outputDir: string
  onSelect: (dir: string) => void
}

function OutputDirSelector({ outputDir, onSelect }: OutputDirSelectorProps) {
  const hasDir = outputDir.trim().length > 0

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-slate-400" />
          Salvar em
        </label>
        {hasDir && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Configurado
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={outputDir}
          readOnly
          placeholder="Selecione uma pasta..."
          className="flex-1 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm truncate"
        />
        <FileDialogButton
          onSelect={onSelect}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 text-sm"
        />
      </div>
    </div>
  )
}

export default memo(OutputDirSelector)
