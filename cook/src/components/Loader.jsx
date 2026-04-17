const Loader = ({ size = 'md', className = '', variant = 'spinner', text = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }

  // Spinner variant (default)
  if (variant === 'spinner') {
    return (
      <div className={`inline-flex items-center justify-center text-orange-600 ${className}`}>
        <div
          className={`${sizeClasses[size]} animate-spin rounded-full border-current border-t-transparent`}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  // Dots variant
  if (variant === 'dots') {
    return (
      <div className={`inline-flex items-center justify-center gap-1 text-orange-600 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    )
  }

  // Pulse variant
  if (variant === 'pulse') {
    return (
      <div className={`inline-flex items-center justify-center text-orange-600 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-current animate-pulse`} />
      </div>
    )
  }

  // Page variant - full page loader with optional text
  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className={`${sizeClasses.lg} animate-spin rounded-full border-orange-600 border-t-transparent`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        {text && (
          <p className={`mt-4 ${textSizeClasses[size]} font-medium text-gray-600 animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    )
  }

  // Default fallback to spinner
  return (
    <div className={`inline-flex items-center justify-center text-orange-600 ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-current border-t-transparent`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

// Skeleton component for content placeholder
export const Skeleton = ({ className = '', variant = 'text', lines = 1 }) => {
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{ width: i === lines - 1 && lines > 1 ? '75%' : '100%' }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'circle') {
    return <div className={`rounded-full bg-gray-200 animate-pulse ${className}`} />
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        <div className="h-40 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  // Rectangle variant (default)
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

// SkeletonCard component for meal/cook cards
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
    <div className="h-48 bg-gray-200 animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-24" />
      </div>
    </div>
  </div>
)

export default Loader
