import { memo } from 'react'
import { FileIcon, CheckSquare, Square } from 'lucide-react'
import { formatSize } from '../../utils/format'

interface TorrentFile {
  index: number
  path: string
  size: number
}

interface FileItemProps {
  file: TorrentFile
  isSelected: boolean
  onToggle: () => void
}

function FileItem({ file, isSelected, onToggle }: FileItemProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
        isSelected
          ? 'bg-violet-500/10 border border-violet-500/20'
          : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/50'
      }`}
    >
      {isSelected ? (
        <CheckSquare className="w-4 h-4 text-violet-400 flex-shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
      )}
      <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="flex-1 text-left text-sm text-slate-300 truncate">{file.path}</span>
      <span className="text-xs text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>
    </button>
  )
}

export default memo(FileItem)

