import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiSend, FiArrowLeft, FiMessageCircle, FiUser, FiInbox, FiSearch, FiX } from 'react-icons/fi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../utils/socket'
import {
  getChats,
  getChatMessages,
  sendMessage as sendMessageApi
} from '../api/chat'

const Chats = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { customerId } = useParams()
  const { cook } = useAuth()

  const [chats, setChats] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const searchRef = useRef(null)
  const fetchingRef = useRef(false) // Track if we're currently fetching

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getChats()
      const validChats = (res.chats || []).filter(chat => chat.customerId && chat.customerId._id)
      setChats(validChats)
    } catch (error) {
      toast.error('Failed to load chats')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (customerIdToFetch) => {
    if (!customerIdToFetch) {
      setLoadingMessages(false)
      return
    }
    
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log('Already fetching messages, skipping...')
      return
    }
    
    fetchingRef.current = true
    setLoadingMessages(true)
    
    try {
      const res = await getChatMessages(customerIdToFetch)
      setMessages(res.messages || [])
      // Clear unread badge for this chat in the local state (server already marked as read)
      setChats(prev => prev.map(c =>
        c.customerId?._id === customerIdToFetch
          ? { ...c, cookUnread: 0 }
          : c
      ))
      // Notify header that a chat's unread status successfully cleared
      window.dispatchEvent(new Event('unread_cleared'))
    } catch (error) {
      console.error('Fetch messages error:', error)
      // If it's a 404 or no chat exists yet, just set empty messages (new conversation)
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        setMessages([])
      } else {
        // For other errors, still set empty messages but show toast
        setMessages([])
        toast.error('Failed to load messages')
      }
    } finally {
      // Ensure loading state is always cleared
      setLoadingMessages(false)
      fetchingRef.current = false
    }
  }, [])

  const handleSelectCustomer = useCallback((customer) => {
    if (!customer || !customer._id) {
      toast.error('Cannot open this chat')
      return
    }
    setSelectedCustomer(customer)
    setMessages([])
    // Update URL only if different
    if (customerId !== customer._id) {
      navigate(`/chats/${customer._id}`, { replace: true })
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [navigate, customerId])

  const handleBack = useCallback(() => {
    setSelectedCustomer(null)
    setMessages([])
    navigate('/chats', { replace: true })
  }, [navigate])

  // Fetch chats on mount
  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // Handle URL param for direct customer chat
  useEffect(() => {
    if (customerId && !loading) {
      // Try to find the customer in existing chats first
      const chat = chats.find(c => c.customerId?._id === customerId)
      if (chat?.customerId) {
        setSelectedCustomer(chat.customerId)
      } else if (location.state?.customerId === customerId) {
        // No existing chat — use customer info from navigation state (e.g. from OrderDetails)
        setSelectedCustomer({
          _id: location.state.customerId,
          name: location.state.customerName || 'Customer',
          email: location.state.customerEmail || ''
        })
      } else {
        // Customer ID in URL but no state - might be a direct link or refresh
        // Try to fetch anyway, the API will handle it
        setSelectedCustomer({
          _id: customerId,
          name: 'Customer',
          email: ''
        })
      }
    }
  }, [customerId, chats, loading, location.state])

  // Fetch messages when customer is selected
  useEffect(() => {
    if (selectedCustomer?._id) {
      fetchMessages(selectedCustomer._id)
    }
  }, [selectedCustomer?._id]) // Only depend on the ID, not the whole object or fetchMessages

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Socket listener for new messages
  useEffect(() => {
    const socket = getSocket()

    const handleNewMessage = (data) => {
      const incomingCustomerId = data.customerId?.toString()

      // If we're in the chat with this customer, add the message
      if (selectedCustomer && incomingCustomerId === selectedCustomer._id?.toString()) {
        setMessages(prev => [...prev, data.message])
      }

      // Update chat list
      const isActiveChat = selectedCustomer && incomingCustomerId === selectedCustomer._id?.toString()
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.customerId?._id?.toString() === incomingCustomerId)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: {
              content: data.message.content,
              senderType: data.message.senderType,
              createdAt: data.message.createdAt
            },
            // Don't show unread badge if cook is currently viewing this chat
            cookUnread: isActiveChat ? 0 : data.cookUnread
          }
          return updated.sort((a, b) =>
            new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
          )
        }
        // New chat - refresh the list
        fetchChats()
        return prev
      })
    }

    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [selectedCustomer, fetchChats])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCustomer || sendingMessage) return

    const content = newMessage.trim()
    setNewMessage('')
    setSendingMessage(true)

    // Optimistic update
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      senderId: cook._id,
      senderType: 'Cook',
      content,
      createdAt: new Date().toISOString(),
      read: false
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessageApi(selectedCustomer._id, content)

      // Replace temp message with real one
      setMessages(prev =>
        prev.map(m => m._id === tempMessage._id ? res.message : m)
      )

      // Update chat list
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.customerId?._id === selectedCustomer._id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: {
              content,
              senderType: 'Cook',
              createdAt: new Date().toISOString()
            }
          }
          return updated
        }
        return prev
      })
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id))
      setNewMessage(content)
      toast.error(error.response?.data?.message || 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const getFilteredChats = () => {
    if (!searchQuery.trim()) return chats
    const q = searchQuery.toLowerCase()
    return chats.filter(chat =>
      chat.customerId?.name?.toLowerCase().includes(q) ||
      chat.lastMessage?.content?.toLowerCase().includes(q)
    )
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut />

      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h1>
            <p className="mt-1 text-sm text-gray-600">Chat with customers about their orders</p>
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader size="lg" />
                <p className="text-sm font-medium text-gray-600">Loading chats...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)] min-h-[500px] flex">
              {/* Customer List - Hidden on mobile when chat is selected */}
              <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiMessageCircle className="w-5 h-5 text-orange-500" />
                    Customer Chats
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Messages from customers</p>
                  {/* Search */}
                  <div className="relative mt-3">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search customers..."
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {chats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FiInbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No messages yet</p>
                      <p className="text-sm mt-1">When customers message you, they'll appear here</p>
                    </div>
                  ) : getFilteredChats().length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FiSearch className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No results found</p>
                      <button onClick={() => setSearchQuery('')} className="mt-2 text-sm text-orange-500 hover:underline">
                        Clear search
                      </button>
                    </div>
                  ) : (
                  getFilteredChats().map(chat => (
                    <button
                      key={chat._id}
                      onClick={() => handleSelectCustomer(chat.customerId)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${selectedCustomer?._id === chat.customerId?._id ? 'bg-orange-50' : ''
                        }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {chat.customerId?.name?.charAt(0).toUpperCase() || <FiUser />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {chat.customerId?.name || 'Customer'}
                          </h3>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {chat.lastMessage.senderType === 'Cook' && 'You: '}
                            {chat.lastMessage.content}
                          </p>
                        )}
                        {chat.cookUnread > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full mt-1">
                            {chat.cookUnread}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
              {selectedCustomer ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                      <button
                        onClick={handleBack}
                        className="md:hidden p-2 -ml-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FiArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {selectedCustomer.name?.charAt(0).toUpperCase() || <FiUser />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedCustomer.name}</h3>
                        <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {loadingMessages ? (
                        <div className="flex justify-center py-8">
                          <Loader />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <FiMessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm">The conversation will appear here</p>
                        </div>
                      ) : (
                        messages.map((msg, index) => {
                        const isCook = msg.senderType === 'Cook'
                        const showName = index === 0 || messages[index - 1]?.senderType !== msg.senderType

                          return (
                            <div
                              key={msg._id || index}
                              className={`flex ${isCook ? 'justify-end' : 'justify-start'} items-end gap-2`}
                            >
                            {/* Customer Avatar - shown on left for customer messages */}
                            {!isCook && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mb-1">
                                {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                            )}

                            <div className={`flex flex-col ${isCook ? 'items-end' : 'items-start'} max-w-[75%]`}>
                              {/* Sender Name */}
                              {showName && (
                                <span className="text-xs font-medium text-gray-500 mb-1 px-2">
                                  {isCook ? 'You' : selectedCustomer.name}
                                </span>
                              )}

                              {/* Message Bubble */}
                              <div
                                className={`px-4 py-2 rounded-2xl ${isCook
                                  ? 'bg-orange-500 text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                  }`}
                              >
                                <p className="break-words">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isCook ? 'text-orange-100' : 'text-gray-400'}`}>
                                  {formatTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>

                            {/* Cook Avatar - shown on right for cook messages */}
                            {isCook && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mb-1">
                                {cook?.name?.charAt(0).toUpperCase() || 'Y'}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        disabled={sendingMessage}
                        maxLength={1000}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        <FiSend className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FiInbox className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-medium">Select a conversation</p>
                    <p className="text-sm text-gray-400 mt-1">Choose from the customer list</p>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Chats
