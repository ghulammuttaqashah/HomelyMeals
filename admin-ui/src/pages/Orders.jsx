import { useState, useEffect } from 'react'
import { FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiSearch, FiChevronRight, FiRefreshCw, FiX, FiUser, FiMapPin, FiDollarSign, FiAlertTriangle } from 'react-icons/fi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import BackButton from '../components/BackButton'
import { getOrders, getOrder } from '../api/orders'
import { initializeSocket, subscribeToOrderUpdates, disconnectSocket } from '../utils/socket'
import toast from 'react-hot-toast'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancelledByFilter, setCancelledByFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const cancelledByOptions = [
    { value: 'all', label: 'All Cancellations' },
    { value: 'system', label: 'Auto-Cancelled (System)' },
    { value: 'customer', label: 'Cancelled by Customer' },
    { value: 'cook', label: 'Cancelled by Cook' },
  ]

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ]

  useEffect(() => {
    initializeSocket()
    const unsubscribe = subscribeToOrderUpdates(() => {
      fetchOrders({ mode: 'refresh' })
    })

    return () => {
      unsubscribe()
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    fetchOrders({ mode: initialLoading ? 'initial' : 'section' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, cancelledByFilter, dateFilter, pagination.page])

  const getDateRange = (filter) => {
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    if (filter === 'today') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }

    if (filter === 'yesterday') {
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }

    if (filter === 'this_week') {
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1
      start.setDate(start.getDate() - diff)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }

    if (filter === 'this_month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }

    return {}
  }

  const fetchOrders = async ({ mode = 'section' } = {}) => {
    try {
      if (mode === 'initial') setInitialLoading(true)
      else if (mode === 'refresh') setRefreshing(true)
      else setSectionLoading(true)

      const params = { page: pagination.page, limit: 20 }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (cancelledByFilter !== 'all') {
        params.cancelledBy = cancelledByFilter
      }
      Object.assign(params, getDateRange(dateFilter))

      const response = await getOrders(params)
      // axios wraps response in data, backend returns { orders, pagination, counts }
      const data = response.data || response
      setOrders(data.orders || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination?.pages || 1
      }))
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setInitialLoading(false)
      setSectionLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusIcon = (status) => {
    const iconMap = {
      pending: <FiClock className="h-4 w-4 text-yellow-500" />,
      confirmed: <FiPackage className="h-4 w-4 text-blue-500" />,
      preparing: <FiPackage className="h-4 w-4 text-indigo-500" />,
      out_for_delivery: <FiTruck className="h-4 w-4 text-purple-500" />,
      delivered: <FiCheckCircle className="h-4 w-4 text-green-500" />,
      delivery_pending_confirmation: <FiClock className="h-4 w-4 text-orange-500" />,
      cancelled: <FiXCircle className="h-4 w-4 text-red-500" />,
      expired: <FiXCircle className="h-4 w-4 text-gray-500" />
    }
    return iconMap[status] || <FiPackage className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadge = (status, cancelledBy) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      preparing: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Preparing' },
      out_for_delivery: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Out for Delivery' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      delivery_pending_confirmation: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Delivery Pending' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' }
    }
    
    let config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    
    // Special styling for auto-cancelled orders
    if (status === 'cancelled' && cancelledBy === 'system') {
      config = { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Auto-Cancelled' }
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentBadge = (order) => {
    if (!order) return null
    
    const method = order.paymentMethod || 'unknown'
    let status = order.paymentStatus || 'unpaid'
    
    // For COD, if order is delivered, payment is considered paid
    if (method === 'cod' && order.status === 'delivered') {
      status = 'paid'
    }
    
    const statusConfig = {
      unpaid: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Unpaid' },
      verification_pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
      verified: { bg: 'bg-green-100', text: 'text-green-800', label: 'Verified' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    }
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    const methodLabel = method === 'cod' ? 'COD' : method.toUpperCase()
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {methodLabel} - {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openDetail = async (orderId) => {
    setDetailLoading(true)
    try {
      const response = await getOrder(orderId)
      setSelectedOrder(response.data?.order)
    } catch (error) {
      toast.error('Failed to load order details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedOrder(null)
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order._id.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.cook?.businessName?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor and manage all orders across the platform
              </p>
              <div className="mt-3">
                <BackButton to="/dashboard" label="Back to Dashboard" />
              </div>
            </div>
            <button
              onClick={() => fetchOrders({ mode: 'refresh' })}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID, customer, or cook..."
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="sm:col-span-1 lg:col-span-3">
                <label htmlFor="dateFilter" className="mb-2 block text-sm font-semibold text-gray-700">Date Filter</label>
                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                >
                  {dateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <label htmlFor="statusFilter" className="mb-2 block text-sm font-semibold text-gray-700">Status Filter</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <label htmlFor="cancelledByFilter" className="mb-2 block text-sm font-semibold text-gray-700">Cancellation Type</label>
                <select
                  id="cancelledByFilter"
                  value={cancelledByFilter}
                  onChange={(e) => {
                    setCancelledByFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                  disabled={statusFilter !== 'cancelled'}
                >
                  {cancelledByOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {statusFilter !== 'cancelled' && (
                  <p className="mt-1 text-xs text-gray-500">Select "Cancelled" status first</p>
                )}
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('all')
                    setStatusFilter('all')
                    setCancelledByFilter('all')
                    setSearchQuery('')
                    setPagination({ page: 1, totalPages: pagination.totalPages })
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="relative">
          {(initialLoading || sectionLoading) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]">
              <Loader label="Loading Orders" />
            </div>
          )}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <FiPackage className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No orders in selected filters'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => openDetail(order._id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="text-sm font-semibold text-gray-900">#{order._id.slice(-8)}</span>
                      </div>
                      <FiChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                      <span><span className="text-gray-400">Customer:</span> {order.customer?.name || 'N/A'}</span>
                      <span><span className="text-gray-400">Cook:</span> {order.cook?.name || 'N/A'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(order.status, order.cancelledBy)}
                      {getPaymentBadge(order)}
                      <span className="text-xs font-semibold text-gray-900 ml-auto">Rs. {order.totalAmount}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cook</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order._id} onClick={() => openDetail(order._id)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="text-sm font-medium text-gray-900">#{order._id.slice(-8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.customer?.contact || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.cook?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.cook?.contact || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status, order.cancelledBy)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getPaymentBadge(order)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Rs. {order.totalAmount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <FiChevronRight className="h-5 w-5 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Loading overlay for detail */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <Loader size="lg" label="Loading Order Details" />
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Order #{selectedOrder._id.slice(-8)}</h2>
                <p className="text-sm text-gray-500">Placed on {formatDate(selectedOrder.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedOrder.status, selectedOrder.cancelledBy)}
                <button
                  onClick={closeDetail}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiUser className="h-4 w-4 text-blue-500" />
                      Customer Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{selectedOrder.customer?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">{selectedOrder.customer?.contact || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{selectedOrder.customer?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cook Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiPackage className="h-4 w-4 text-orange-500" />
                      Cook Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{selectedOrder.cook?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">{selectedOrder.cook?.contact || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiMapPin className="h-4 w-4 text-green-500" />
                      Delivery Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Delivery Address</p>
                        <p className="font-medium text-gray-900">
                          {selectedOrder.deliveryAddress ? (
                            <>
                              {selectedOrder.deliveryAddress.houseNo && `${selectedOrder.deliveryAddress.houseNo}, `}
                              {selectedOrder.deliveryAddress.street}
                              {selectedOrder.deliveryAddress.city && `, ${selectedOrder.deliveryAddress.city}`}
                              {selectedOrder.deliveryAddress.postalCode && ` - ${selectedOrder.deliveryAddress.postalCode}`}
                            </>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Distance</p>
                        <p className="font-medium text-gray-900">{selectedOrder.distance?.toFixed(2) || 'N/A'} km</p>
                      </div>
                      {selectedOrder.deliveryNote && (
                        <div>
                          <p className="text-gray-500">Delivery Notes</p>
                          <p className="font-medium text-gray-900">{selectedOrder.deliveryNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Order Items */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Order Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                          <div className="flex items-center gap-3">
                            {item.itemImage ? (
                              <img
                                src={item.itemImage}
                                alt={item.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <FiPackage className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{item.name || 'Unknown Item'}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">Rs. {item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-300 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-900">Rs. {selectedOrder.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span className="text-gray-900">Rs. {Math.round(selectedOrder.deliveryCharges || 0)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-300">
                        <span className="text-gray-900">Total</span>
                        <span className="text-orange-600">Rs. {selectedOrder.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FiDollarSign className="h-4 w-4 text-green-500" />
                      Payment Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Payment Method</p>
                        <p className="font-medium text-gray-900 uppercase">
                          {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : selectedOrder.paymentMethod || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Payment Status</p>
                        {getPaymentBadge(selectedOrder)}
                      </div>
                      {selectedOrder.paymentMethod === 'cod' && (
                        <div className="bg-yellow-50 p-3 rounded-lg mt-2">
                          <p className="text-xs text-yellow-800">
                            <strong>Cash on Delivery:</strong> Payment of Rs. {selectedOrder.totalAmount} to be collected upon delivery.
                            {selectedOrder.status === 'delivered' && ' (Marked as received)'}
                          </p>
                        </div>
                      )}
                      {selectedOrder.paymentProofUrl && (
                        <div className="mt-2">
                          <p className="text-gray-500 mb-2">Payment Proof</p>
                          <a
                            href={selectedOrder.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={selectedOrder.paymentProofUrl}
                              alt="Payment proof"
                              className="h-24 rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cancellation Info */}
                  {selectedOrder.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="text-base font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <FiAlertTriangle className="h-4 w-4" />
                        Cancellation Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        {selectedOrder.cancelledBy && (
                          <div>
                            <p className="text-red-700">Cancelled by: <span className="font-medium capitalize">{selectedOrder.cancelledBy}</span></p>
                          </div>
                        )}
                        {selectedOrder.cancellationReason && (
                          <div>
                            <p className="text-red-700">Reason: <span className="font-medium">{selectedOrder.cancellationReason}</span></p>
                          </div>
                        )}
                        {selectedOrder.cancelledAt && (
                          <div>
                            <p className="text-red-600 text-xs">{formatDate(selectedOrder.cancelledAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
