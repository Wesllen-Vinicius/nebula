export function calculateETA(
  progress: number,
  totalSize: number,
  downloadSpeed: number
): number | null {
  if (!downloadSpeed || downloadSpeed <= 0 || progress >= 100) {
    return null
  }

  const remainingBytes = totalSize * (1 - progress / 100)
  const seconds = remainingBytes / downloadSpeed

  return Math.max(0, Math.floor(seconds))
}

export function formatETA(eta: number | null): string {
  if (eta === null || eta <= 0) {
    return 'Calculando...'
  }

  if (eta < 60) {
    return `${eta}s restantes`
  }

  const minutes = Math.floor(eta / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min restantes`
  }

  return `${minutes}min restantes`
}

