const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-slate-900">HomelyMeals</p>
            <p className="mt-1 text-xs text-slate-500">Fresh, Homemade Food Delivered</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>© {currentYear} HomelyMeals. All rights reserved.</span>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
