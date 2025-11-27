import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface FavoriteLink {
  id: string
  name: string
  magnet_link: string
  created_at: string
}

interface FavoritesStore {
  favorites: FavoriteLink[]
  
  setFavorites: (favorites: FavoriteLink[]) => void
  addFavorite: (favorite: FavoriteLink) => void
  removeFavorite: (id: string) => void
  updateFavorite: (id: string, data: Partial<FavoriteLink>) => void
  isFavorite: (magnetLink: string) => boolean
}

export const useFavoritesStore = create<FavoritesStore>()(
  devtools(
    persist(
      (set, get) => ({
        favorites: [],
        
        setFavorites: (favorites) => {
          set({ favorites })
        },
        
        addFavorite: (favorite) => {
          if (!favorite.id || !favorite.magnet_link) return
          set((state) => {
            if (state.favorites.find(f => f.id === favorite.id)) {
              return state
            }
            return { favorites: [...state.favorites, favorite] }
          })
        },
        
        removeFavorite: (id) => {
          set((state) => ({
            favorites: state.favorites.filter(f => f.id !== id)
          }))
        },
        
        updateFavorite: (id, data) => {
          set((state) => {
            const index = state.favorites.findIndex(f => f.id === id)
            if (index === -1) return state
            
            const newFavorites = [...state.favorites]
            newFavorites[index] = { ...newFavorites[index], ...data }
            return { favorites: newFavorites }
          })
        },
        
        isFavorite: (magnetLink) => {
          return get().favorites.some(f => f.magnet_link === magnetLink)
        },
      }),
      {
        name: 'nebula-favorites',
      }
    ),
    { name: 'FavoritesStore' }
  )
)

// Selector simples
export const useFavorites = () => {
  return useFavoritesStore((state) => state.favorites)
}

export const useIsFavorite = (magnetLink: string) => {
  return useFavoritesStore((state) => state.favorites.some(f => f.magnet_link === magnetLink))
}
