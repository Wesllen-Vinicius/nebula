import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type AppView = 'home' | 'downloads' | 'favorites' | 'metrics' | 'settings' | 'about'

interface AppStore {
  activeView: AppView
  isBackendConnected: boolean
  lastError: string | null
  
  setActiveView: (view: AppView) => void
  setBackendConnected: (connected: boolean) => void
  setLastError: (error: string | null) => void
  clearError: () => void
}

const isValidView = (view: string): view is AppView => {
  return ['home', 'downloads', 'favorites', 'metrics', 'settings', 'about'].includes(view)
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      activeView: 'home',
      isBackendConnected: false,
      lastError: null,
      
      setActiveView: (activeView) => {
        if (isValidView(activeView)) {
          set({ activeView })
        }
      },
      setBackendConnected: (isBackendConnected) => set({ isBackendConnected }),
      setLastError: (lastError) => set({ lastError }),
      clearError: () => set({ lastError: null }),
    }),
    { name: 'AppStore' }
  )
)

export const useActiveView = () => {
  return useAppStore((state) => state.activeView)
}

export const useBackendConnection = () => {
  return useAppStore((state) => state.isBackendConnected)
}
