const Skeleton = ({ className = '', variant = 'default', columns = 4 }) => {
  const baseClasses = 'animate-pulse bg-slate-200 rounded'
  
  if (variant === 'table-row') {
    if (columns === 5) {
      return (
        <tr className="border-b border-slate-100">
          <td className="px-6 py-4">
            <div className={`h-4 w-32 ${baseClasses}`} />
          </td>
          <td className="px-6 py-4">
            <div className={`h-4 w-48 ${baseClasses}`} />
          </td>
          <td className="px-6 py-4">
            <div className={`h-6 w-20 ${baseClasses}`} />
          </td>
          <td className="px-6 py-4">
            <div className={`h-4 w-40 ${baseClasses}`} />
          </td>
          <td className="px-6 py-4">
            <div className={`h-8 w-24 ml-auto ${baseClasses}`} />
          </td>
        </tr>
      )
    }
    return (
      <tr className="border-b border-slate-100">
        <td className="px-6 py-4">
          <div className={`h-4 w-32 ${baseClasses}`} />
        </td>
        <td className="px-6 py-4">
          <div className={`h-4 w-48 ${baseClasses}`} />
        </td>
        <td className="px-6 py-4">
          <div className={`h-6 w-20 ${baseClasses}`} />
        </td>
        <td className="px-6 py-4">
          <div className={`h-8 w-24 ml-auto ${baseClasses}`} />
        </td>
      </tr>
    )
  }
  
  return <div className={`${baseClasses} ${className}`} />
}

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="table-row" columns={columns} />
      ))}
    </>
  )
}

export default Skeleton