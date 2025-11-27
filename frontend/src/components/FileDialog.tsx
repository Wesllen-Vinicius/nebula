import { FolderOpen } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'

interface FileDialogButtonProps {
  onSelect: (path: string) => void
  directory?: boolean
  className?: string
}

export default function FileDialogButton({ onSelect, directory = true, className }: FileDialogButtonProps) {
  const handleOpen = async () => {
    try {
      const selected = await open({
        directory,
        multiple: false,
        title: directory ? 'Selecione o diretório de destino' : 'Selecione um arquivo',
      })

      if (selected && typeof selected === 'string') {
        onSelect(selected)
      }
    } catch {
      // User cancelled or error occurred - silently fail
    }
  }

  return (
    <button
      onClick={handleOpen}
      className={className || 'px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors'}
      title={directory ? 'Escolher pasta' : 'Escolher arquivo'}
    >
      <FolderOpen className="w-5 h-5" />
    </button>
  )
}

