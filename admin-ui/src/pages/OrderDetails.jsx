import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FiPackage, FiUser, FiMapPin, FiPhone, FiClock, 
  FiCheckCircle, FiXCircle, FiTruck, FiDollarSign, FiImage,
  FiAlertTriangle
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import BackButton from '../components/BackButton'
import { getOrder } from '../api/orders'

const OrderDetails = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await getOrder(orderId)
      setOrder(response.data?.order)
    } catch (error) {
      console.error('Failed to fetch order:', error)
      toast.error('Failed to load order details')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      preparing: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Preparing' },
      out_for_delivery: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Out for Delivery' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      delivery_pending_confirmation: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Delivery Pending Confirmation' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' }
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader size="lg" label="Loading Details" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Order not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <BackButton onClick={() => navigate('/orders')} label="Back to Orders" />
          </div>

          {/* Order Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Order #{order._id.slice(-8)}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(order.status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiUser className="h-5 w-5 text-blue-500" />
                  Customer Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{order.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{order.customer?.contact || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{order.customer?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Cook Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiPackage className="h-5 w-5 text-orange-500" />
                  Cook Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{order.cook?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{order.cook?.contact || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiMapPin className="h-5 w-5 text-green-500" />
                  Delivery Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-medium text-gray-900">
                      {order.deliveryAddress ? (
                        <>
                          {order.deliveryAddress.houseNo && `${order.deliveryAddress.houseNo}, `}
                          {order.deliveryAddress.street}
                          {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
                          {order.deliveryAddress.postalCode && ` - ${order.deliveryAddress.postalCode}`}
                        </>
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="font-medium text-gray-900">{order.distance?.toFixed(2) || order.deliveryDistance?.toFixed(2) || 'N/A'} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimated Delivery Time</p>
                    <p className="font-medium text-gray-900">
                      {order.estimatedTime ? `${order.estimatedTime} mins` : 
                       order.estimatedDeliveryTime ? formatDate(order.estimatedDeliveryTime) : 'N/A'}
                    </p>
                  </div>
                  {order.deliveryNote && (
                    <div>
                      <p className="text-sm text-gray-500">Delivery Notes (from Cook)</p>
                      <p className="font-medium text-gray-900">{order.deliveryNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                <div className="space-y-3">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        {item.itemImage ? (
                          <img
                            src={item.itemImage}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <FiPackage className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.name || 'Unknown Item'}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">Rs. {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">Rs. {order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery Fee</span>
                    <span className="text-gray-900">Rs. {Math.round(order.deliveryCharges || order.deliveryFee || 0)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-orange-600">Rs. {order.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiDollarSign className="h-5 w-5 text-green-500" />
                  Payment Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium text-gray-900 uppercase">
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    {(() => {
                      // For COD, if order is delivered, payment is considered paid
                      let displayStatus = order.paymentStatus
                      if (order.paymentMethod === 'cod' && order.status === 'delivered') {
                        displayStatus = 'paid'
                      }
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          displayStatus === 'verified' || displayStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          displayStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          displayStatus === 'verification_pending' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {displayStatus === 'verification_pending' ? 'Verification Pending' :
                           displayStatus === 'paid' ? 'Paid' :
                           displayStatus === 'verified' ? 'Verified' :
                           displayStatus === 'rejected' ? 'Rejected' :
                           displayStatus === 'unpaid' ? 'Unpaid' :
                           displayStatus || 'Pending'}
                        </span>
                      )
                    })()}
                  </div>
                  {order.paymentMethod === 'cod' && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Cash on Delivery:</strong> Payment of Rs. {order.totalAmount} to be collected upon delivery.
                        {order.status === 'delivered' && ' (Marked as received)'}
                      </p>
                    </div>
                  )}
                  {order.paymentProofUrl && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Payment Proof</p>
                      <a
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={order.paymentProofUrl}
                          alt="Payment proof"
                          className="h-32 rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>
                  )}
                  {order.paymentRejections?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Rejection History</p>
                      <div className="space-y-2">
                        {order.paymentRejections.map((rejection, index) => (
                          <div key={index} className="bg-red-50 p-3 rounded-lg text-sm">
                            <p className="text-red-800">{rejection.reason}</p>
                            <p className="text-red-500 text-xs mt-1">{formatDate(rejection.rejectedAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiClock className="h-5 w-5 text-purple-500" />
                  Order Timeline
                </h2>
                <div className="space-y-4">
                  {order.statusHistory?.map((history, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`mt-1 h-3 w-3 rounded-full ${
                        index === 0 ? 'bg-orange-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {history.status.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(history.timestamp)}</p>
                        {history.note && (
                          <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dispute Info (if exists) */}
          {order.dispute && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                <FiAlertTriangle className="h-5 w-5" />
                Active Dispute
              </h2>
              <p className="text-sm text-red-700 mb-2">
                This order has an active dispute. 
                <button
                  onClick={() => navigate(`/disputes/${order.dispute}`)}
                  className="ml-2 font-medium underline hover:no-underline"
                >
                  View Dispute Details →
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default OrderDetails
