import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface DropZoneProps {
  onMagnetDrop: (magnetLink: string) => void
}

export default function DropZone({ onMagnetDrop }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () => {
          const content = reader.result as string
          // Procurar por magnet links no conteúdo
          const magnetMatch = content.match(/magnet:\?[^\s"'<>]+/i)
          if (magnetMatch) {
            onMagnetDrop(magnetMatch[0])
          }
        }
        reader.readAsText(file)
      })
    },
    [onMagnetDrop]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-bittorrent': ['.torrent'],
      'text/plain': ['.txt'],
    },
    noClick: false,
  })

  const { onClick, onKeyDown, role, tabIndex } = getRootProps()

  return (
    <motion.div
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
        isDragActive
          ? 'border-violet-500 bg-violet-500/10 scale-105'
          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        {isDragActive ? (
          <>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center"
            >
              <Upload className="w-8 h-8 text-violet-400" />
            </motion.div>
            <div>
              <p className="text-lg font-semibold text-violet-400">Solte aqui!</p>
              <p className="text-sm text-slate-400">Vamos processar seu arquivo</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-200">
                Arraste arquivos .torrent aqui
              </p>
              <p className="text-sm text-slate-400 mt-1">
                ou clique para selecionar do seu computador
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Suporta arquivos .torrent e magnet links em .txt
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

