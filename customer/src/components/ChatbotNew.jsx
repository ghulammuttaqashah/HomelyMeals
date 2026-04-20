import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMessageCircle, FiX, FiSend, FiHome } from 'react-icons/fi'
import { 
  getAllMealsForChatbot, 
  getTopSellingByPeriod, 
  getTopRatedMealsForChatbot 
} from '../api/chatbotMeals'

const ChatbotNew = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)
  
  // Navigation state
  const [currentView, setCurrentView] = useState('main') // main, browse, topSelling

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with main menu when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showMainMenu()
    }
  }, [isOpen])

  // ============================================
  // MESSAGE HELPERS
  // ============================================
  
  const addMessage = (sender, text, buttons = []) => {
    const message = {
      sender,
      text,
      buttons,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  // ============================================
  // MAIN MENU
  // ============================================
  
  const showMainMenu = () => {
    setCurrentView('main')
    setMessages([{
      sender: 'bot',
      text: '🏠 Welcome to Homely Meals!\n\nYour food ordering assistant. Choose an option:',
      buttons: [
        { label: '🍽️ Browse Meals', action: 'browse_meals' }
      ],
      timestamp: new Date()
    }])
  }

  // ============================================
  // BROWSE MEALS MENU
  // ============================================
  
  const showBrowseMealsMenu = () => {
    setCurrentView('browse')
    addMessage('user', '🍽️ Browse Meals')
    addMessage('bot', '🍽️ Browse Meals\n\nChoose an option:', [
      { label: '📋 All Meals', action: 'all_meals' },
      { label: '🔥 Top Selling Meals', action: 'top_selling_menu' },
      { label: '🏠 Back to Main Menu', action: 'main_menu' }
    ])
  }

  // ============================================
  // ALL MEALS
  // ============================================
  
  const showAllMeals = async () => {
    addMessage('user', '📋 All Meals')
    setIsTyping(true)
    
    try {
      const result = await getAllMealsForChatbot()
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addMessage('bot', '📋 All Meals\n\nNo meals available at the moment. Please check back later!', [
          { label: '🔙 Back', action: 'browse_meals' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ])
        return
      }

      addMessage('bot', `📋 All Meals (${result.total} available)\n\nClick on any meal to view details:`, [])
      
      // Display meals as clickable cards
      result.meals.forEach((meal, index) => {
        const stars = meal.cookRating > 0 ? '⭐'.repeat(Math.round(meal.cookRating)) : ''
        let mealText = `${index + 1}. ${meal.name}\n`
        mealText += `Rs ${meal.price}`
        if (meal.category) mealText += ` • ${meal.category}`
        if (meal.cookName) mealText += `\n👨‍🍳 ${meal.cookName}`
        if (stars) mealText += ` ${stars}`
        
        addMessage('bot', mealText, [
          { label: '🍽️ View Details', action: 'view_meal', cookId: meal.cookId }
        ])
      })
      
      // Navigation buttons at the end
      addMessage('bot', 'Browse more options:', [
        { label: '🔥 Top Selling', action: 'top_selling_menu' },
        { label: '🔙 Back', action: 'browse_meals' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
      
    } catch (error) {
      console.error('All meals error:', error)
      addMessage('bot', 'Sorry, couldn\'t load meals. Please try again!', [
        { label: '🔙 Back', action: 'browse_meals' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // ============================================
  // TOP SELLING MENU
  // ============================================
  
  const showTopSellingMenu = () => {
    setCurrentView('topSelling')
    addMessage('user', '🔥 Top Selling Meals')
    addMessage('bot', '🔥 Top Selling Meals\n\nSelect time period:', [
      { label: '📅 Today\'s Top Selling', action: 'top_selling', period: 'today', limit: 5 },
      { label: '📆 This Week\'s Top Selling', action: 'top_selling', period: 'week', limit: 7 },
      { label: '📊 This Month\'s Top Selling', action: 'top_selling', period: 'month', limit: 10 },
      { label: '🏆 Overall Top Selling', action: 'top_selling', period: 'overall', limit: 10 },
      { label: '⭐ Top Rated Meals', action: 'top_rated' },
      { label: '🔙 Back', action: 'browse_meals' },
      { label: '🏠 Main Menu', action: 'main_menu' }
    ])
  }

  // ============================================
  // TOP SELLING BY PERIOD
  // ============================================
  
  const showTopSellingByPeriod = async (period, limit) => {
    const periodLabels = {
      today: 'Today\'s',
      week: 'This Week\'s',
      month: 'This Month\'s',
      overall: 'Overall'
    }
    
    const periodLabel = periodLabels[period] || 'Top'
    addMessage('user', `📊 ${periodLabel} Top Selling`)
    setIsTyping(true)
    
    try {
      const result = await getTopSellingByPeriod(period, limit)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addMessage('bot', `📊 ${periodLabel} Top Selling\n\nNo order data available for this period yet!`, [
          { label: '🔙 Back to Top Selling', action: 'top_selling_menu' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ])
        return
      }

      addMessage('bot', `📊 ${periodLabel} Top Selling (${result.total} meals)\n\nBased on real order data:`, [])
      
      // Display top selling meals
      result.meals.forEach((meal, index) => {
        const stars = meal.averageRating > 0 ? '⭐'.repeat(Math.round(meal.averageRating)) : ''
        let mealText = `${index + 1}. ${meal.mealName}\n`
        mealText += `Rs ${meal.price} • ${meal.totalQuantity} sold`
        if (meal.averageRating > 0) mealText += ` • ${stars} ${meal.averageRating}`
        if (meal.cookName) mealText += `\n👨‍🍳 ${meal.cookName}`
        
        addMessage('bot', mealText, [
          { label: '🍽️ View Details', action: 'view_meal', cookId: meal.cookId }
        ])
      })
      
      // Navigation buttons
      addMessage('bot', 'Browse more options:', [
        { label: '📋 All Meals', action: 'all_meals' },
        { label: '⭐ Top Rated', action: 'top_rated' },
        { label: '🔙 Back to Top Selling', action: 'top_selling_menu' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
      
    } catch (error) {
      console.error('Top selling error:', error)
      addMessage('bot', 'Sorry, couldn\'t load top selling data. Please try again!', [
        { label: '🔙 Back', action: 'top_selling_menu' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // ============================================
  // TOP RATED MEALS
  // ============================================
  
  const showTopRatedMeals = async () => {
    addMessage('user', '⭐ Top Rated Meals')
    setIsTyping(true)
    
    try {
      const result = await getTopRatedMealsForChatbot(10)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addMessage('bot', '⭐ Top Rated Meals\n\nNo rated meals available yet. Be the first to order and review!', [
          { label: '📋 Browse All Meals', action: 'all_meals' },
          { label: '🔙 Back', action: 'top_selling_menu' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ])
        return
      }

      addMessage('bot', `⭐ Top Rated Meals (${result.total} meals)\n\nHighest rated dishes:`, [])
      
      // Display top rated meals
      result.meals.forEach((meal, index) => {
        const stars = '⭐'.repeat(Math.round(meal.averageRating))
        let mealText = `${index + 1}. ${meal.mealName}\n`
        mealText += `Rs ${meal.price} • ${stars} ${meal.averageRating}`
        if (meal.reviewCount) mealText += ` (${meal.reviewCount} reviews)`
        if (meal.orderCount > 0) mealText += ` • ${meal.orderCount} orders`
        if (meal.cookName) mealText += `\n👨‍🍳 ${meal.cookName}`
        
        addMessage('bot', mealText, [
          { label: '🍽️ View Details', action: 'view_meal', cookId: meal.cookId }
        ])
      })
      
      // Navigation buttons
      addMessage('bot', 'Browse more options:', [
        { label: '📋 All Meals', action: 'all_meals' },
        { label: '🔥 Top Selling', action: 'top_selling_menu' },
        { label: '🔙 Back', action: 'top_selling_menu' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
      
    } catch (error) {
      console.error('Top rated error:', error)
      addMessage('bot', 'Sorry, couldn\'t load top rated meals. Please try again!', [
        { label: '🔙 Back', action: 'top_selling_menu' },
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // ============================================
  // BUTTON CLICK HANDLER
  // ============================================
  
  const handleButtonClick = async (button) => {
    const { action, period, limit, cookId } = button
    
    setIsTyping(true)
    
    try {
      switch (action) {
        case 'main_menu':
          showMainMenu()
          break
          
        case 'browse_meals':
          showBrowseMealsMenu()
          break
          
        case 'all_meals':
          await showAllMeals()
          break
          
        case 'top_selling_menu':
          showTopSellingMenu()
          break
          
        case 'top_selling':
          await showTopSellingByPeriod(period, limit)
          break
          
        case 'top_rated':
          await showTopRatedMeals()
          break
          
        case 'view_meal':
          if (cookId) {
            addMessage('bot', 'Taking you to meal details... 🍽️', [])
            setTimeout(() => {
              navigate(`/cook/${cookId}`)
              setIsOpen(false)
            }, 500)
          }
          break
          
        default:
          addMessage('bot', 'Sorry, I didn\'t understand that action.', [
            { label: '🏠 Main Menu', action: 'main_menu' }
          ])
      }
    } catch (error) {
      console.error('Button action error:', error)
      addMessage('bot', 'Sorry, something went wrong. Please try again!', [
        { label: '🏠 Main Menu', action: 'main_menu' }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full w-16 h-16 shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 z-50 flex items-center justify-center group"
          aria-label="Open chat"
        >
          <FiMessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform duration-200" />
          <span className="absolute inset-0 rounded-full bg-orange-500 opacity-75 animate-ping" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <FiMessageCircle className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Homely Meals</h3>
                <p className="text-xs text-orange-100">Browse Meals Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {currentView !== 'main' && (
                <button
                  onClick={showMainMenu}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                  aria-label="Back to menu"
                  title="Main Menu"
                >
                  <FiHome className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={toggleChat}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                aria-label="Close chat"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-orange-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                  </div>

                  {/* Action Buttons */}
                  {message.buttons && message.buttons.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.buttons.map((button, btnIndex) => (
                        <button
                          key={btnIndex}
                          onClick={() => handleButtonClick(button)}
                          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg"
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-right text-gray-500' : 'text-left text-gray-400'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </>
  )
}

export default ChatbotNew

