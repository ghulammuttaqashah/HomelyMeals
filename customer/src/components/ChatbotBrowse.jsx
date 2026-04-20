import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMessageCircle, FiX, FiHome } from 'react-icons/fi'
import { getTopSellingByPeriod } from '../api/chatbotMeals'

const ChatbotBrowse = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)
  
  // Navigation state
  const [currentView, setCurrentView] = useState('main') // main, browse, topSelling

  // Check if user is logged in
  const isLoggedIn = () => {
    return !!localStorage.getItem('token')
  }

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with main menu
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showMainMenu()
    }
  }, [isOpen])

  // ============================================
  // MESSAGE HELPERS
  // ============================================
  
  const addMessage = (sender, text, buttons = [], data = null) => {
    const message = {
      sender,
      text,
      buttons,
      data,
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
      text: '',
      buttons: [
        { label: 'Browse Meals', action: 'browse_meals' }
      ],
      timestamp: new Date()
    }])
  }

  // ============================================
  // BROWSE MEALS MENU
  // ============================================
  
  const showBrowseMealsMenu = () => {
    setCurrentView('browse')
    addMessage('user', 'Browse Meals')
    addMessage('bot', '', [
      { label: 'All Meals', action: 'all_meals' },
      { label: 'Top Selling Meals', action: 'top_selling_menu' },
      { label: 'Back', action: 'main_menu' }
    ])
  }

  // ============================================
  // ALL MEALS
  // ============================================
  
  const handleAllMeals = () => {
    addMessage('user', 'All Meals')
    
    if (isLoggedIn()) {
      // Redirect to dashboard
      addMessage('bot', 'Redirecting to dashboard...', [])
      setTimeout(() => {
        navigate('/dashboard')
        setIsOpen(false)
      }, 300)
    } else {
      // Redirect to landing page
      addMessage('bot', 'Redirecting to meals...', [])
      setTimeout(() => {
        navigate('/')
        setIsOpen(false)
      }, 300)
    }
  }

  // ============================================
  // TOP SELLING MENU
  // ============================================
  
  const showTopSellingMenu = () => {
    setCurrentView('topSelling')
    addMessage('user', 'Top Selling Meals')
    addMessage('bot', '', [
      { label: 'Today\'s Top Selling', action: 'top_selling', period: 'today', limit: 3 },
      { label: 'This Week\'s Top Selling', action: 'top_selling', period: 'week', limit: 5 },
      { label: 'This Month\'s Top Selling', action: 'top_selling', period: 'month', limit: 7 },
      { label: 'Overall Top Selling', action: 'top_selling', period: 'overall', limit: 10 },
      { label: 'Back', action: 'browse_meals' }
    ])
  }

  // ============================================
  // TOP SELLING BY PERIOD
  // ============================================
  
  const showTopSellingByPeriod = async (period, limit) => {
    const periodLabels = {
      today: 'Today\'s Top Selling',
      week: 'This Week\'s Top Selling',
      month: 'This Month\'s Top Selling',
      overall: 'Overall Top Selling'
    }
    
    const periodLabel = periodLabels[period]
    addMessage('user', periodLabel)
    setIsLoading(true)
    
    try {
      const result = await getTopSellingByPeriod(period, limit)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addMessage('bot', 'No data available for this period.', [
          { label: 'Back', action: 'top_selling_menu' }
        ])
        return
      }

      // Display meals as cards
      addMessage('bot', '', [], result.meals)
      
      // Add back button
      addMessage('bot', '', [
        { label: 'Back', action: 'top_selling_menu' }
      ])
      
    } catch (error) {
      console.error('Top selling error:', error)
      addMessage('bot', 'Failed to load data. Please try again.', [
        { label: 'Back', action: 'top_selling_menu' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // BUTTON CLICK HANDLER
  // ============================================
  
  const handleButtonClick = async (button) => {
    const { action, period, limit } = button
    
    setIsLoading(true)
    
    try {
      switch (action) {
        case 'main_menu':
          showMainMenu()
          break
          
        case 'browse_meals':
          showBrowseMealsMenu()
          break
          
        case 'all_meals':
          handleAllMeals()
          break
          
        case 'top_selling_menu':
          showTopSellingMenu()
          break
          
        case 'top_selling':
          await showTopSellingByPeriod(period, limit)
          break
          
        default:
          addMessage('bot', 'Invalid action.', [
            { label: 'Back', action: 'main_menu' }
          ])
      }
    } catch (error) {
      console.error('Button action error:', error)
      addMessage('bot', 'Something went wrong.', [
        { label: 'Back', action: 'main_menu' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // MEAL CARD COMPONENT
  // ============================================
  
  const MealCard = ({ meal, index }) => {
    const handleClick = () => {
      navigate(`/cook/${meal.cookId}`)
      setIsOpen(false)
    }

    return (
      <div 
        onClick={handleClick}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-orange-400 transform hover:scale-[1.02] mb-3"
      >
        <div className="flex gap-3 p-3">
          {/* Meal Image */}
          <div className="flex-shrink-0">
            {meal.itemImage ? (
              <img 
                src={meal.itemImage} 
                alt={meal.mealName}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Meal Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-800 text-sm">
                {index + 1}. {meal.mealName}
              </h4>
              <span className="text-orange-600 font-bold text-sm whitespace-nowrap">
                Rs {meal.price}
              </span>
            </div>

            {/* Cook Name */}
            {meal.cookName && (
              <p className="text-xs text-gray-600 mt-1 truncate">
                👨‍🍳 {meal.cookName}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              {meal.averageRating > 0 && (
                <span className="flex items-center gap-1 text-yellow-600 font-medium">
                  ⭐ {meal.averageRating}
                </span>
              )}
              {meal.totalQuantity > 0 && (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  🔥 {meal.totalQuantity} sold
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
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
        <div className="fixed bottom-6 right-6 w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
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
                <p className="text-xs text-orange-100">Browse Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {currentView !== 'main' && (
                <button
                  onClick={showMainMenu}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                  title="Main Menu"
                >
                  <FiHome className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={toggleChat}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
            {messages.map((message, index) => (
              <div key={index}>
                {/* User Message */}
                {message.sender === 'user' && (
                  <div className="flex justify-end mb-3">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-none px-4 py-2 shadow-md max-w-[80%]">
                      <p className="text-sm font-medium">{message.text}</p>
                    </div>
                  </div>
                )}

                {/* Bot Message */}
                {message.sender === 'bot' && message.text && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm border border-gray-100 max-w-[80%]">
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                )}

                {/* Meal Cards */}
                {message.data && message.data.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {message.data.map((meal, idx) => (
                      <MealCard key={meal.mealId} meal={meal} index={idx} />
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                {message.buttons && message.buttons.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {message.buttons.map((button, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => handleButtonClick(button)}
                        disabled={isLoading}
                        className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Styles */}
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
          background: linear-gradient(to bottom, #fb923c, #f97316);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f97316, #ea580c);
        }
      `}</style>
    </>
  )
}

export default ChatbotBrowse
