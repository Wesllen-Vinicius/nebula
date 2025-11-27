import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface AppConfig {
  defaultDownloadDir: string
  maxDownloadSpeed: number
  maxUploadSpeed: number
  maxConnections: number
  seedAfterDownload: boolean
  sequentialDownload: boolean
  autoStartDownloads: boolean
  showNotifications: boolean
}

interface ConfigStore {
  config: AppConfig
  
  updateConfig: (updates: Partial<AppConfig>) => void
  resetConfig: () => void
  validateAndUpdate: (updates: Partial<AppConfig>) => boolean
}

const defaultConfig: AppConfig = {
  defaultDownloadDir: '',
  maxDownloadSpeed: 0,
  maxUploadSpeed: 0,
  maxConnections: 50,
  seedAfterDownload: true,
  sequentialDownload: false,
  autoStartDownloads: false,
  showNotifications: true,
}

const validateConfig = (config: Partial<AppConfig>): boolean => {
  if (config.maxDownloadSpeed !== undefined && config.maxDownloadSpeed < 0) {
    return false
  }
  if (config.maxUploadSpeed !== undefined && config.maxUploadSpeed < 0) {
    return false
  }
  if (config.maxConnections !== undefined && (config.maxConnections < 1 || config.maxConnections > 1000)) {
    return false
  }
  return true
}

export const useConfigStore = create<ConfigStore>()(
  devtools(
    persist(
      (set) => ({
        config: defaultConfig,
        
        updateConfig: (updates) => {
          if (!validateConfig(updates)) {
            return
          }
          
          set((state) => ({
            config: { ...state.config, ...updates }
          }))
        },
        
        resetConfig: () => set({ config: defaultConfig }),
        
        validateAndUpdate: (updates) => {
          if (!validateConfig(updates)) {
            return false
          }
          
          set((state) => ({
            config: { ...state.config, ...updates }
          }))
          
          return true
        },
      }),
      {
        name: 'nebula-config',
        partialize: (state) => ({ config: state.config }),
      }
    ),
    { name: 'ConfigStore' }
  )
)

export const useConfig = () => {
  return useConfigStore((state) => state.config)
}

export const useConfigValue = <K extends keyof AppConfig>(key: K) => {
  return useConfigStore((state) => state.config[key])
}
