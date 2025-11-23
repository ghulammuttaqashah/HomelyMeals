import { useEffect, useState } from 'react'

const ProgressBar = ({ isLoading, duration = 3000 }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev // Cap at 90% until complete
        return prev + 2
      })
    }, duration / 50)

    return () => clearInterval(interval)
  }, [isLoading, duration])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300 ease-out shadow-lg"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export default ProgressBar

