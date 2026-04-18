import Loader from './Loader'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  loading = false,
  disabled = false,
  loadingText = '',
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
  
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 active:bg-orange-800',
    secondary: 'border border-orange-600 bg-white text-orange-600 hover:bg-orange-50 focus:ring-orange-500 active:bg-orange-100',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 active:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 shadow-none',
  }
  
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  const loaderSizes = {
    xs: 'sm',
    sm: 'sm',
    md: 'sm',
    lg: 'md',
    xl: 'md',
  }

  const isDisabled = disabled || loading

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <div 
            className={`animate-spin w-4 h-4 border-2 rounded-full ${
              variant === 'primary' || variant === 'danger' || variant === 'success' 
                ? 'border-white border-t-transparent' 
                : 'border-orange-600 border-t-transparent'
            }`} 
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  )
}

export default Button
