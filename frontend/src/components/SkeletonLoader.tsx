import { motion } from 'framer-motion'
import { memo } from 'react'

interface SkeletonLoaderProps {
  count?: number
  variant?: 'download' | 'favorite' | 'metric' | 'config'
}

function DownloadSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 bg-slate-900 border border-slate-800 rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-slate-800 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-slate-800 rounded animate-pulse w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <div className="h-3 w-12 bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500/30"
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

function FavoriteSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 bg-slate-900 border border-slate-800 rounded-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 bg-slate-800 rounded animate-pulse w-2/3" />
          </div>
          <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-800 rounded animate-pulse w-1/3" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}

function MetricSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 bg-slate-900 border border-slate-800 rounded-xl"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-5 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 bg-slate-800 rounded animate-pulse w-24" />
      </div>
      <div className="h-8 bg-slate-800 rounded animate-pulse w-20 mb-1" />
      <div className="h-3 bg-slate-800 rounded animate-pulse w-16" />
    </motion.div>
  )
}

function ConfigSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 bg-slate-800 rounded animate-pulse w-32" />
        </div>
        <div className="h-4 bg-slate-800 rounded animate-pulse w-16" />
      </div>
      <div className="h-5 bg-slate-800 rounded-full animate-pulse w-full" />
      <div className="h-3 bg-slate-800 rounded animate-pulse w-48" />
    </motion.div>
  )
}

function SkeletonLoader({ count = 3, variant = 'download' }: SkeletonLoaderProps) {
  const renderSkeleton = (index: number) => {
    switch (variant) {
      case 'favorite':
        return <FavoriteSkeleton key={index} index={index} />
      case 'metric':
        return <MetricSkeleton key={index} index={index} />
      case 'config':
        return <ConfigSkeleton key={index} index={index} />
      default:
        return <DownloadSkeleton key={index} index={index} />
    }
  }

  const gridClass = variant === 'metric' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-3'

  return (
    <div className={`p-6 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </div>
  )
}

export default memo(SkeletonLoader)
