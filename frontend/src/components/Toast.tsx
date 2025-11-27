import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  title: string
  description?: string
  type?: ToastType
  open: boolean
  onOpenChange: (open: boolean) => void
}

const toastStyles = {
  success: {
    bg: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border-emerald-500/30 shadow-lg shadow-emerald-500/10',
    icon: CheckCircle,
    iconColor: 'text-emerald-300',
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500/15 via-red-500/10 to-transparent border-red-500/30 shadow-lg shadow-red-500/10',
    icon: AlertCircle,
    iconColor: 'text-red-300',
  },
  info: {
    bg: 'bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-transparent border-violet-500/30 shadow-lg shadow-violet-500/10',
    icon: Info,
    iconColor: 'text-violet-300',
  },
}

export function Toast({ title, description, type = 'info', open, onOpenChange }: ToastProps) {
  const style = toastStyles[type]
  const Icon = style.icon

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      asChild
      forceMount
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`${style.bg} border rounded-lg p-4 backdrop-blur-sm flex items-start gap-3 min-w-[350px] max-w-md`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${style.iconColor} mt-0.5`} />
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-semibold text-slate-100 mb-1">
                {title}
              </ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className="text-sm text-slate-400">
                  {description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-slate-400 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </ToastPrimitive.Close>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastPrimitive.Root>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col gap-2 p-6 z-50 max-w-full" />
    </ToastPrimitive.Provider>
  )
}

