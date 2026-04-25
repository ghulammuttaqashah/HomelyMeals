const Loader = ({ size = 'md', className = '', label = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  }

  // Check if custom color is provided in className
  const hasCustomColor = className.includes('border-') || className.includes('text-')
  const defaultBorderColor = hasCustomColor ? '' : 'border-orange-600 border-t-transparent'
  const defaultTextColor = hasCustomColor ? '' : 'text-orange-600'

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full ${defaultBorderColor} ${hasCustomColor ? 'border-current border-t-transparent' : ''}`}
        role="status"
        aria-label={label || 'Loading'}
      >
        <span className="sr-only">Loading...</span>
      </div>
      {label && (
        <span className={`mt-3 text-[10px] font-black uppercase tracking-[0.2em] ${defaultTextColor} animate-pulse`}>
          {label}
        </span>
      )}
    </div>
  )
}

export default Loader

