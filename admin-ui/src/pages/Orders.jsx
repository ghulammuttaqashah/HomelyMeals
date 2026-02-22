import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import { getOrders } from '../api/orders'
import { initializeSocket, subscribeToOrderUpdates, disconnectSocket } from '../utils/socket'

const Orders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })

  useEffect(() => {
    initializeSocket()
    const unsubscribe = subscribeToOrderUpdates(() => {
      fetchOrders(false)
    })

    return () => {
      unsubscribe()
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [activeTab, pagination.page])

  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)

      const params = { page: pagination.page, limit: 20 }
      if (activeTab !== 'all') {
        params.status = activeTab
      }

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
      setLoading(false)
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

  const getStatusBadge = (status) => {
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
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'out_for_delivery', label: 'Out for Delivery' },
    { id: 'delivery_pending_confirmation', label: 'Delivery Pending' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' }
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader />
        </main>
        <Footer />
      </div>
    )
  }

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
            </div>
            <button
              onClick={() => fetchOrders(false)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID, customer, or cook..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px space-x-4 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <FiPackage className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No orders in this category'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cook
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="text-sm font-medium text-gray-900">
                              #{order._id.slice(-8)}
                            </span>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentBadge(order)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Rs. {order.totalAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
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
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
      </main>

      <Footer />
    </div>
  )
}

export default Orders
