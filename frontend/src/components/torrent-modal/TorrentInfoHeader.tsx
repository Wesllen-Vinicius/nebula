import { memo } from 'react'
import { FolderOpen } from 'lucide-react'
import { formatSize } from '../../utils/format'

interface TorrentInfoHeaderProps {
  name: string
  totalSize: number
  fileCount: number
  selectedSize: number
}

function TorrentInfoHeader({ name, totalSize, fileCount, selectedSize }: TorrentInfoHeaderProps) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-violet-400" />
        <span className="font-semibold text-slate-200">{name}</span>
      </div>
      <div className="flex gap-6 text-sm text-slate-400">
        <span>
          Total: <span className="text-slate-300">{formatSize(totalSize)}</span>
        </span>
        <span>
          Arquivos: <span className="text-slate-300">{fileCount}</span>
        </span>
        <span>
          Selecionado: <span className="text-violet-400">{formatSize(selectedSize)}</span>
        </span>
      </div>
    </div>
  )
}

export default memo(TorrentInfoHeader)

