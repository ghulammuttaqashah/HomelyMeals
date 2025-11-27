const Container = ({ children, className = '' }) => {
  return (
    <div className={`mx-auto max-w-7xl px-4 lg:px-6 ${className}`}>
      {children}
    </div>
  )
}

export default Container
