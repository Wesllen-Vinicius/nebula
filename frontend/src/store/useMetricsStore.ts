import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface MetricsState {
  totalDownloaded: number
  totalUploaded: number
  totalDownloads: number
  totalSessions: number
  averageSpeed: number
  peakSpeed: number
  lastSpeedSamples: number[]
  
  addDownloadedBytes: (bytes: number) => void
  addUploadedBytes: (bytes: number) => void
  recordSpeed: (speed: number) => void
  incrementDownloads: () => void
  incrementSessions: () => void
  reset: () => void
}

const MAX_SAMPLES = 100

const calculateAverage = (samples: number[]): number => {
  if (samples.length === 0) return 0
  const sum = samples.reduce((a, b) => a + b, 0)
  return sum / samples.length
}

export const useMetricsStore = create<MetricsState>()(
  devtools(
    persist(
      (set) => ({
        totalDownloaded: 0,
        totalUploaded: 0,
        totalDownloads: 0,
        totalSessions: 0,
        averageSpeed: 0,
        peakSpeed: 0,
        lastSpeedSamples: [],
        
        addDownloadedBytes: (bytes) => {
          if (bytes <= 0) return
          
          set((state) => ({
            totalDownloaded: state.totalDownloaded + bytes,
          }))
        },
        
        addUploadedBytes: (bytes) => {
          if (bytes <= 0) return
          
          set((state) => ({
            totalUploaded: state.totalUploaded + bytes,
          }))
        },
        
        recordSpeed: (speed) => {
          if (speed <= 0) return
          
          set((state) => {
            const samples = [...state.lastSpeedSamples, speed]
            const trimmedSamples = samples.length > MAX_SAMPLES 
              ? samples.slice(-MAX_SAMPLES)
              : samples
            
            const averageSpeed = calculateAverage(trimmedSamples)
            const peakSpeed = Math.max(state.peakSpeed, speed)
            
            if (
              state.averageSpeed === averageSpeed &&
              state.peakSpeed === peakSpeed &&
              state.lastSpeedSamples.length === trimmedSamples.length
            ) {
              return state
            }
            
            return {
              lastSpeedSamples: trimmedSamples,
              averageSpeed,
              peakSpeed,
            }
          })
        },
        
        incrementDownloads: () =>
          set((state) => ({
            totalDownloads: state.totalDownloads + 1,
          })),
        
        incrementSessions: () =>
          set((state) => ({
            totalSessions: state.totalSessions + 1,
          })),
        
        reset: () =>
          set({
            totalDownloaded: 0,
            totalUploaded: 0,
            totalDownloads: 0,
            totalSessions: 0,
            averageSpeed: 0,
            peakSpeed: 0,
            lastSpeedSamples: [],
          }),
      }),
      {
        name: 'nebula-metrics',
      }
    ),
    { name: 'MetricsStore' }
  )
)

// Seletores primitivos - evitam criação de objetos
export const useTotalDownloaded = () => useMetricsStore((state) => state.totalDownloaded)
export const useTotalUploaded = () => useMetricsStore((state) => state.totalUploaded)
export const useTotalDownloads = () => useMetricsStore((state) => state.totalDownloads)
export const useTotalSessions = () => useMetricsStore((state) => state.totalSessions)
export const useAverageSpeed = () => useMetricsStore((state) => state.averageSpeed)
export const usePeakSpeed = () => useMetricsStore((state) => state.peakSpeed)

// Hook combinado
export function useMetrics() {
  return {
    totalDownloaded: useTotalDownloaded(),
    totalUploaded: useTotalUploaded(),
    totalDownloads: useTotalDownloads(),
    totalSessions: useTotalSessions(),
    averageSpeed: useAverageSpeed(),
    peakSpeed: usePeakSpeed(),
  }
}
