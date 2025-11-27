import { useEffect, useState, useRef } from 'react'
import { Star, Trash2, Download, Copy } from 'lucide-react'
import { useNebulaApi } from '../hooks/useNebulaApi'
import { useToast } from '../hooks/useToast'
import { useFavorites, useFavoritesStore, type FavoriteLink } from '../store/useFavoritesStore'
import { useAppStore } from '../store/useAppStore'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'

interface FavoritesViewProps {
  onDownloadMagnet?: (magnetLink: string) => void
}

export default function FavoritesView({ onDownloadMagnet }: FavoritesViewProps) {
  const { get, delete: del } = useNebulaApi()
  const toast = useToast()
  const favorites = useFavorites()
  const setFavorites = useFavoritesStore((state) => state.setFavorites)
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)

  // Carregar favoritos APENAS uma vez
  useEffect(() => {
    if (hasLoadedRef.current) return
    
    const loadInitialFavorites = async () => {
      setLoading(true)
      try {
        const data = await get<FavoriteLink[]>('/api/favorites')
        setFavorites(Array.isArray(data) ? data : [])
      } catch {
      } finally {
        setLoading(false)
        hasLoadedRef.current = true
      }
    }
    
    loadInitialFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemove = async (id: string) => {
    try {
      await del(`/api/favorites/${id}`)
      removeFavorite(id)
      toast.success('Favorito removido')
    } catch (err) {
      toast.error('Erro ao remover', err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const handleCopyMagnet = (magnetLink: string) => {
    navigator.clipboard.writeText(magnetLink)
    toast.success('Magnet link copiado')
  }

  if (loading && favorites.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">Favoritos</h1>
          <p className="text-sm text-slate-400 mt-1">Carregando...</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <SkeletonLoader count={3} variant="favorite" />
        </div>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">Favoritos</h1>
          <p className="text-sm text-slate-400 mt-1">Seus magnet links favoritos</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <EmptyState
            icon={Star}
            title="Nenhum favorito"
            description="Adicione magnet links aos favoritos para acesso rápido"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Favoritos</h1>
        <p className="text-sm text-slate-400 mt-1">{favorites.length} magnet link(s) salvos</p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="space-y-2">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="p-3 bg-gradient-to-br from-slate-900/90 via-slate-800/50 to-slate-900/90 border border-slate-800/50 rounded-lg hover:border-violet-500/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <h3 className="font-medium text-slate-200 truncate">{fav.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 truncate font-mono">{fav.magnet_link}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    Adicionado em {new Date(fav.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyMagnet(fav.magnet_link)}
                    className="p-2 hover:bg-slate-800 rounded transition-colors"
                    title="Copiar magnet link"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      if (onDownloadMagnet) {
                        onDownloadMagnet(fav.magnet_link)
                      } else {
                        navigator.clipboard.writeText(fav.magnet_link)
                        setActiveView('home')
                        toast.success('Magnet link copiado', 'Cole na tela Home para baixar')
                      }
                    }}
                    className="p-2 hover:bg-violet-500/20 rounded transition-colors"
                    title="Baixar"
                  >
                    <Download className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    onClick={() => handleRemove(fav.id)}
                    className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

