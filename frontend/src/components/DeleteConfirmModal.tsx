import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X, Trash2, FolderX, Folder } from 'lucide-react'
import { motion } from 'framer-motion'

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  downloadName: string
  outputDir: string
  onConfirm: (deleteFiles: boolean) => void
}

export default function DeleteConfirmModal({
  open,
  onOpenChange,
  downloadName,
  outputDir,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 rounded-xl border border-slate-800 shadow-2xl z-50"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <Dialog.Title className="text-lg font-semibold text-white mb-1">
                    Remover Download
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-400">
                    O que você deseja fazer com este download?
                  </Dialog.Description>
                </div>
                <Dialog.Close className="text-slate-400 hover:text-slate-300 transition-colors">
                  <X className="w-5 h-5" />
                </Dialog.Close>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg mb-6">
                <p className="text-sm text-slate-300 font-medium mb-1 truncate">{downloadName}</p>
                {outputDir && (
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {outputDir}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => onConfirm(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <Trash2 className="w-5 h-5 text-yellow-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Apenas remover da lista</p>
                    <p className="text-xs text-slate-400">Os arquivos baixados serão mantidos</p>
                  </div>
                </button>

                <button
                  onClick={() => onConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors group"
                >
                  <FolderX className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-400">Remover e deletar arquivos</p>
                    <p className="text-xs text-red-400/70">Os arquivos serão permanentemente excluídos</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors text-sm">
                    Cancelar
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

