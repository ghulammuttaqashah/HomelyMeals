import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMessageCircle, FiX, FiHome, FiSend } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { 
  getTopSellingByPeriod, 
  sendAdvancedChatMessage, 
  sendFeatureSearchMessage, 
  getUniqueMealTypes,
  getTopRatedCooks,
  getTopSellingCooks,
  getBestCooksByTopItems,
  getPersonalizedRecommendations,
  getSmartFoodAdvice,
  getHealthBasedMeals,
  compareMeals,
  getHealthTags
} from '../api/chatbotMeals'
import { getOrders } from '../api/orders'

const ChatbotFinal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([]) // Only user/bot text messages
  const [activeMenu, setActiveMenu] = useState(null) // Current menu state (buttons/cards)
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Navigation state
  const [currentView, setCurrentView] = useState('main')
  const [selectedItem, setSelectedItem] = useState(null)
  const [chatEnabled, setChatEnabled] = useState(true) // Always enabled now
  
  // Dropdown state
  const [mealTypes, setMealTypes] = useState([])
  const [selectedDropdownItem, setSelectedDropdownItem] = useState('')
  const [searchInputValue, setSearchInputValue] = useState('') // New search input state
  
  // Advanced recommendation state
  const [healthTags, setHealthTags] = useState([])
  const [selectedHealthTags, setSelectedHealthTags] = useState([])
  const [smartAdvisorQuery, setSmartAdvisorQuery] = useState('')
  const [mealsForComparison, setMealsForComparison] = useState([])
  const [selectedMealsToCompare, setSelectedMealsToCompare] = useState([])
  const [comparisonResult, setComparisonResult] = useState(null)

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, activeMenu])

  // Close chatbot when route changes (user navigates to different page)
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Initialize with main menu
  useEffect(() => {
    if (isOpen && !activeMenu) {
      showMainMenu()
    }
  }, [isOpen])

  // Load meal types when needed
  useEffect(() => {
    if (currentView === 'itemOptions') {
      loadMealTypes()
    }
  }, [currentView])

  // Focus input when chat is enabled
  useEffect(() => {
    if (chatEnabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [chatEnabled])
  
  // Load unique meal types from database
  const loadMealTypes = async () => {
    try {
      const result = await getUniqueMealTypes()
      if (result.success && result.types) {
        setMealTypes(result.types)
      }
    } catch (error) {
      console.error('Failed to load meal types:', error)
    }
  }

  // ============================================
  // MESSAGE HELPERS
  // ============================================
  
  // Add chat message (user/bot conversation)
  const addChatMessage = (sender, text) => {
    const message = {
      sender,
      text,
      timestamp: new Date()
    }
    setChatHistory(prev => [...prev, message])
  }

  // Set active menu (REPLACES previous menu, no duplication)
  const setMenu = (menuData) => {
    setActiveMenu(menuData)
  }

  // ============================================
  // MAIN MENU
  // ============================================
  
  const showMainMenu = () => {
    setCurrentView('main')
    setChatEnabled(true) // Enable chat globally
    setSelectedItem(null)
    setChatHistory([]) // Clear chat history on main menu
    setMenu({
      type: 'buttons',
      buttons: [
        { label: '🍽️ Browse Meals', action: 'browse_meals' },
        { label: '👨‍🍳 Browse Cooks', action: 'browse_cooks' },
        { label: '🧠 Recommended For You', action: 'show_recommendations' },
        { label: '📦 Track Order', action: 'track_order' },
        { label: '📝 File Complaint', action: 'file_complaint' }
      ]
    })
  }

  // ============================================
  // TRACK ORDER - INTELLIGENT FLOW
  // ============================================
  
  const handleTrackOrder = async () => {
    addChatMessage('user', '📦 Track Order')
    setIsLoading(true)
    
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        addChatMessage('bot', 'Please log in to track your orders.')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'main_menu' }
          ]
        })
        setIsLoading(false)
        return
      }

      // Fetch user orders from real API
      const ordersData = await getOrders()
      
      // Check if response has orders array
      if (!ordersData.orders || ordersData.orders.length === 0) {
        addChatMessage('bot', "You don't have any orders yet. Browse meals and place your first order!")
        setMenu({
          type: 'buttons',
          buttons: [
            { label: '🍽️ Browse Meals', action: 'browse_meals' },
            { label: 'Back', action: 'main_menu' }
          ]
        })
        setIsLoading(false)
        return
      }

      // Check for active orders (confirmed, preparing, out_for_delivery)
      const activeStatuses = ['confirmed', 'preparing', 'out_for_delivery']
      const activeOrders = ordersData.orders.filter(order => 
        order.status && activeStatuses.includes(order.status.toLowerCase())
      )

      if (activeOrders.length > 0) {
        // Has active orders - navigate to orders page
        addChatMessage('bot', `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. Taking you to order tracking...`)
        
        setTimeout(() => {
          navigate('/orders')
          setIsOpen(false)
        }, 800)
      } else {
        // No active orders, but has past orders
        addChatMessage('bot', "You don't have any active orders right now. Your previous orders are completed or cancelled.")
        setMenu({
          type: 'buttons',
          buttons: [
            { label: '🍽️ Browse Meals', action: 'browse_meals' },
            { label: 'View Order History', action: 'view_order_history' },
            { label: 'Back', action: 'main_menu' }
          ]
        })
      }
      
    } catch (error) {
      console.error('Track order error:', error)
      addChatMessage('bot', 'Unable to check your orders right now. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'main_menu' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // FILE COMPLAINT - INTELLIGENT FLOW
  // ============================================
  
  const handleFileComplaint = async () => {
    addChatMessage('user', '📝 File Complaint')
    setIsLoading(true)
    
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        addChatMessage('bot', 'Please log in to file a complaint.')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'main_menu' }
          ]
        })
        setIsLoading(false)
        return
      }

      // Fetch user orders from real API
      const ordersData = await getOrders()
      
      // Check if response has orders array
      if (!ordersData.orders || ordersData.orders.length === 0) {
        addChatMessage('bot', "You can file a complaint after placing an order. Browse meals to get started!")
        setMenu({
          type: 'buttons',
          buttons: [
            { label: '🍽️ Browse Meals', action: 'browse_meals' },
            { label: 'Back', action: 'main_menu' }
          ]
        })
        setIsLoading(false)
        return
      }

      // User has orders - navigate directly to complaint page
      navigate('/complaints')
      setIsOpen(false)
      
    } catch (error) {
      console.error('File complaint error:', error)
      addChatMessage('bot', 'Unable to process your request right now. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'main_menu' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // VIEW ORDER HISTORY
  // ============================================
  
  const handleViewOrderHistory = () => {
    addChatMessage('user', 'View Order History')
    addChatMessage('bot', 'Taking you to your order history...')
    
    setTimeout(() => {
      navigate('/orders')
      setIsOpen(false)
    }, 500)
  }

  // ============================================
  // BROWSE MEALS MENU
  // ============================================
  
  const showBrowseMealsMenu = () => {
    setCurrentView('browse')
    setChatEnabled(true) // Enable chat globally
    setSelectedItem(null)
    addChatMessage('user', 'Browse Meals')
    setMenu({
      type: 'buttons',
      buttons: [
        { label: 'All Meals', action: 'all_meals' },
        { label: 'Top Selling Meals', action: 'top_selling_menu' },
        { label: 'Back', action: 'main_menu' }
      ]
    })
  }

  // ============================================
  // ALL MEALS
  // ============================================
  
  const handleAllMeals = () => {
    addChatMessage('user', 'All Meals')
    
    if (isAuthenticated) {
      addChatMessage('bot', 'Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/dashboard')
        setIsOpen(false)
      }, 300)
    } else {
      addChatMessage('bot', 'Redirecting to meals...')
      setTimeout(() => {
        navigate('/')
        setIsOpen(false)
      }, 300)
    }
  }

  // ============================================
  // BROWSE COOKS MENU
  // ============================================
  
  const showBrowseCooksMenu = () => {
    setCurrentView('browseCooks')
    setChatEnabled(true)
    setSelectedItem(null)
    addChatMessage('user', '👨‍🍳 Browse Cooks')
    setMenu({
      type: 'buttons',
      buttons: [
        { label: '⭐ Top Rated Cooks', action: 'top_rated_cooks' },
        { label: '🔥 Top Selling Cooks', action: 'top_selling_cooks' },
        { label: '🍽️ Top Selling Items → Best Cooks', action: 'cooks_by_items' },
        { label: 'Back', action: 'main_menu' }
      ]
    })
  }

  // ============================================
  // TOP RATED COOKS
  // ============================================
  
  const showTopRatedCooks = async () => {
    addChatMessage('user', '⭐ Top Rated Cooks')
    setIsLoading(true)
    
    try {
      const result = await getTopRatedCooks(7)
      
      if (!result.success || !result.cooks || result.cooks.length === 0) {
        addChatMessage('bot', 'No cooks available right now 😔')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'browse_cooks' }
          ]
        })
        return
      }

      addChatMessage('bot', `Here are the top-rated cooks based on customer reviews 👇`)
      
      setMenu({
        type: 'cook-cards',
        data: result.cooks,
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
      
    } catch (error) {
      console.error('Top rated cooks error:', error)
      addChatMessage('bot', 'Failed to load cooks. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // TOP SELLING COOKS
  // ============================================
  
  const showTopSellingCooks = async () => {
    addChatMessage('user', '🔥 Top Selling Cooks')
    setIsLoading(true)
    
    try {
      const result = await getTopSellingCooks(7)
      
      if (!result.success || !result.cooks || result.cooks.length === 0) {
        addChatMessage('bot', 'No cooks available right now 😔')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'browse_cooks' }
          ]
        })
        return
      }

      addChatMessage('bot', `Here are the top-selling cooks by total orders 👇`)
      
      setMenu({
        type: 'cook-cards',
        data: result.cooks,
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
      
    } catch (error) {
      console.error('Top selling cooks error:', error)
      addChatMessage('bot', 'Failed to load cooks. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // COOKS BY TOP ITEMS
  // ============================================
  
  const showCooksByTopItems = async () => {
    addChatMessage('user', '🍽️ Top Selling Items → Best Cooks')
    setIsLoading(true)
    
    try {
      const result = await getBestCooksByTopItems(3)
      
      if (!result.success || !result.items || result.items.length === 0) {
        addChatMessage('bot', 'No data available right now 😔')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'browse_cooks' }
          ]
        })
        return
      }

      addChatMessage('bot', `Here are the best cooks for top-selling items 👇`)
      
      setMenu({
        type: 'cooks-by-items',
        data: result.items,
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
      
    } catch (error) {
      console.error('Cooks by items error:', error)
      addChatMessage('bot', 'Failed to load data. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'browse_cooks' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // RECOMMENDED FOR YOU - MAIN MENU
  // ============================================
  
  const showRecommendations = async () => {
    setCurrentView('recommendations')
    setChatEnabled(true)
    setSelectedItem(null)
    addChatMessage('user', '🧠 Recommended For You')
    addChatMessage('bot', 'Choose your recommendation type:')
    
    setMenu({
      type: 'buttons',
      buttons: [
        { label: '🎯 Personalized Meals', action: 'personalized_meals' },
        { label: '🧠 Smart Food Advisor', action: 'smart_advisor' },
        { label: '❤️ Health-Based Meals', action: 'health_meals' },
        { label: '⚖️ Compare Meals', action: 'compare_meals' },
        { label: 'Back', action: 'main_menu' }
      ]
    })
  }

  // ============================================
  // PERSONALIZED MEALS
  // ============================================
  
  const showPersonalizedMeals = async () => {
    addChatMessage('user', '🎯 Personalized Meals')
    setIsLoading(true)
    
    try {
      const result = await getPersonalizedRecommendations(10)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addChatMessage('bot', 'No recommendations available right now 😔')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'show_recommendations' }
          ]
        })
        return
      }

      // Show personalized or fallback message
      if (result.personalized) {
        addChatMessage('bot', 'Based on your taste, here are some meals you might like 👇')
      } else {
        addChatMessage('bot', 'Here are some popular meals you might enjoy 👇')
      }
      
      setMenu({
        type: 'cards',
        data: result.meals,
        buttons: [
          { label: 'Back', action: 'show_recommendations' }
        ]
      })
      
    } catch (error) {
      console.error('Personalized meals error:', error)
      addChatMessage('bot', 'Failed to load recommendations. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'show_recommendations' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // SMART FOOD ADVISOR
  // ============================================
  
  const showSmartAdvisor = () => {
    setCurrentView('smartAdvisor')
    setChatEnabled(true)
    setSmartAdvisorQuery('')
    addChatMessage('user', '🧠 Smart Food Advisor')
    addChatMessage('bot', 'Tell me what you need! Examples:\n• "I have fever"\n• "Cheap food under 200"\n• "High protein meals"\n• "What should I eat for energy?"')
    
    setMenu({
      type: 'smart-advisor-input',
      showInput: true
    })
  }

  const handleSmartAdvisorSubmit = async () => {
    if (smartAdvisorQuery.trim() === '') return
    
    const query = smartAdvisorQuery.trim()
    addChatMessage('user', query)
    setSmartAdvisorQuery('')
    setIsLoading(true)
    
    try {
      const result = await getSmartFoodAdvice(query)
      
      if (!result.success) {
        addChatMessage('bot', 'Sorry, I couldn\'t process that. Try rephrasing!')
        setMenu({
          type: 'smart-advisor-input',
          showInput: true
        })
        return
      }

      // Show AI guidance
      addChatMessage('bot', result.guidance)
      
      if (result.noResults) {
        // No results found - show input again
        setMenu({
          type: 'smart-advisor-input',
          showInput: true
        })
      } else if (result.meals && result.meals.length > 0) {
        setMenu({
          type: 'cards',
          data: result.meals,
          buttons: [
            { label: 'Ask Another Question', action: 'smart_advisor' },
            { label: 'Back', action: 'show_recommendations' }
          ]
        })
      } else {
        setMenu({
          type: 'smart-advisor-input',
          showInput: true
        })
      }
      
    } catch (error) {
      console.error('Smart advisor error:', error)
      addChatMessage('bot', 'Failed to process your request. Please try again.')
      setMenu({
        type: 'smart-advisor-input',
        showInput: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // HEALTH-BASED MEALS
  // ============================================
  
  const showHealthMeals = async () => {
    setCurrentView('healthMeals')
    setChatEnabled(true)
    setSelectedHealthTags([])
    addChatMessage('user', '❤️ Health-Based Meals')
    setIsLoading(true)
    
    try {
      const result = await getHealthTags()
      
      if (result.success && result.tags) {
        setHealthTags(result.tags)
        addChatMessage('bot', 'Select health preferences (you can select multiple):')
        
        setMenu({
          type: 'health-tags',
          tags: result.tags,
          showTags: true
        })
      }
    } catch (error) {
      console.error('Health tags error:', error)
      addChatMessage('bot', 'Failed to load health options.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'show_recommendations' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleHealthTagToggle = (tagValue) => {
    setSelectedHealthTags(prev => {
      if (prev.includes(tagValue)) {
        return prev.filter(t => t !== tagValue)
      } else {
        return [...prev, tagValue]
      }
    })
  }

  const handleHealthMealsSearch = async () => {
    if (selectedHealthTags.length === 0) {
      addChatMessage('bot', 'Please select at least one health preference.')
      return
    }

    const tagsString = selectedHealthTags.join(', ')
    addChatMessage('user', `Search meals with: ${tagsString}`)
    setIsLoading(true)
    
    try {
      const result = await getHealthBasedMeals(selectedHealthTags.join(','), 10)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addChatMessage('bot', 'No meals found with these health tags. Try different tags.')
        setMenu({
          type: 'health-tags',
          tags: healthTags,
          showTags: true
        })
        return
      }

      // Show fallback message if not exact match
      if (result.message) {
        addChatMessage('bot', result.message)
      }

      addChatMessage('bot', `Found ${result.meals.length} meals matching your health preferences 👇`)
      
      setMenu({
        type: 'cards',
        data: result.meals,
        buttons: [
          { label: 'Search Again', action: 'health_meals' },
          { label: 'Back', action: 'show_recommendations' }
        ]
      })
      
    } catch (error) {
      console.error('Health meals search error:', error)
      addChatMessage('bot', 'Failed to search meals. Please try again.')
      setMenu({
        type: 'health-tags',
        tags: healthTags,
        showTags: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // COMPARE MEALS
  // ============================================
  
  const showCompareMeals = async () => {
    setCurrentView('compareMeals')
    setChatEnabled(true)
    setSelectedMealsToCompare([])
    setComparisonResult(null)
    addChatMessage('user', '⚖️ Compare Meals')
    addChatMessage('bot', 'First, let me show you available meals. Select 2-3 meals to compare:')
    setIsLoading(true)
    
    try {
      // Get top rated meals for comparison
      const result = await getPersonalizedRecommendations(15)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addChatMessage('bot', 'No meals available for comparison.')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'show_recommendations' }
          ]
        })
        return
      }

      setMealsForComparison(result.meals)
      
      setMenu({
        type: 'meal-selection',
        meals: result.meals,
        showSelection: true
      })
      
    } catch (error) {
      console.error('Compare meals error:', error)
      addChatMessage('bot', 'Failed to load meals.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'show_recommendations' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMealSelectionToggle = (mealId) => {
    setSelectedMealsToCompare(prev => {
      if (prev.includes(mealId)) {
        return prev.filter(id => id !== mealId)
      } else {
        if (prev.length >= 3) {
          addChatMessage('bot', 'You can only compare up to 3 meals.')
          return prev
        }
        return [...prev, mealId]
      }
    })
  }

  const handleCompareMealsSubmit = async () => {
    if (selectedMealsToCompare.length < 2) {
      addChatMessage('bot', 'Please select at least 2 meals to compare.')
      return
    }

    const selectedNames = mealsForComparison
      .filter(m => selectedMealsToCompare.includes(m.mealId))
      .map(m => m.mealName)
      .join(', ')
    
    addChatMessage('user', `Compare: ${selectedNames}`)
    setIsLoading(true)
    
    try {
      const result = await compareMeals(selectedMealsToCompare)
      
      if (!result.success) {
        addChatMessage('bot', 'Failed to compare meals. Please try again.')
        return
      }

      // Show structured summary
      addChatMessage('bot', result.summary)
      
      setComparisonResult(result)
      
      setMenu({
        type: 'comparison-result',
        data: result.meals,
        summary: result.summary,
        highlights: result.highlights,
        showComparison: true
      })
      
    } catch (error) {
      console.error('Comparison error:', error)
      addChatMessage('bot', 'Failed to compare meals. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // TOP SELLING MENU (UPGRADED)
  // ============================================
  
  const showTopSellingMenu = () => {
    setCurrentView('topSelling')
    setChatEnabled(true) // Enable chat globally
    setSelectedItem(null)
    addChatMessage('user', 'Top Selling Meals')
    setMenu({
      type: 'buttons',
      buttons: [
        { label: 'Today\'s Top Selling', action: 'top_selling', period: 'today', limit: 3 },
        { label: 'This Week\'s Top Selling', action: 'top_selling', period: 'week', limit: 5 },
        { label: 'This Month\'s Top Selling', action: 'top_selling', period: 'month', limit: 7 },
        { label: 'Overall Top Selling', action: 'top_selling', period: 'overall', limit: 10 },
        { label: '🔍 Search Specific Top Selling Item', action: 'show_item_options' },
        { label: 'Back', action: 'browse_meals' }
      ]
    })
  }

  // ============================================
  // SHOW ITEM OPTIONS (NEW - WITH DROPDOWN)
  // ============================================
  
  const showItemOptions = () => {
    setCurrentView('itemOptions')
    setChatEnabled(true)
    setSelectedItem(null)
    setSelectedDropdownItem('')
    setSearchInputValue('') // Clear search input
    addChatMessage('user', '🔍 Search Specific Top Selling Item')
    addChatMessage('bot', 'Select an item from the dropdown or type your own query:')
    setMenu({
      type: 'dropdown',
      showDropdown: true
    })
  }

  // ============================================
  // HANDLE DROPDOWN SELECTION
  // ============================================
  
  const handleDropdownSelect = (item) => {
    if (!item) return
    
    setSelectedDropdownItem(item)
    setSelectedItem(item.toLowerCase())
    setSearchInputValue('') // Clear search input when dropdown is used
    addChatMessage('user', item)
    addChatMessage('bot', `Select time period for ${item}:`)
    
    // Show time period buttons on same screen
    setMenu({
      type: 'dropdown',
      showDropdown: true,
      showPeriodButtons: true,
      selectedItem: item
    })
  }
  
  // ============================================
  // HANDLE SEARCH INPUT SUBMISSION
  // ============================================
  
  const handleSearchInputSubmit = async () => {
    if (searchInputValue.trim() === '') return
    
    const query = searchInputValue.trim()
    addChatMessage('user', query)
    setSearchInputValue('')
    setSelectedDropdownItem('') // Clear dropdown when search is used
    setIsLoading(true)
    
    try {
      // Use FEATURE SEARCH API (restricted context)
      const response = await sendFeatureSearchMessage(query, chatHistory)
      
      if (response.success) {
        addChatMessage('bot', response.response)
        
        if (response.hasData && response.data && response.data.length > 0) {
          setMenu({
            type: 'dropdown',
            showDropdown: true,
            data: response.data
          })
        } else {
          setMenu({
            type: 'dropdown',
            showDropdown: true
          })
        }
      } else {
        addChatMessage('bot', 'Sorry, I couldn\'t process that. Try rephrasing!')
        setMenu({
          type: 'dropdown',
          showDropdown: true
        })
      }
    } catch (error) {
      console.error('Search input error:', error)
      addChatMessage('bot', 'Failed to process search. Please try again.')
      setMenu({
        type: 'dropdown',
        showDropdown: true
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSearchInputKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearchInputSubmit()
    }
  }
  
  // ============================================
  // HANDLE PERIOD SELECTION FROM DROPDOWN VIEW
  // ============================================
  
  const handlePeriodFromDropdown = async (period, limit) => {
    const item = selectedItem
    await searchItemByPeriod(item, period, limit)
  }

  // ============================================
  // ITEM + PERIOD SEARCH
  // ============================================
  
  const searchItemByPeriod = async (item, period, limit) => {
    const periodLabels = {
      today: 'Today\'s',
      week: 'This Week\'s',
      month: 'This Month\'s',
      overall: 'Overall'
    }
    
    const itemCapitalized = item.charAt(0).toUpperCase() + item.slice(1)
    const periodLabel = periodLabels[period]
    
    addChatMessage('user', `${periodLabel} Top Selling ${itemCapitalized}`)
    setIsLoading(true)
    
    try {
      // Use FEATURE SEARCH API with constructed query
      const query = `top selling ${item} ${period}`
      const response = await sendFeatureSearchMessage(query, chatHistory)
      
      if (response.success && response.data && response.data.length > 0) {
        addChatMessage('bot', response.response)
        setMenu({
          type: 'dropdown',
          showDropdown: true,
          showPeriodButtons: true,
          selectedItem: itemCapitalized,
          data: response.data
        })
      } else {
        // Fallback: try broader search
        if (period !== 'overall') {
          addChatMessage('bot', `No ${item} found for ${period}. Trying overall...`)
          await searchItemByPeriod(item, 'overall', 10)
        } else {
          addChatMessage('bot', `No ${item} found in top selling. Try a different item!`)
          setMenu({
            type: 'dropdown',
            showDropdown: true
          })
        }
      }
      
    } catch (error) {
      console.error('Item search error:', error)
      addChatMessage('bot', 'Failed to load data. Please try again.')
      setMenu({
        type: 'dropdown',
        showDropdown: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // AI CHAT HANDLER (GLOBAL - BOTTOM INPUT)
  // ============================================
  
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return

    let userMessage = inputText.trim()
    
    // Check if user is asking for recommendations or health advice
    const recommendationKeywords = [
      'what should i eat',
      'recommend',
      'suggestion',
      'what to eat',
      'what can i eat',
      'what do you recommend',
      'any suggestions',
      'i have fever',
      'i have cold',
      'i am sick',
      'healthy food',
      'cheap food',
      'high protein',
      'low calorie'
    ]
    
    const isRecommendationQuery = recommendationKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    )
    
    if (isRecommendationQuery) {
      // Trigger smart food advisor
      setInputText('')
      addChatMessage('user', userMessage)
      setIsLoading(true)
      
      try {
        const result = await getSmartFoodAdvice(userMessage)
        
        if (result.success) {
          addChatMessage('bot', result.guidance)
          
          if (result.meals && result.meals.length > 0) {
            addChatMessage('bot', 'Here are the recommended meals 👇')
            setMenu({
              type: 'cards',
              data: result.meals,
              buttons: [
                { label: 'More Recommendations', action: 'show_recommendations' }
              ]
            })
          }
        } else {
          addChatMessage('bot', 'Sorry, I couldn\'t process that. Try the Smart Food Advisor!')
          setMenu({
            type: 'buttons',
            buttons: [
              { label: '🧠 Smart Food Advisor', action: 'smart_advisor' }
            ]
          })
        }
      } catch (error) {
        console.error('Smart advisor error:', error)
        addChatMessage('bot', 'Failed to process your request.')
      } finally {
        setIsLoading(false)
      }
      return
    }
    
    // If item is selected, prepend it to query
    if (selectedItem && !userMessage.toLowerCase().includes(selectedItem)) {
      userMessage = `${selectedItem} ${userMessage}`
    }
    
    addChatMessage('user', inputText.trim())
    setInputText('')
    setIsLoading(true)

    try {
      // Use GENERAL AI (no UI changes, only chat responses)
      const response = await sendAdvancedChatMessage(userMessage, chatHistory)
      
      if (response.success) {
        addChatMessage('bot', response.response)
        
        // Global chat NEVER shows cards - only text responses
        // If user wants to search meals, they should use Feature Search
      } else {
        addChatMessage('bot', 'Sorry, I couldn\'t process that. Try rephrasing!')
      }
      
    } catch (error) {
      console.error('Chat error:', error)
      addChatMessage('bot', 'Oops! Something went wrong. Please try again!')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // TOP SELLING BY PERIOD (EXISTING)
  // ============================================
  
  const showTopSellingByPeriod = async (period, limit) => {
    const periodLabels = {
      today: 'Today\'s Top Selling',
      week: 'This Week\'s Top Selling',
      month: 'This Month\'s Top Selling',
      overall: 'Overall Top Selling'
    }
    
    const periodLabel = periodLabels[period]
    addChatMessage('user', periodLabel)
    setIsLoading(true)
    
    try {
      const result = await getTopSellingByPeriod(period, limit)
      
      if (!result.success || !result.meals || result.meals.length === 0) {
        addChatMessage('bot', 'No data available for this period.')
        setMenu({
          type: 'buttons',
          buttons: [
            { label: 'Back', action: 'top_selling_menu' }
          ]
        })
        return
      }

      setMenu({
        type: 'cards',
        data: result.meals,
        buttons: [
          { label: 'Back', action: 'top_selling_menu' }
        ]
      })
      
    } catch (error) {
      console.error('Top selling error:', error)
      addChatMessage('bot', 'Failed to load data. Please try again.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'top_selling_menu' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // BUTTON CLICK HANDLER
  // ============================================
  
  const handleButtonClick = async (button) => {
    const { action, period, limit, item } = button
    
    setIsLoading(true)
    
    try {
      switch (action) {
        case 'main_menu':
          showMainMenu()
          break
          
        case 'browse_meals':
          showBrowseMealsMenu()
          break
          
        case 'browse_cooks':
          showBrowseCooksMenu()
          break
          
        case 'all_meals':
          handleAllMeals()
          break
          
        case 'top_selling_menu':
          showTopSellingMenu()
          break
          
        case 'top_rated_cooks':
          await showTopRatedCooks()
          break
          
        case 'top_selling_cooks':
          await showTopSellingCooks()
          break
          
        case 'cooks_by_items':
          await showCooksByTopItems()
          break
          
        case 'show_recommendations':
          await showRecommendations()
          break
          
        case 'personalized_meals':
          await showPersonalizedMeals()
          break
          
        case 'smart_advisor':
          showSmartAdvisor()
          break
          
        case 'health_meals':
          await showHealthMeals()
          break
          
        case 'compare_meals':
          await showCompareMeals()
          break
          
        case 'top_selling':
          await showTopSellingByPeriod(period, limit)
          break
          
        case 'show_item_options':
          showItemOptions()
          break
          
        case 'track_order':
          await handleTrackOrder()
          break
          
        case 'file_complaint':
          await handleFileComplaint()
          break
          
        case 'view_order_history':
          handleViewOrderHistory()
          break
          
        default:
          addChatMessage('bot', 'Invalid action.')
          setMenu({
            type: 'buttons',
            buttons: [
              { label: 'Back', action: 'main_menu' }
            ]
          })
      }
    } catch (error) {
      console.error('Button action error:', error)
      addChatMessage('bot', 'Something went wrong.')
      setMenu({
        type: 'buttons',
        buttons: [
          { label: 'Back', action: 'main_menu' }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // MEAL CARD COMPONENT - RESPONSIVE
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
        <div className="flex gap-2 sm:gap-3 p-2 sm:p-3">
          {/* Meal Image */}
          <div className="flex-shrink-0">
            {meal.itemImage ? (
              <img 
                src={meal.itemImage} 
                alt={meal.mealName}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl sm:text-3xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Meal Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2">
                {index !== undefined ? `${index + 1}. ` : ''}{meal.mealName}
              </h4>
              <span className="text-orange-600 font-bold text-xs sm:text-sm whitespace-nowrap">
                Rs {meal.price}
              </span>
            </div>

            {/* Cook Name */}
            {meal.cookName && (
              <p className="text-[10px] sm:text-xs text-gray-600 mt-1 truncate">
                👨‍🍳 {meal.cookName}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs flex-wrap">
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
              {meal.totalOrders > 0 && (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  🔥 {meal.totalOrders} orders
                </span>
              )}
              {meal.sentiment && meal.sentiment.positivePercent > 0 && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  👍 {meal.sentiment.positivePercent}%
                </span>
              )}
            </div>

            {/* Health Tags */}
            {meal.healthTags && meal.healthTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {meal.healthTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] sm:text-[10px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // COOK CARD COMPONENT - RESPONSIVE
  // ============================================
  
  const CookCard = ({ cook, index }) => {
    const handleClick = () => {
      navigate(`/cook/${cook.cookId}`)
      setIsOpen(false)
    }

    return (
      <div 
        onClick={handleClick}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-orange-400 transform hover:scale-[1.02] mb-3"
      >
        <div className="flex gap-2 sm:gap-3 p-2 sm:p-3">
          {/* Cook Image */}
          <div className="flex-shrink-0">
            {cook.profileImage ? (
              <img 
                src={cook.profileImage} 
                alt={cook.cookName}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full border-2 border-orange-200"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center border-2 border-orange-200">
                <span className="text-2xl sm:text-3xl">👨‍🍳</span>
              </div>
            )}
          </div>

          {/* Cook Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2">
                {index !== undefined ? `${index + 1}. ` : ''}{cook.cookName}
              </h4>
              {cook.averageRating > 0 && (
                <span className="flex items-center gap-1 text-yellow-600 font-bold text-xs sm:text-sm whitespace-nowrap">
                  ⭐ {cook.averageRating}
                </span>
              )}
            </div>

            {/* City */}
            {cook.city && (
              <p className="text-[10px] sm:text-xs text-gray-600 mt-1 truncate">
                📍 {cook.city}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs flex-wrap">
              {cook.totalOrders > 0 && (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  🔥 {cook.totalOrders} orders
                </span>
              )}
              {cook.totalReviews > 0 && (
                <span className="flex items-center gap-1 text-gray-600">
                  💬 {cook.totalReviews} reviews
                </span>
              )}
              {cook.topSellingDish && cook.topSellingDish !== 'N/A' && (
                <span className="flex items-center gap-1 text-purple-600 font-medium truncate">
                  🍽️ {cook.topSellingDish}
                </span>
              )}
              {cook.itemOrders > 0 && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  📦 {cook.itemOrders} sold
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Floating Chat Button - HIGHEST Z-INDEX */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full w-14 h-14 sm:w-16 sm:h-16 shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 flex items-center justify-center group"
          style={{ zIndex: 10000 }}
          aria-label="Open chat"
        >
          <FiMessageCircle className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform duration-200" />
          <span className="absolute inset-0 rounded-full bg-orange-500 opacity-75 animate-ping" />
        </button>
      )}

      {/* Chat Window - FLOATING OVERLAY WITH BACKDROP */}
      {isOpen && (
        <>
          {/* Backdrop for mobile - BELOW CHATBOT */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 md:hidden"
            style={{ zIndex: 9998 }}
            onClick={toggleChat}
          />
          
          {/* Chat Container - HIGHEST Z-INDEX, FULLY RESPONSIVE */}
          <div 
            className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 lg:bottom-6 lg:right-6 w-full h-full md:w-[420px] lg:w-[440px] md:h-[85vh] md:max-h-[700px] bg-white md:rounded-2xl shadow-2xl flex flex-col border-0 md:border md:border-gray-200 animate-slideUp md:animate-none"
            style={{ zIndex: 10000 }}
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 md:rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <FiMessageCircle className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Homely Meals</h3>
                  <p className="text-xs text-orange-100">
                    {chatEnabled ? '💬 Chat Mode' : 'Browse Assistant'}
                  </p>
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

            {/* Messages Area - SCROLLABLE WITH PROPER HEIGHT */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
              {/* Chat History (User/Bot Messages) */}
              {chatHistory.map((message, index) => (
                <div key={`chat-${index}`}>
                  {/* User Message */}
                  {message.sender === 'user' && (
                    <div className="flex justify-end mb-3">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-md max-w-[85%] sm:max-w-[80%]">
                        <p className="text-xs sm:text-sm font-medium break-words">{message.text}</p>
                        <p className="text-[10px] sm:text-xs text-orange-100 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bot Message */}
                  {message.sender === 'bot' && (
                    <div className="flex justify-start mb-3">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm border border-gray-100 max-w-[85%] sm:max-w-[80%]">
                        <p className="text-xs sm:text-sm whitespace-pre-line break-words">{message.text}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {/* Active Menu (Cards + Buttons + Dropdown) - SINGLE INSTANCE */}
            {activeMenu && (
              <div>
                {/* Dropdown Menu */}
                {activeMenu.type === 'dropdown' && activeMenu.showDropdown && (
                  <div className="mb-3 space-y-3">
                    {/* Search Input Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Search Directly:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={searchInputValue}
                          onChange={(e) => setSearchInputValue(e.target.value)}
                          onKeyPress={handleSearchInputKeyPress}
                          placeholder="Type dish name or query (e.g., biryani today, pasta under 200)"
                          disabled={isLoading}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all disabled:opacity-50 text-sm"
                        />
                        <button
                          onClick={handleSearchInputSubmit}
                          disabled={searchInputValue.trim() === '' || isLoading}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          <FiSend className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Press Enter or click send to search
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t border-gray-300"></div>
                      <span className="text-xs text-gray-500 font-medium">OR</span>
                      <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Dropdown Select */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Select from Dropdown:
                      </label>
                      <select
                        value={selectedDropdownItem}
                        onChange={(e) => handleDropdownSelect(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all text-sm bg-white"
                      >
                        <option value="">-- Select an item --</option>
                        {mealTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Period Buttons (shown after item selection) */}
                    {activeMenu.showPeriodButtons && activeMenu.selectedItem && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">
                          Select time period:
                        </p>
                        <button
                          onClick={() => handlePeriodFromDropdown('today', 3)}
                          disabled={isLoading}
                          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Today's Top Selling {activeMenu.selectedItem}
                        </button>
                        <button
                          onClick={() => handlePeriodFromDropdown('week', 5)}
                          disabled={isLoading}
                          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          This Week's Top Selling {activeMenu.selectedItem}
                        </button>
                        <button
                          onClick={() => handlePeriodFromDropdown('month', 7)}
                          disabled={isLoading}
                          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          This Month's Top Selling {activeMenu.selectedItem}
                        </button>
                        <button
                          onClick={() => handlePeriodFromDropdown('overall', 10)}
                          disabled={isLoading}
                          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Overall Top Selling {activeMenu.selectedItem}
                        </button>
                      </div>
                    )}

                    {/* Back Button */}
                    <button
                      onClick={() => showTopSellingMenu()}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Smart Advisor Input */}
                {activeMenu.type === 'smart-advisor-input' && activeMenu.showInput && (
                  <div className="mb-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Ask me anything:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={smartAdvisorQuery}
                          onChange={(e) => setSmartAdvisorQuery(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSmartAdvisorSubmit()
                            }
                          }}
                          placeholder="e.g., I have fever, cheap food, high protein"
                          disabled={isLoading}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all disabled:opacity-50 text-sm"
                        />
                        <button
                          onClick={handleSmartAdvisorSubmit}
                          disabled={smartAdvisorQuery.trim() === '' || isLoading}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          <FiSend className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleButtonClick({ action: 'show_recommendations' })}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Health Tags Selection */}
                {activeMenu.type === 'health-tags' && activeMenu.showTags && (
                  <div className="mb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {activeMenu.tags.map((tag) => (
                        <button
                          key={tag.value}
                          onClick={() => handleHealthTagToggle(tag.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 transform hover:scale-[1.02] ${
                            selectedHealthTags.includes(tag.value)
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div>{tag.label}</div>
                          <div className="text-[10px] opacity-80">{tag.description}</div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleHealthMealsSearch}
                      disabled={selectedHealthTags.length === 0 || isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Search Meals ({selectedHealthTags.length} selected)
                    </button>
                    <button
                      onClick={() => handleButtonClick({ action: 'show_recommendations' })}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Meal Selection for Comparison */}
                {activeMenu.type === 'meal-selection' && activeMenu.showSelection && (
                  <div className="mb-3 space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                      <p className="text-xs text-orange-800 font-medium">
                        Selected: {selectedMealsToCompare.length}/3 meals
                      </p>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {activeMenu.meals.map((meal) => (
                        <div
                          key={meal.mealId}
                          onClick={() => handleMealSelectionToggle(meal.mealId)}
                          className={`cursor-pointer rounded-lg p-3 transition-all duration-200 transform hover:scale-[1.02] ${
                            selectedMealsToCompare.includes(meal.mealId)
                              ? 'bg-orange-100 border-2 border-orange-500'
                              : 'bg-white border border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {meal.itemImage ? (
                                <img 
                                  src={meal.itemImage} 
                                  alt={meal.mealName}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                                  <span className="text-xl">🍽️</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-800 text-xs truncate">
                                {meal.mealName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="text-orange-600 font-bold">Rs {meal.price}</span>
                                {meal.averageRating > 0 && (
                                  <span className="text-yellow-600">⭐ {meal.averageRating}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {selectedMealsToCompare.includes(meal.mealId) && (
                                <span className="text-orange-600 text-xl">✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleCompareMealsSubmit}
                      disabled={selectedMealsToCompare.length < 2 || isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Compare Selected Meals
                    </button>
                    <button
                      onClick={() => handleButtonClick({ action: 'show_recommendations' })}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Comparison Result */}
                {activeMenu.type === 'comparison-result' && activeMenu.showComparison && (
                  <div className="mb-3 space-y-3">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-900 text-sm mb-2">📊 Comparison</h3>
                      <div className="space-y-3">
                        {activeMenu.data.map((meal, idx) => {
                          const isCheapest = activeMenu.highlights?.cheapest === meal.mealId;
                          const isHighestRated = activeMenu.highlights?.highestRated === meal.mealId;
                          const isMostPopular = activeMenu.highlights?.mostPopular === meal.mealId;
                          
                          return (
                            <div key={meal.mealId} className="bg-white rounded-lg p-3 shadow-sm">
                              <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                                {idx + 1}. {meal.mealName}
                                {isCheapest && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">💰 Cheapest</span>}
                                {isHighestRated && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">⭐ Top Rated</span>}
                                {isMostPopular && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">🔥 Popular</span>}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Price:</span>
                                  <span className="ml-1 font-bold text-orange-600">Rs {meal.price}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Rating:</span>
                                  <span className="ml-1 font-bold text-yellow-600">⭐ {meal.averageRating}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Orders:</span>
                                  <span className="ml-1 font-bold text-blue-600">🔥 {meal.totalOrders}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Liked:</span>
                                  <span className="ml-1 font-bold text-green-600">👍 {meal.sentiment.positivePercent}%</span>
                                </div>
                              </div>
                              {meal.healthTags && meal.healthTags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {meal.healthTags.map((tag) => (
                                    <span key={tag} className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleButtonClick({ action: 'compare_meals' })}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Compare Different Meals
                    </button>
                    <button
                      onClick={() => handleButtonClick({ action: 'show_recommendations' })}
                      disabled={isLoading}
                      className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Meal Cards */}
                {activeMenu.data && activeMenu.data.length > 0 && activeMenu.type !== 'cook-cards' && activeMenu.type !== 'cooks-by-items' && (
                  <div className="space-y-2 mb-3">
                    {activeMenu.data.map((meal, idx) => (
                      <MealCard key={meal.mealId} meal={meal} index={idx} />
                    ))}
                  </div>
                )}

                {/* Cook Cards */}
                {activeMenu.type === 'cook-cards' && activeMenu.data && activeMenu.data.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {activeMenu.data.map((cook, idx) => (
                      <CookCard key={cook.cookId} cook={cook} index={idx} />
                    ))}
                  </div>
                )}

                {/* Cooks by Items */}
                {activeMenu.type === 'cooks-by-items' && activeMenu.data && activeMenu.data.length > 0 && (
                  <div className="space-y-4 mb-3">
                    {activeMenu.data.map((item, itemIdx) => (
                      <div key={itemIdx} className="bg-gray-50 rounded-lg p-3">
                        <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                          <span className="text-orange-600">🍽️</span>
                          {item.mealName}
                          <span className="text-xs text-gray-500 font-normal">({item.totalQuantity} sold)</span>
                        </h3>
                        <div className="space-y-2">
                          {item.cooks.map((cook, cookIdx) => (
                            <CookCard key={cook.cookId} cook={cook} index={cookIdx} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Back Button for Cook Cards */}
                {(activeMenu.type === 'cook-cards' || activeMenu.type === 'cooks-by-items') && activeMenu.buttons && activeMenu.buttons.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {activeMenu.buttons.map((button, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => handleButtonClick(button)}
                        disabled={isLoading}
                        className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Action Buttons (for non-dropdown menus) */}
                {activeMenu.type === 'buttons' && activeMenu.buttons && activeMenu.buttons.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {activeMenu.buttons.map((button, btnIndex) => (
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

                {/* Action Buttons for Cards Menu */}
                {activeMenu.type === 'cards' && activeMenu.buttons && activeMenu.buttons.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {activeMenu.buttons.map((button, btnIndex) => (
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
            )}
            
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

          {/* Input Area - STICKY BOTTOM, FULLY RESPONSIVE */}
          <div className="p-3 sm:p-4 bg-white border-t border-gray-200 md:rounded-b-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedItem ? `Search ${selectedItem}...` : "Type your search..."}
                disabled={isLoading}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-full focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all disabled:opacity-50 text-xs sm:text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={inputText.trim() === '' || isLoading}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full p-2 sm:p-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 flex-shrink-0"
              >
                <FiSend className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 text-center">
              💬 AI-Powered Search • Press Enter to send
            </p>
          </div>
        </div>
        </>
      )}

      {/* Styles - ENHANCED WITH ANIMATIONS */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
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

export default ChatbotFinal
