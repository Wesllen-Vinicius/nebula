import { Info, Folder, Code, Package, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AboutView() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500/25 to-purple-600/20 rounded-lg shadow-md shadow-violet-500/20">
            <Info className="w-6 h-6 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sobre</h1>
            <p className="text-sm text-slate-400">Informações sobre o Nebula</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 rounded-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500/25 to-purple-600/20 rounded-xl shadow-lg shadow-violet-500/20">
                <Folder className="w-8 h-8 text-violet-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nebula</h2>
                <p className="text-sm text-slate-400">Baixador de Links Magnéticos</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-slate-500">Versão</span>
              <span className="font-semibold text-white">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-slate-500">Licença</span>
              <span className="font-semibold text-white">MIT</span>
            </div>
          </div>
        </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Tecnologias</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-900/90 via-slate-800/50 to-slate-900/90 border border-slate-800/50 rounded-xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Code className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white">Backend</h3>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Linguagem:</span> Go 1.25</p>
                  <p><span className="text-slate-500">Biblioteca:</span> anacrolix/torrent</p>
                  <p><span className="text-slate-500">Router:</span> Chi Router</p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900/90 via-slate-800/50 to-slate-900/90 border border-slate-800/50 rounded-xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white">Frontend</h3>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Framework:</span> React 19</p>
                  <p><span className="text-slate-500">Desktop:</span> Tauri 2.9.3</p>
                  <p><span className="text-slate-500">Linguagem:</span> TypeScript 5.7</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-5 bg-gradient-to-br from-slate-900/90 via-slate-800/50 to-slate-900/90 border border-slate-800/50 rounded-xl shadow-lg backdrop-blur-sm"
          >
            <h3 className="font-semibold text-white mb-3">Links</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/nebula-app/nebula"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Repositório no GitHub</span>
              </a>
              <a
                href="https://github.com/nebula-app/nebula/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Reportar problemas</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

