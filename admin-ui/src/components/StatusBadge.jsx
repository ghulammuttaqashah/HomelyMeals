const StatusBadge = ({ status }) => {
  const styles =
    status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold capitalize ${styles}`}>
      {status}
    </span>
  )
}

export default StatusBadge
