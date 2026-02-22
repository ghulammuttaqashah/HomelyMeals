import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiSend, FiArrowLeft, FiMessageCircle, FiUser } from 'react-icons/fi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../utils/socket'
import {
  getCooksForChat,
  getChats,
  getChatMessages,
  sendMessage as sendMessageApi
} from '../api/chat'

const Chats = () => {
  const navigate = useNavigate()
  const { cookId } = useParams()
  const { customer } = useAuth()

  const [cooks, setCooks] = useState([])
  const [chats, setChats] = useState([])
  const [selectedCook, setSelectedCook] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch cooks and chats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [cooksRes, chatsRes] = await Promise.all([
          getCooksForChat(),
          getChats()
        ])
        setCooks(cooksRes.cooks || [])
        setChats(chatsRes.chats || [])
      } catch (error) {
        toast.error('Failed to load chats')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Handle URL param for direct cook chat (only on initial load)
  const initialLoadRef = useRef(true)
  useEffect(() => {
    if (initialLoadRef.current && cookId && cooks.length > 0) {
      initialLoadRef.current = false
      const cook = cooks.find(c => c._id === cookId)
      if (cook) {
        setSelectedCook(cook)
      }
    }
  }, [cookId, cooks])

  // Fetch messages when cook is selected
  useEffect(() => {
    if (selectedCook) {
      fetchMessages(selectedCook._id)
    }
  }, [selectedCook])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Socket listener for new messages
  useEffect(() => {
    const socket = getSocket()

    const handleNewMessage = (data) => {
      const incomingCookId = data.cookId?.toString()

      // If we're in the chat with this cook, add the message
      if (selectedCook && incomingCookId === selectedCook._id?.toString()) {
        setMessages(prev => [...prev, data.message])
      }

      // Update chat list
      const isActiveChat = selectedCook && incomingCookId === selectedCook._id?.toString()
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.cookId?._id?.toString() === incomingCookId)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: {
              content: data.message.content,
              senderType: data.message.senderType,
              createdAt: data.message.createdAt
            },
            // Don't show unread badge if customer is currently viewing this chat
            customerUnread: isActiveChat ? 0 : data.customerUnread
          }
          return updated.sort((a, b) =>
            new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
          )
        }
        return prev
      })
    }

    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [selectedCook])

  const fetchMessages = async (cookIdToFetch) => {
    try {
      setLoadingMessages(true)
      const res = await getChatMessages(cookIdToFetch)
      setMessages(res.messages || [])
      // Clear unread badge for this chat in the local state (server already marked as read)
      setChats(prev => prev.map(c =>
        c.cookId?._id === cookIdToFetch
          ? { ...c, customerUnread: 0 }
          : c
      ))
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectCook = (cook) => {
    setSelectedCook(cook)
    setMessages([])
    // Update URL only if different
    if (cookId !== cook._id) {
      navigate(`/chats/${cook._id}`, { replace: true })
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleBack = () => {
    setSelectedCook(null)
    setMessages([])
    navigate('/chats', { replace: true })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCook || sendingMessage) return

    const content = newMessage.trim()
    setNewMessage('')
    setSendingMessage(true)

    // Optimistic update
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      senderId: customer._id,
      senderType: 'Customer',
      content,
      createdAt: new Date().toISOString(),
      read: false
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessageApi(selectedCook._id, content)

      // Replace temp message with real one
      setMessages(prev =>
        prev.map(m => m._id === tempMessage._id ? res.message : m)
      )

      // Update chat list
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.cookId?._id === selectedCook._id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: {
              content,
              senderType: 'Customer',
              createdAt: new Date().toISOString()
            }
          }
          return updated
        }
        // New chat
        return [{
          _id: res.message._id,
          cookId: selectedCook,
          lastMessage: {
            content,
            senderType: 'Customer',
            createdAt: new Date().toISOString()
          },
          customerUnread: 0
        }, ...prev]
      })
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id))
      setNewMessage(content)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  // Get cook info for chat list item
  const getCookFromChat = (chat) => {
    return chat.cookId || cooks.find(c => c._id === chat.cookId)
  }

  // Merge cooks with existing chats for the list
  const getCooksList = () => {
    const chatsMap = new Map()
    chats.forEach(chat => {
      if (chat.cookId?._id) {
        chatsMap.set(chat.cookId._id, chat)
      }
    })

    return cooks.map(cook => ({
      ...cook,
      chat: chatsMap.get(cook._id)
    })).sort((a, b) => {
      // Sort by last message time, then by name
      const aTime = a.chat?.lastMessage?.createdAt ? new Date(a.chat.lastMessage.createdAt) : new Date(0)
      const bTime = b.chat?.lastMessage?.createdAt ? new Date(b.chat.lastMessage.createdAt) : new Date(0)
      if (aTime.getTime() !== bTime.getTime()) return bTime - aTime
      return a.name.localeCompare(b.name)
    })
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader size="lg" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <Container className="py-4 lg:py-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)] min-h-[500px] flex">
            {/* Cook List - Hidden on mobile when chat is selected */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedCook ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiMessageCircle className="w-5 h-5 text-orange-500" />
                  Chats
                </h2>
                <p className="text-sm text-gray-500 mt-1">Message any cook</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {getCooksList().length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FiMessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No cooks available</p>
                  </div>
                ) : (
                  getCooksList().map(cook => (
                    <button
                      key={cook._id}
                      onClick={() => handleSelectCook(cook)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${selectedCook?._id === cook._id ? 'bg-orange-50' : ''
                        }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {cook.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{cook.name}</h3>
                          {cook.chat?.lastMessage && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatTime(cook.chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {cook.chat?.lastMessage ? (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {cook.chat.lastMessage.senderType === 'Customer' && 'You: '}
                            {cook.chat.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 mt-0.5">Start a conversation</p>
                        )}
                        {cook.chat?.customerUnread > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full mt-1">
                            {cook.chat.customerUnread}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedCook ? 'hidden md:flex' : 'flex'}`}>
              {selectedCook ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                    <button
                      onClick={handleBack}
                      className="md:hidden p-2 -ml-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                      {selectedCook.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedCook.name}</h3>
                      <p className="text-sm text-gray-500">{selectedCook.address?.city || 'Cook'}</p>
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
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const isCustomer = msg.senderType === 'Customer'
                        const showName = index === 0 || messages[index - 1]?.senderType !== msg.senderType

                        return (
                          <div
                            key={msg._id || index}
                            className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} items-end gap-2`}
                          >
                            {/* Cook Avatar - shown on left for cook messages */}
                            {!isCustomer && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mb-1">
                                {selectedCook.name?.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} max-w-[75%]`}>
                              {/* Sender Name */}
                              {showName && (
                                <span className="text-xs font-medium text-gray-500 mb-1 px-2">
                                  {isCustomer ? 'You' : selectedCook.name}
                                </span>
                              )}

                              {/* Message Bubble */}
                              <div
                                className={`px-4 py-2 rounded-2xl ${isCustomer
                                  ? 'bg-blue-500 text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                  }`}
                              >
                                <p className="break-words">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isCustomer ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {formatTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>

                            {/* Customer Avatar - shown on right for customer messages */}
                            {isCustomer && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mb-1">
                                {customer?.name?.charAt(0).toUpperCase() || 'Y'}
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
                    <FiMessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-medium">Select a cook to start chatting</p>
                    <p className="text-sm text-gray-400 mt-1">Choose from the list on the left</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  )
}

export default Chats
