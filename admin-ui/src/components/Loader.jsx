const Loader = ({ size = 'md', className = '', label = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-orange-600 border-t-transparent`}
        role="status"
        aria-label={label || 'Loading'}
      >
        <span className="sr-only">Loading...</span>
      </div>
      {label && (
        <span className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 animate-pulse">
          {label}
        </span>
      )}
    </div>
  )
}

export default Loader

