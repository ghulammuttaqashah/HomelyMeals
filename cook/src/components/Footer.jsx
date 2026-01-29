const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">HomelyMeals Cook Portal</p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500">Share Your Culinary Passion</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-slate-500">
            <span>© {currentYear} HomelyMeals</span>
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
