import { memo } from 'react'
import { CheckSquare, Square, Search } from 'lucide-react'
import FileItem from './FileItem'

interface TorrentFile {
  index: number
  path: string
  size: number
}

interface FileListProps {
  files: TorrentFile[]
  selectedFiles: Set<number>
  searchTerm: string
  onSearchChange: (term: string) => void
  onToggleFile: (index: number) => void
  onToggleAll: () => void
}

function FileList({
  files,
  selectedFiles,
  searchTerm,
  onSearchChange,
  onToggleFile,
  onToggleAll,
}: FileListProps) {
  const allSelected = selectedFiles.size === files.length && files.length > 0

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onToggleAll}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-violet-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>{allSelected ? 'Desmarcar todos' : 'Selecionar todos'}</span>
        </button>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar arquivos..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label="Buscar arquivos no torrent"
          />
        </div>
      </div>

      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
        {files.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Nenhum arquivo encontrado</div>
        ) : (
          files.map((file) => (
            <FileItem
              key={file.index}
              file={file}
              isSelected={selectedFiles.has(file.index)}
              onToggle={() => onToggleFile(file.index)}
            />
          ))
        )}
      </div>
    </>
  )
}

export default memo(FileList)

