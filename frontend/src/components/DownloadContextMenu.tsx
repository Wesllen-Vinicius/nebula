import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical, Play, Pause, Trash2, FolderOpen, Copy, Info, FileX } from 'lucide-react'

type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error'

interface DownloadContextMenuProps {
  status: DownloadStatus
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onOpenFolder: () => void
  onCopyMagnet: () => void
  onShowInfo: () => void
  onDeleteFiles?: () => void
}

export default function DownloadContextMenu({
  status,
  onPause,
  onResume,
  onCancel,
  onOpenFolder,
  onCopyMagnet,
  onShowInfo,
  onDeleteFiles,
}: DownloadContextMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-slate-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-1 z-50"
          sideOffset={5}
        >
          {status === 'downloading' && (
            <DropdownMenu.Item
              onClick={onPause}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md cursor-pointer outline-none"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </DropdownMenu.Item>
          )}

          {status === 'paused' && (
            <DropdownMenu.Item
              onClick={onResume}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md cursor-pointer outline-none"
            >
              <Play className="w-4 h-4" />
              Retomar
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Item
            onClick={onOpenFolder}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md cursor-pointer outline-none"
          >
            <FolderOpen className="w-4 h-4" />
            Abrir Pasta
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={onCopyMagnet}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md cursor-pointer outline-none"
          >
            <Copy className="w-4 h-4" />
            Copiar Magnet Link
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={onShowInfo}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md cursor-pointer outline-none"
          >
            <Info className="w-4 h-4" />
            Detalhes
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-800 my-1" />

          <DropdownMenu.Item
            onClick={onCancel}
            className="flex items-center gap-3 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10 rounded-md cursor-pointer outline-none"
          >
            <Trash2 className="w-4 h-4" />
            Cancelar Download
          </DropdownMenu.Item>

          {onDeleteFiles && (status === 'completed' || status === 'error') && (
            <DropdownMenu.Item
              onClick={onDeleteFiles}
              className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer outline-none"
            >
              <FileX className="w-4 h-4" />
              Deletar Arquivos
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

