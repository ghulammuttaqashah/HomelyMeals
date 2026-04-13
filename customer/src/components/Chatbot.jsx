import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMessageCircle, FiX, FiSend, FiMinimize2, FiHome, FiChevronLeft } from 'react-icons/fi'
import { sendChatbotMessage } from '../api/chatbot'
import { getSmartRecommendations } from '../api/analytics'
import { getOrders } from '../api/orders'
import { getAllCooks, getTopSellingMeals } from '../api/meals'

const Chatbot = () => {
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [hasNewMessage, setHasNewMessage] = useState(true)
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    
    // Module State Management
    const [currentModule, setCurrentModule] = useState('dashboard') // dashboard, browse_meals, recommend, cooks, orders
    const [moduleData, setModuleData] = useState(null)
    
    // Context Memory System
    const [contextMemory, setContextMemory] = useState({
        healthCondition: null,
        lastBudget: null,
        lastDish: null,
        dietaryPreference: null,
        hasOrders: false,
        complaintSubmitted: false
    })

    // Health Intelligence Database with meal filtering keywords
    const healthDatabase = {
        flu: {
            safe: ['soup', 'khichdi', 'porridge', 'rice', 'vegetable', 'chicken', 'broth'],
            avoid: ['fried', 'spicy', 'cold', 'heavy', 'oily', 'pizza', 'burger'],
            safeCategories: ['Soups', 'Light Meals', 'Boiled Items', 'Steamed Dishes'],
            avoidCategories: ['Fried Foods', 'Spicy Foods', 'Cold Drinks', 'Heavy Meals'],
            advice: 'Focus on warm, light, easily digestible foods. Stay hydrated with warm liquids.',
            filterPreference: 'healthy'
        },
        fever: {
            safe: ['soup', 'khichdi', 'vegetable', 'broth', 'rice', 'boiled'],
            avoid: ['fried', 'spicy', 'heavy', 'oily'],
            safeCategories: ['Soups', 'Light Meals', 'Boiled Vegetables'],
            avoidCategories: ['Fried Foods', 'Spicy Foods', 'Heavy Meals'],
            advice: 'Eat light, nutritious meals. Avoid heavy or oily foods that are hard to digest.',
            filterPreference: 'healthy'
        },
        diabetes: {
            safe: ['grilled', 'chicken', 'vegetable', 'salad', 'fish', 'lean'],
            avoid: ['rice', 'sugar', 'sweet', 'fried', 'dessert', 'cake', 'pastry'],
            safeCategories: ['Grilled Items', 'Steamed Vegetables', 'Salads', 'Lean Proteins'],
            avoidCategories: ['Rice Dishes', 'Sugary Foods', 'Fried Foods', 'Desserts'],
            advice: 'Choose low-carb, high-fiber foods. Avoid sugar and refined carbohydrates.',
            filterPreference: 'healthy'
        },
        diabetic: {
            safe: ['grilled', 'chicken', 'vegetable', 'salad', 'fish', 'lean'],
            avoid: ['rice', 'sugar', 'sweet', 'fried', 'dessert', 'cake', 'pastry'],
            safeCategories: ['Grilled Items', 'Steamed Vegetables', 'Salads', 'Lean Proteins'],
            avoidCategories: ['Rice Dishes', 'Sugary Foods', 'Fried Foods', 'Desserts'],
            advice: 'Choose low-carb, high-fiber foods. Avoid sugar and refined carbohydrates.',
            filterPreference: 'healthy'
        },
        heart: {
            safe: ['grilled', 'fish', 'vegetable', 'salad', 'lean', 'steamed'],
            avoid: ['fried', 'oily', 'fatty', 'salt', 'processed'],
            safeCategories: ['Grilled Fish', 'Steamed Vegetables', 'Salads', 'Lean Meats'],
            avoidCategories: ['Fried Foods', 'High Salt Foods', 'Fatty Meats', 'Processed Foods'],
            advice: 'Choose low-fat, low-sodium options. Avoid fried and processed foods.',
            filterPreference: 'healthy'
        },
        cardiac: {
            safe: ['grilled', 'fish', 'vegetable', 'salad', 'lean', 'steamed'],
            avoid: ['fried', 'oily', 'fatty', 'salt', 'processed'],
            safeCategories: ['Grilled Fish', 'Steamed Vegetables', 'Salads', 'Lean Meats'],
            avoidCategories: ['Fried Foods', 'High Salt Foods', 'Fatty Meats', 'Processed Foods'],
            advice: 'Choose low-fat, low-sodium options. Avoid fried and processed foods.',
            filterPreference: 'healthy'
        }
    }

    // Check if user has orders on mount
    useEffect(() => {
        const checkUserOrders = async () => {
            try {
                const token = localStorage.getItem('token')
                if (token) {
                    const ordersData = await getOrders()
                    const hasOrders = ordersData.orders && ordersData.orders.length > 0
                    setContextMemory(prev => ({ ...prev, hasOrders }))
                }
            } catch (error) {
                console.log('Could not fetch orders:', error)
            }
        }
        checkUserOrders()
    }, [])
    
    // Initialize with dashboard when chat opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            showDashboard()
        }
    }, [isOpen])

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus()
        }
    }, [isOpen, isMinimized])

    // Clear notification badge
    useEffect(() => {
        if (isOpen) {
            setHasNewMessage(false)
        }
    }, [isOpen])

    // ============================================
    // CORE NAVIGATION FUNCTIONS
    // ============================================
    
    const resetModule = () => {
        setCurrentModule('dashboard')
        setModuleData(null)
    }
    
    const addMessage = (sender, text, buttons = [], isModule = false, moduleContent = null) => {
        const message = {
            sender,
            text,
            buttons,
            isModule,
            moduleContent,
            timestamp: new Date()
        }
        setMessages(prev => [...prev, message])
    }
    
    const showDashboard = () => {
        setCurrentModule('dashboard')
        setModuleData(null)
        
        const dashboardButtons = [
            { label: '🍽️ Browse Meals', action: 'browse_meals', primary: true, solid: true },
            { label: '🎯 Smart Recommend', action: 'smart_recommend', primary: true, solid: true },
            { label: '👨‍🍳 Explore Cooks', action: 'explore_cooks', primary: true, solid: false },
            { label: '📦 My Orders', action: 'my_orders', primary: true, solid: false }
        ]
        
        // Add complaint only if user has orders
        if (contextMemory.hasOrders && !contextMemory.complaintSubmitted) {
            dashboardButtons.push({ label: '⚠️ File Complaint', action: 'file_complaint', primary: true, solid: false })
        }
        
        setMessages([{
            sender: 'bot',
            text: '🏠 Welcome to Homely Meals!\n\nYour AI-powered food ordering assistant. Choose an option below:',
            buttons: dashboardButtons,
            isModule: false,
            timestamp: new Date()
        }])
    }

    // ============================================
    // MODULE 1: BROWSE MEALS (STRICT 2-OPTION SYSTEM)
    // ============================================
    
    const showBrowseMealsModule = async () => {
        setCurrentModule('browse_meals')
        addMessage('user', '🍽️ Browse Meals')
        
        addMessage(
            'bot',
            '🍽️ Browse Meals\n\nExplore our meals:',
            [
                { label: '🔥 Top Selling Meals', action: 'show_top_selling_meals', primary: true, solid: true },
                { label: '⭐ Top Rated Meals', action: 'show_top_rated_meals', primary: true, solid: true },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ]
        )
    }
    
    // Show Top Selling Meals (REAL ORDER DATA ONLY - INTERACTIVE CARDS)
    const showTopSellingMeals = async () => {
        setIsTyping(true)
        
        try {
            // Fetch all cooks to aggregate their top-selling meals
            const cooksData = await getAllCooks()
            
            if (!cooksData.cooks || cooksData.cooks.length === 0) {
                addMessage(
                    'bot',
                    '🔥 Top Selling Meals\n\nNo cooks available yet. Check back soon!',
                    [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            // Aggregate top-selling meals from all cooks
            const allTopSellingMeals = []
            
            for (const cook of cooksData.cooks) {
                try {
                    const topMealsData = await getTopSellingMeals(cook._id)
                    if (topMealsData.topMeals && topMealsData.topMeals.length > 0) {
                        topMealsData.topMeals.forEach(meal => {
                            allTopSellingMeals.push({
                                ...meal,
                                cookName: cook.name,
                                cookId: cook._id
                            })
                        })
                    }
                } catch (error) {
                    console.log(`Could not fetch top meals for cook ${cook._id}`)
                }
            }
            
            if (allTopSellingMeals.length === 0) {
                addMessage(
                    'bot',
                    '🔥 Top Selling Meals\n\nNo order data available yet. Once customers start ordering, we\'ll show the most popular meals here!\n\nFor now, browse all available meals:',
                    [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '⭐ View Top Rated', action: 'show_top_rated_meals', primary: false },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            // Remove duplicates by meal name and sort by quantity sold
            const uniqueMeals = []
            const seenNames = new Set()
            
            for (const meal of allTopSellingMeals) {
                const mealKey = meal.mealName.toLowerCase()
                if (!seenNames.has(mealKey)) {
                    seenNames.add(mealKey)
                    uniqueMeals.push(meal)
                }
            }
            
            // Sort by quantity sold (highest first)
            uniqueMeals.sort((a, b) => b.totalQuantity - a.totalQuantity)
            
            // Show top 10 meals with interactive cards
            const topMeals = uniqueMeals.slice(0, 10)
            
            addMessage('bot', '🔥 Top Selling Meals\n\nOur most popular dishes based on real orders:', [])
            
            // Create interactive meal cards
            topMeals.forEach((meal, index) => {
                // Safety check for cookId
                if (!meal.cookId) {
                    console.warn('Meal missing cookId:', meal)
                    return
                }
                
                let mealInfo = `${index + 1}. ${meal.mealName}\n`
                mealInfo += `Rs ${meal.price}`
                
                if (meal.totalQuantity) {
                    mealInfo += ` • ${meal.totalQuantity} sold`
                }
                
                if (meal.cookName) {
                    mealInfo += `\n👨‍🍳 by ${meal.cookName}`
                }
                
                addMessage('bot', mealInfo, [
                    { label: '🍽️ View Meal', action: 'navigate_to_cook_meal', navigate: true, cookId: meal.cookId, primary: true, solid: true },
                    { label: '👨‍🍳 View Cook', action: 'navigate_to_cook_profile', navigate: true, cookId: meal.cookId, primary: true, solid: true },
                    { label: '🛒 Order Now', action: 'navigate_to_cook_meal', navigate: true, cookId: meal.cookId, primary: true, solid: true }
                ])
            })
            
            // Navigation options at the end
            addMessage('bot', 'Browse more options:', [
                { label: '→ View Full Menu', action: 'navigate_meals', navigate: true },
                { label: '⭐ View Top Rated', action: 'show_top_rated_meals', primary: false },
                { label: '🔙 Back to Browse', action: 'browse_meals', primary: false },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } catch (error) {
            console.error('Top selling meals error:', error)
            addMessage('bot', 'Sorry, couldn\'t load top selling data. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }
    
    // Show Top Rated Meals (REAL RATING DATA ONLY - INTERACTIVE CARDS)
    const showTopRatedMealsMain = async () => {
        setIsTyping(true)
        
        try {
            const result = await getSmartRecommendations({ preference: 'tasty' })
            
            if (!result.meals || result.meals.length === 0) {
                addMessage(
                    'bot',
                    '⭐ Top Rated Meals\n\nNo meals available yet. Check back soon!',
                    [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            // Filter meals with ratings and remove duplicates
            const ratedMeals = []
            const seenNames = new Set()
            
            for (const meal of result.meals) {
                if (meal.averageRating && meal.averageRating > 0 && !seenNames.has(meal.name.toLowerCase())) {
                    seenNames.add(meal.name.toLowerCase())
                    ratedMeals.push(meal)
                }
            }
            
            // Sort by rating (highest first)
            ratedMeals.sort((a, b) => b.averageRating - a.averageRating)
            
            if (ratedMeals.length === 0) {
                addMessage(
                    'bot',
                    '⭐ Top Rated Meals\n\nNo rated meals available yet. Be the first to order and review!',
                    [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            addMessage('bot', '⭐ Top Rated Meals\n\nOur highest-rated dishes:', [])
            
            // Show top 10 meals with interactive cards
            const topRatedMeals = ratedMeals.slice(0, 10)
            
            topRatedMeals.forEach((meal, index) => {
                // Safety check for cookId
                if (!meal.cookId) {
                    console.warn('Meal missing cookId:', meal)
                    return
                }
                
                const stars = '⭐'.repeat(Math.round(meal.averageRating))
                let mealInfo = `${index + 1}. ${meal.name}\n`
                mealInfo += `Rs ${meal.price} • ${stars} ${meal.averageRating.toFixed(1)}`
                
                if (meal.cookName) {
                    mealInfo += `\n👨‍🍳 by ${meal.cookName}`
                }
                
                if (meal.sentimentScore > 0 && meal.positivePercentage) {
                    mealInfo += `\n😊 ${meal.positivePercentage}% positive`
                }
                
                addMessage('bot', mealInfo, [
                    { label: '🍽️ View Meal', action: 'navigate_to_cook_meal', navigate: true, cookId: meal.cookId, primary: true, solid: true },
                    { label: '👨‍🍳 View Cook', action: 'navigate_to_cook_profile', navigate: true, cookId: meal.cookId, primary: true, solid: true },
                    { label: '🛒 Order Now', action: 'navigate_to_cook_meal', navigate: true, cookId: meal.cookId, primary: true, solid: true }
                ])
            })
            
            // Navigation options at the end
            addMessage('bot', 'Browse more options:', [
                { label: '→ View Full Menu', action: 'navigate_meals', navigate: true },
                { label: '🔥 View Top Selling', action: 'show_top_selling_meals', primary: false },
                { label: '🔙 Back to Browse', action: 'browse_meals', primary: false },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } catch (error) {
            console.error('Top rated meals error:', error)
            addMessage('bot', 'Sorry, couldn\'t load top rated meals. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }

    // ============================================
    // MODULE 2: SMART RECOMMENDATION ENGINE
    // ============================================
    
    const showSmartRecommendModule = () => {
        setCurrentModule('smart_recommend')
        addMessage('user', '🎯 Smart Recommend')
        
        addMessage(
            'bot',
            '🎯 Smart Recommendation Engine\n\nI can help you find the perfect meal based on:\n\n💊 Health Condition (flu, diabetes, heart issues)\n💰 Budget + Dish preferences\n⚠️ Risk Assessment (should I eat this?)\n\nType your query or choose an option:',
            [
                { label: '💊 Health-Based', action: 'health_mode', primary: true, solid: true },
                { label: '💰 Budget Mode', action: 'budget_mode', primary: true, solid: true },
                { label: '⚠️ Risk Check', action: 'risk_mode', primary: true, solid: true },
                { label: '🏠 Back to Menu', action: 'back_to_dashboard', primary: false }
            ]
        )
    }
    
    const handleHealthMode = () => {
        addMessage('user', '💊 Health-Based Recommendations')
        addMessage(
            'bot',
            '💊 Health-Based Recommendations\n\nTell me your health condition and I\'ll suggest:\n✅ What you SHOULD eat\n❌ What you should AVOID\n💡 Safe alternatives\n\nExamples:\n• "I have flu"\n• "I have diabetes"\n• "I have heart issues"',
            [{ label: '🏠 Back to Menu', action: 'back_to_dashboard' }]
        )
    }
    
    const handleBudgetMode = () => {
        addMessage('user', '💰 Budget Mode')
        addMessage(
            'bot',
            '💰 Budget + Dish Mode\n\nTell me what you want and your budget:\n\nExamples:\n• "biryani under 200"\n• "cheap spicy food"\n• "healthy meals under 300"\n\nI\'ll rank options from best to worst!',
            [{ label: '🏠 Back to Menu', action: 'back_to_dashboard' }]
        )
    }
    
    const handleRiskMode = () => {
        addMessage('user', '⚠️ Risk Assessment')
        addMessage(
            'bot',
            '⚠️ Risk Decision Mode\n\nAsk me if a food is safe for your condition:\n\nExamples:\n• "I have flu, should I eat fried chicken?"\n• "Can I eat biryani with diabetes?"\n• "Is pizza safe for heart patients?"\n\nI\'ll give you a YES/NO/MODERATE RISK answer with explanation!',
            [{ label: '🏠 Back to Menu', action: 'back_to_dashboard' }]
        )
    }

    // Process Health-Based Recommendations with REAL MEAL DATA
    const processHealthRecommendation = async (condition) => {
        const healthInfo = healthDatabase[condition.toLowerCase()]
        
        if (!healthInfo) {
            return addMessage(
                'bot',
                `I don't have specific recommendations for "${condition}" yet. Please consult a healthcare professional.\n\nI can help with: flu, diabetes, heart issues, fever`,
                [{ label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }]
            )
        }
        
        setContextMemory(prev => ({ ...prev, healthCondition: condition }))
        
        // STEP 1: Show health advice (conversational, no meta text)
        let response = `For ${condition}, here's what you should know:\n\n`
        response += `✅ SAFE TO EAT:\n${healthInfo.safeCategories.map(item => `• ${item}`).join('\n')}\n\n`
        response += `❌ AVOID:\n${healthInfo.avoidCategories.map(item => `• ${item}`).join('\n')}\n\n`
        response += `💡 ${healthInfo.advice}`
        
        addMessage('bot', response, [])
        
        // STEP 2: Fetch REAL available meals from system
        setIsTyping(true)
        
        try {
            // Fetch all available meals
            const allMeals = await getSmartRecommendations({})
            
            if (!allMeals.meals || allMeals.meals.length === 0) {
                addMessage(
                    'bot',
                    '\nNo meals are currently available. Please check back later!',
                    [{ label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }]
                )
                setIsTyping(false)
                return
            }
            
            // Filter meals based on health condition
            const safeMeals = allMeals.meals.filter(meal => {
                const mealNameLower = meal.name.toLowerCase()
                
                // Check if meal contains safe keywords
                const isSafe = healthInfo.safe.some(keyword => 
                    mealNameLower.includes(keyword.toLowerCase())
                )
                
                // Check if meal contains avoid keywords
                const isUnsafe = healthInfo.avoid.some(keyword => 
                    mealNameLower.includes(keyword.toLowerCase())
                )
                
                // Include if safe and not unsafe
                return isSafe && !isUnsafe
            })
            
            // Remove duplicates
            const uniqueSafeMeals = []
            const seenNames = new Set()
            
            for (const meal of safeMeals) {
                if (!seenNames.has(meal.name.toLowerCase())) {
                    seenNames.add(meal.name.toLowerCase())
                    uniqueSafeMeals.push(meal)
                }
            }
            
            if (uniqueSafeMeals.length > 0) {
                let mealResponse = `\nHere are safe meals available for you right now:\n\n`
                
                uniqueSafeMeals.slice(0, 5).forEach((meal, index) => {
                    const rating = meal.averageRating || 0
                    const stars = rating > 0 ? '⭐'.repeat(Math.round(rating)) : '⭐ New'
                    
                    mealResponse += `${index + 1}. ${meal.name}\n`
                    mealResponse += `   Rs ${meal.price}`
                    
                    if (rating > 0) {
                        mealResponse += ` • ${stars} ${rating.toFixed(1)}`
                    } else {
                        mealResponse += ` • ${stars}`
                    }
                    
                    if (meal.sentimentScore > 0 && meal.positivePercentage) {
                        mealResponse += `\n   😊 ${meal.positivePercentage}% positive`
                    }
                    
                    mealResponse += `\n\n`
                })
                
                mealResponse += 'Would you like to see more options?'
                
                addMessage('bot', mealResponse.trim(), [
                    { label: '🍽️ Show More Options', action: 'show_more_safe_meals', primary: false },
                    { label: '💰 Budget-Friendly', action: 'show_budget_safe_meals', primary: false },
                    { label: '⭐ Top-Rated', action: 'show_top_healthy_meals', primary: false },
                    { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                ])
            } else {
                addMessage(
                    'bot',
                    `\nI couldn't find meals matching your health requirements right now. Our cooks are preparing more options!\n\nYou can browse all meals to find suitable options.`,
                    [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
            }
        } catch (error) {
            console.error('Health recommendation error:', error)
            addMessage('bot', 'Sorry, I couldn\'t fetch meal recommendations. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }
    
    // Process Budget + Dish Recommendations
    const processBudgetRecommendation = async (dish, budget, preference = null) => {
        setIsTyping(true)
        
        try {
            const filters = {}
            if (dish) filters.food = dish
            if (budget) filters.maxPrice = budget
            if (preference) filters.preference = preference
            
            setContextMemory(prev => ({
                ...prev,
                lastDish: dish || prev.lastDish,
                lastBudget: budget || prev.lastBudget,
                dietaryPreference: preference || prev.dietaryPreference
            }))
            
            const result = await getSmartRecommendations(filters)
            
            if (result.meals && result.meals.length > 0) {
                // Filter out meals with no ratings or duplicate names
                const uniqueMeals = []
                const seenNames = new Set()
                
                for (const meal of result.meals) {
                    // Skip if duplicate name
                    if (seenNames.has(meal.name.toLowerCase())) continue
                    
                    // Add to unique list
                    seenNames.add(meal.name.toLowerCase())
                    uniqueMeals.push(meal)
                }
                
                if (uniqueMeals.length === 0) {
                    addMessage('bot', 'No meals found matching your criteria. Try adjusting your preferences!', [
                        { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ])
                    setIsTyping(false)
                    return
                }
                
                let response = `Here are the best options for you:\n\n`
                
                uniqueMeals.forEach((meal, index) => {
                    const rank = index + 1
                    const rating = meal.averageRating || 0
                    const stars = rating > 0 ? '⭐'.repeat(Math.round(rating)) : '⭐ New'
                    
                    response += `${rank}. ${meal.name}\n`
                    response += `   Rs ${meal.price}`
                    
                    if (rating > 0) {
                        response += ` • ${stars} ${rating.toFixed(1)}`
                    } else {
                        response += ` • ${stars}`
                    }
                    
                    if (meal.sentimentScore > 0 && meal.positivePercentage) {
                        response += `\n   😊 ${meal.positivePercentage}% positive`
                    }
                    
                    response += `\n\n`
                })
                
                addMessage('bot', response.trim(), [
                    { label: '→ View All Meals', action: 'navigate_meals', navigate: true },
                    { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                ])
            } else {
                let noDataMessage = 'No meals found matching your criteria.'
                
                if (dish) {
                    noDataMessage = `No "${dish}" meals found`
                    if (budget) noDataMessage += ` under Rs ${budget}`
                    noDataMessage += '. Try different search terms!'
                } else if (budget) {
                    noDataMessage = `No meals found under Rs ${budget}. Try increasing your budget!`
                } else if (preference) {
                    noDataMessage = `No ${preference} meals available right now. Try browsing all meals!`
                }
                
                addMessage('bot', noDataMessage, [
                    { label: '→ Browse All Meals', action: 'navigate_meals', navigate: true },
                    { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                ])
            }
        } catch (error) {
            console.error('Budget recommendation error:', error)
            addMessage('bot', 'Sorry, I couldn\'t fetch recommendations. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }

    // Process Risk Assessment with REAL MEAL ALTERNATIVES
    const processRiskAssessment = async (condition, food) => {
        const healthInfo = healthDatabase[condition.toLowerCase()]
        
        if (!healthInfo) {
            return addMessage(
                'bot',
                `I don't have risk data for "${condition}". Please consult a healthcare professional.`,
                [{ label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }]
            )
        }
        
        const foodLower = food.toLowerCase()
        let risk = ''
        let explanation = ''
        
        // Check if food contains safe keywords
        const isSafe = healthInfo.safe.some(keyword => 
            foodLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(foodLower)
        )
        
        // Check if food contains avoid keywords
        const isUnsafe = healthInfo.avoid.some(keyword => 
            foodLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(foodLower)
        )
        
        if (isSafe && !isUnsafe) {
            risk = '✅ YES, it\'s safe'
            explanation = `${food} is generally safe for ${condition}. It matches our recommended food categories.`
        } else if (isUnsafe) {
            risk = '❌ NO, avoid it'
            explanation = `${food} is not recommended for ${condition}. It contains ingredients you should avoid.`
        } else {
            risk = '⚠️ Moderate risk'
            explanation = `${food} isn't specifically listed. Consume in moderation and monitor your condition.`
        }
        
        let response = `${risk}\n\n${explanation}`
        
        addMessage('bot', response, [])
        
        // Fetch REAL alternative meals if unsafe
        if (isUnsafe) {
            setIsTyping(true)
            
            try {
                const allMeals = await getSmartRecommendations({})
                
                if (allMeals.meals && allMeals.meals.length > 0) {
                    const safeMeals = allMeals.meals.filter(meal => {
                        const mealNameLower = meal.name.toLowerCase()
                        const isSafe = healthInfo.safe.some(keyword => 
                            mealNameLower.includes(keyword.toLowerCase())
                        )
                        const isUnsafe = healthInfo.avoid.some(keyword => 
                            mealNameLower.includes(keyword.toLowerCase())
                        )
                        return isSafe && !isUnsafe
                    })
                    
                    // Remove duplicates
                    const uniqueSafeMeals = []
                    const seenNames = new Set()
                    
                    for (const meal of safeMeals) {
                        if (!seenNames.has(meal.name.toLowerCase())) {
                            seenNames.add(meal.name.toLowerCase())
                            uniqueSafeMeals.push(meal)
                        }
                    }
                    
                    if (uniqueSafeMeals.length > 0) {
                        let altResponse = `\nHere are better alternatives:\n\n`
                        
                        uniqueSafeMeals.slice(0, 3).forEach((meal, index) => {
                            const rating = meal.averageRating || 0
                            const stars = rating > 0 ? '⭐'.repeat(Math.round(rating)) : '⭐ New'
                            
                            altResponse += `${index + 1}. ${meal.name} - Rs ${meal.price}`
                            if (rating > 0) {
                                altResponse += ` • ${stars} ${rating.toFixed(1)}`
                            }
                            altResponse += `\n`
                        })
                        
                        addMessage('bot', altResponse, [
                            { label: '🍽️ View All Safe Options', action: 'show_safe_meals', primary: false },
                            { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                        ])
                    } else {
                        addMessage('bot', '\nNo safe alternatives currently available. Please check back later!', [
                            { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                        ])
                    }
                }
            } catch (error) {
                console.error('Alternative meals error:', error)
            } finally {
                setIsTyping(false)
            }
        } else {
            addMessage('bot', '', [
                { label: '💊 View All Safe Foods', action: 'health_mode', primary: false },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        }
    }

    // ============================================
    // MODULE 3: EXPLORE COOKS (STRUCTURED DISCOVERY)
    // ============================================
    
    const showExploreCooksModule = async () => {
        setCurrentModule('explore_cooks')
        addMessage('user', '👨‍🍳 Explore Cooks')
        
        addMessage(
            'bot',
            '👨‍🍳 Explore Cooks\n\nDiscover our talented home cooks:',
            [
                { label: '⭐ Top Rated Cooks', action: 'show_top_rated_cooks', primary: true, solid: true },
                { label: '👨‍🍳 All Cooks', action: 'show_all_cooks', primary: true, solid: true },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ]
        )
    }
    
    // Show Top Rated Cooks (Top 5 with real ratings - INTERACTIVE CARDS)
    const showTopRatedCooks = async () => {
        setIsTyping(true)
        
        try {
            const cooksData = await getAllCooks()
            
            if (!cooksData.cooks || cooksData.cooks.length === 0) {
                addMessage(
                    'bot',
                    'No cooks available at the moment. Check back soon!',
                    [{ label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }]
                )
                setIsTyping(false)
                return
            }
            
            // Filter cooks with ratings and sort by rating (highest first)
            const ratedCooks = cooksData.cooks
                .filter(cook => cook.averageRating && cook.averageRating > 0)
                .sort((a, b) => b.averageRating - a.averageRating)
            
            if (ratedCooks.length === 0) {
                addMessage(
                    'bot',
                    'No rated cooks yet. Be the first to order and review!',
                    [
                        { label: '👨‍🍳 View All Cooks', action: 'show_all_cooks', primary: false },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            addMessage('bot', '⭐ Top Rated Cooks\n\nOur highest-rated home cooks:', [])
            
            // Show top 5 cooks with interactive cards
            const topCooks = ratedCooks.slice(0, 5)
            
            for (let i = 0; i < topCooks.length; i++) {
                const cook = topCooks[i]
                const stars = '⭐'.repeat(Math.round(cook.averageRating))
                
                let cookInfo = `${i + 1}. ${cook.name}\n`
                cookInfo += `${stars} ${cook.averageRating.toFixed(1)} rating`
                
                if (cook.specialty) {
                    cookInfo += `\nSpecialty: ${cook.specialty}`
                }
                
                if (cook.city) {
                    cookInfo += `\n📍 ${cook.city}`
                }
                
                // Fetch top selling meals for this cook
                try {
                    const topMeals = await getTopSellingMeals(cook._id)
                    if (topMeals.topMeals && topMeals.topMeals.length > 0) {
                        cookInfo += `\n🔥 Top Selling: ${topMeals.topMeals.slice(0, 2).map(m => m.mealName).join(', ')}`
                    }
                } catch (error) {
                    console.log('Could not fetch top meals for cook:', cook._id)
                }
                
                addMessage('bot', cookInfo, [
                    { label: '👨‍🍳 View Profile', action: 'navigate_to_cook_profile', navigate: true, cookId: cook._id, primary: true, solid: true },
                    { label: '🍽️ View Menu', action: 'navigate_to_cook_meal', navigate: true, cookId: cook._id, primary: true, solid: true },
                    { label: '🛒 Order Now', action: 'navigate_to_cook_meal', navigate: true, cookId: cook._id, primary: true, solid: true }
                ])
            }
            
            // Navigation options at the end
            addMessage('bot', 'Browse more cooks:', [
                { label: '→ Browse All Cooks', action: 'navigate_meals', navigate: true },
                { label: '👨‍🍳 View All Cooks', action: 'show_all_cooks', primary: false },
                { label: '🔙 Back to Explore', action: 'explore_cooks', primary: false },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } catch (error) {
            console.error('Top rated cooks error:', error)
            addMessage('bot', 'Sorry, couldn\'t load top rated cooks. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }
    
    // Show All Cooks (INTERACTIVE CARDS)
    const showAllCooks = async () => {
        setIsTyping(true)
        
        try {
            const cooksData = await getAllCooks()
            
            if (!cooksData.cooks || cooksData.cooks.length === 0) {
                addMessage(
                    'bot',
                    'No cooks available at the moment. Check back soon!',
                    [{ label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }]
                )
                setIsTyping(false)
                return
            }
            
            // Sort cooks by rating (highest first), then by name
            const sortedCooks = [...cooksData.cooks].sort((a, b) => {
                if (b.averageRating && a.averageRating) {
                    return b.averageRating - a.averageRating
                }
                if (b.averageRating) return 1
                if (a.averageRating) return -1
                return a.name.localeCompare(b.name)
            })
            
            addMessage('bot', `👨‍🍳 All Cooks (${sortedCooks.length})\n\nBrowse our complete cook directory:`, [])
            
            // Show up to 8 cooks with interactive cards
            const displayCooks = sortedCooks.slice(0, 8)
            
            for (let i = 0; i < displayCooks.length; i++) {
                const cook = displayCooks[i]
                
                let cookInfo = `${i + 1}. ${cook.name}\n`
                
                if (cook.averageRating && cook.averageRating > 0) {
                    const stars = '⭐'.repeat(Math.round(cook.averageRating))
                    cookInfo += `${stars} ${cook.averageRating.toFixed(1)} rating`
                } else {
                    cookInfo += `⭐ New Cook`
                }
                
                if (cook.specialty) {
                    cookInfo += `\nSpecialty: ${cook.specialty}`
                }
                
                if (cook.city) {
                    cookInfo += `\n📍 ${cook.city}`
                }
                
                // Fetch top selling meals for this cook
                try {
                    const topMeals = await getTopSellingMeals(cook._id)
                    if (topMeals.topMeals && topMeals.topMeals.length > 0) {
                        const topItems = topMeals.topMeals.slice(0, 2).map(m => m.mealName).join(', ')
                        cookInfo += `\n🔥 Best Sellers: ${topItems}`
                    }
                } catch (error) {
                    console.log('Could not fetch top meals for cook:', cook._id)
                }
                
                addMessage('bot', cookInfo, [
                    { label: '👨‍🍳 View Profile', action: 'navigate_to_cook_profile', navigate: true, cookId: cook._id, primary: true, solid: true },
                    { label: '🍽️ View Menu', action: 'navigate_to_cook_meal', navigate: true, cookId: cook._id, primary: true, solid: true },
                    { label: '🛒 Order Now', action: 'navigate_to_cook_meal', navigate: true, cookId: cook._id, primary: true, solid: true }
                ])
            }
            
            if (sortedCooks.length > 8) {
                addMessage('bot', `...and ${sortedCooks.length - 8} more cooks available!`, [])
            }
            
            // Navigation options at the end
            addMessage('bot', 'Browse more options:', [
                { label: '→ Browse All Cooks', action: 'navigate_meals', navigate: true },
                { label: '⭐ Top Rated Only', action: 'show_top_rated_cooks', primary: false },
                { label: '🔙 Back to Explore', action: 'explore_cooks', primary: false },
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } catch (error) {
            console.error('All cooks error:', error)
            addMessage('bot', 'Sorry, couldn\'t load cooks. Please try again!', [
                { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
            ])
        } finally {
            setIsTyping(false)
        }
    }
    
    // ============================================
    // MODULE 4: MY ORDERS
    // ============================================
    
    const showMyOrdersModule = () => {
        setCurrentModule('my_orders')
        addMessage('user', '📦 My Orders')
        
        const buttons = [
            { label: '→ View My Orders', action: 'navigate_orders', navigate: true }
        ]
        
        // Show complaint option only if user has orders
        if (contextMemory.hasOrders && !contextMemory.complaintSubmitted) {
            buttons.push({ label: '⚠️ File Complaint', action: 'file_complaint_from_orders' })
        }
        
        buttons.push({ label: '🏠 Back to Menu', action: 'back_to_dashboard' })
        
        addMessage(
            'bot',
            '📦 My Orders Module\n\nView your order history, track deliveries, and manage your orders.',
            buttons
        )
    }

    // ============================================
    // MODULE 5: FILE COMPLAINT (CONDITIONAL)
    // ============================================
    
    const handleFileComplaint = () => {
        if (!contextMemory.hasOrders) {
            return addMessage(
                'bot',
                '⚠️ You need to have placed an order before filing a complaint.\n\nPlease order first, then you can file a complaint if needed.',
                [{ label: '🏠 Back to Menu', action: 'back_to_dashboard' }]
            )
        }
        
        if (contextMemory.complaintSubmitted) {
            return addMessage(
                'bot',
                '✅ You\'ve already submitted a complaint for this session.\n\nOur team will review it soon. Thank you for your patience!',
                [{ label: '🏠 Back to Menu', action: 'back_to_dashboard' }]
            )
        }
        
        addMessage('user', '⚠️ File Complaint')
        addMessage(
            'bot',
            '⚠️ File Complaint\n\nI\'m sorry to hear you\'re having an issue. Let me help you file a complaint.\n\nYou\'ll be redirected to the complaint form.',
            [
                { label: '→ File Complaint', action: 'navigate_complaint', navigate: true },
                { label: '🏠 Back to Menu', action: 'back_to_dashboard' }
            ]
        )
        
        setContextMemory(prev => ({ ...prev, complaintSubmitted: true }))
    }

    // ============================================
    // INTELLIGENT TEXT MESSAGE HANDLER
    // ============================================
    
    const handleSendMessage = async () => {
        if (inputText.trim() === '') return

        const userMessageText = inputText.trim()
        addMessage('user', userMessageText)
        setInputText('')
        setIsTyping(true)

        try {
            const msgLower = userMessageText.toLowerCase()
            
            // ===== GREETING DETECTION =====
            const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
            if (greetings.some(greeting => msgLower === greeting || msgLower.startsWith(greeting + ' '))) {
                addMessage(
                    'bot',
                    'Hello! 👋 I\'m your Homely Meals AI assistant.\n\nI can help you:\n• Find meals based on your health needs\n• Get budget-friendly recommendations\n• Assess food safety for your condition\n• Browse available meals\n\nWhat would you like to do today?',
                    [
                        { label: '🍽️ Browse Meals', action: 'browse_meals', primary: true },
                        { label: '🎯 Smart Recommend', action: 'smart_recommend', primary: true },
                        { label: '👨‍🍳 Explore Cooks', action: 'explore_cooks', primary: false },
                        { label: '📦 My Orders', action: 'my_orders', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            // ===== HEALTH CONDITION DETECTION =====
            const healthConditions = ['flu', 'fever', 'diabetes', 'diabetic', 'heart', 'cardiac']
            const detectedCondition = healthConditions.find(cond => msgLower.includes(cond))
            
            if (detectedCondition) {
                setContextMemory(prev => ({ ...prev, healthCondition: detectedCondition }))
                
                // Check if it's a risk assessment query
                if (msgLower.includes('should i eat') || msgLower.includes('can i eat') || 
                    (msgLower.includes('is') && msgLower.includes('safe')) ||
                    msgLower.includes('can i have')) {
                    // Extract food item
                    const foodMatch = msgLower.match(/eat\s+([a-z\s]+?)(\?|$|,)/i) || 
                                     msgLower.match(/have\s+([a-z\s]+?)(\?|$|,)/i)
                    if (foodMatch) {
                        const food = foodMatch[1].trim()
                        await processRiskAssessment(detectedCondition, food)
                        setIsTyping(false)
                        return
                    }
                }
                
                // Check if asking what NOT to eat
                if (msgLower.includes('not eat') || msgLower.includes('avoid') || 
                    msgLower.includes('shouldn\'t eat') || msgLower.includes('should not eat')) {
                    await processHealthRecommendation(detectedCondition)
                    setIsTyping(false)
                    return
                }
                
                // Check if asking what TO eat
                if (msgLower.includes('what') && (msgLower.includes('eat') || msgLower.includes('food'))) {
                    await processHealthRecommendation(detectedCondition)
                    setIsTyping(false)
                    return
                }
                
                // General health query
                await processHealthRecommendation(detectedCondition)
                setIsTyping(false)
                return
            }
            
            // ===== BUDGET + DISH DETECTION =====
            const priceMatch = msgLower.match(/\d+/)
            const price = priceMatch ? parseInt(priceMatch[0]) : null
            
            // Common food keywords
            const foodKeywords = ['biryani', 'pizza', 'burger', 'chicken', 'rice', 'pasta', 
                                 'noodles', 'sandwich', 'meal', 'food', 'dish', 'soup', 'salad']
            const detectedFood = foodKeywords.find(food => msgLower.includes(food))
            
            // Preference detection
            let preference = null
            if (msgLower.includes('cheap') || msgLower.includes('budget') || msgLower.includes('affordable')) {
                preference = 'cheap'
            } else if (msgLower.includes('spicy') || msgLower.includes('hot')) {
                preference = 'spicy'
            } else if (msgLower.includes('healthy') || msgLower.includes('diet') || msgLower.includes('light')) {
                preference = 'healthy'
            }
            
            if (detectedFood || price || preference) {
                // Use context memory if available
                const finalFood = detectedFood || contextMemory.lastDish
                const finalPrice = price || contextMemory.lastBudget
                const finalPreference = preference || contextMemory.dietaryPreference
                
                await processBudgetRecommendation(finalFood, finalPrice, finalPreference)
                setIsTyping(false)
                return
            }
            
            // ===== GENERAL QUERIES =====
            if (msgLower.includes('suggest') || msgLower.includes('recommend') || 
                msgLower.includes('what should') || msgLower.includes('help me find')) {
                addMessage(
                    'bot',
                    'I\'d love to help you find the perfect meal! 😊\n\nTell me:\n• Your budget (e.g., "under 200")\n• Food preference (e.g., "spicy", "healthy")\n• Any health conditions\n\nOr choose an option below:',
                    [
                        { label: '💰 Budget Friendly', action: 'budget_mode', primary: false },
                        { label: '💊 Health-Based', action: 'health_mode', primary: false },
                        { label: '⭐ Top Rated', action: 'browse_top_rated', primary: false },
                        { label: '🏠 Back to Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
                setIsTyping(false)
                return
            }
            
            if (msgLower.includes('order') || msgLower.includes('track')) {
                showMyOrdersModule()
                setIsTyping(false)
                return
            }
            
            if (msgLower.includes('cook') || msgLower.includes('chef')) {
                await showExploreCooksModule()
                setIsTyping(false)
                return
            }
            
            if (msgLower.includes('complaint') || msgLower.includes('issue') || msgLower.includes('problem')) {
                handleFileComplaint()
                setIsTyping(false)
                return
            }
            
            // ===== USE AI FOR COMPLEX QUERIES =====
            const aiResponse = await sendChatbotMessage(userMessageText, messages)
            
            console.log('AI Response:', aiResponse)
            
            // Handle AI intents naturally
            if (aiResponse.intent === 'greeting') {
                addMessage(
                    'bot',
                    aiResponse.text || 'Hello! How can I help you today? 😊',
                    [
                        { label: '🍽️ Browse Meals', action: 'browse_meals', primary: true },
                        { label: '🎯 Smart Recommend', action: 'smart_recommend', primary: true }
                    ]
                )
            } else if (aiResponse.intent === 'recommendation') {
                const { food, price, preference } = aiResponse.entities || {}
                if (food || price || preference) {
                    await processBudgetRecommendation(food, price, preference)
                } else {
                    showSmartRecommendModule()
                }
            } else if (aiResponse.intent === 'order_status') {
                showMyOrdersModule()
            } else if (aiResponse.intent === 'complaint') {
                handleFileComplaint()
            } else if (aiResponse.intent === 'explore_cooks') {
                await showExploreCooksModule()
            } else {
                // Generic helpful response
                addMessage(
                    'bot',
                    aiResponse.text || 'I\'m here to help! You can ask me about meals, health-based recommendations, or browse our menu. What would you like to do?',
                    [
                        { label: '🍽️ Browse Meals', action: 'browse_meals', primary: false },
                        { label: '🎯 Get Recommendations', action: 'smart_recommend', primary: false },
                        { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                    ]
                )
            }
            
        } catch (error) {
            console.error('Message error:', error)
            addMessage(
                'bot',
                'I\'m having trouble understanding. Could you rephrase that? 😊\n\nOr choose an option:',
                [
                    { label: '🍽️ Browse Meals', action: 'browse_meals', primary: false },
                    { label: '🎯 Smart Recommend', action: 'smart_recommend', primary: false },
                    { label: '🏠 Main Menu', action: 'back_to_dashboard', primary: false }
                ]
            )
        } finally {
            setIsTyping(false)
        }
    }

    // ============================================
    // BUTTON CLICK HANDLER
    // ============================================
    
    const handleButtonClick = async (action, buttonData = {}) => {
        setIsTyping(true)
        
        try {
            // Navigation actions with parameters
            if (action === 'navigate_to_cook_profile') {
                const cookId = buttonData.cookId
                if (cookId) {
                    addMessage('bot', 'Taking you to cook profile... 👨‍🍳', [])
                    setTimeout(() => {
                        navigate(`/cook/${cookId}`)
                        setIsOpen(false)
                    }, 500)
                } else {
                    addMessage('bot', 'Cook information not available.', [
                        { label: '🏠 Back to Menu', action: 'back_to_dashboard', primary: false }
                    ])
                }
                setIsTyping(false)
                return
            }
            
            if (action === 'navigate_to_cook_meal') {
                const cookId = buttonData.cookId
                if (cookId) {
                    addMessage('bot', 'Taking you to cook\'s menu... 🍽️', [])
                    setTimeout(() => {
                        navigate(`/cook/${cookId}`)
                        setIsOpen(false)
                    }, 500)
                } else {
                    addMessage('bot', 'Meal information not available.', [
                        { label: '🏠 Back to Menu', action: 'back_to_dashboard', primary: false }
                    ])
                }
                setIsTyping(false)
                return
            }
            
            // Navigation actions
            if (action === 'navigate_orders') {
                addMessage('bot', 'Taking you to your orders... 📦', [])
                setTimeout(() => {
                    navigate('/orders')
                    setIsOpen(false)
                }, 500)
                setIsTyping(false)
                return
            }
            
            if (action === 'navigate_meals') {
                addMessage('bot', 'Taking you to browse meals... 🍽️', [])
                setTimeout(() => {
                    const isLoggedIn = !!localStorage.getItem('token')
                    navigate(isLoggedIn ? '/dashboard' : '/')
                    setIsOpen(false)
                }, 500)
                setIsTyping(false)
                return
            }
            
            if (action === 'navigate_complaint') {
                addMessage('bot', 'Taking you to file a complaint... 📝', [])
                setTimeout(() => {
                    navigate('/file-complaint')
                    setIsOpen(false)
                }, 500)
                setIsTyping(false)
                return
            }
            
            // Module actions
            if (action === 'browse_meals') {
                await showBrowseMealsModule()
            } else if (action === 'smart_recommend') {
                showSmartRecommendModule()
            } else if (action === 'explore_cooks') {
                await showExploreCooksModule()
            } else if (action === 'show_top_rated_cooks') {
                await showTopRatedCooks()
            } else if (action === 'show_all_cooks') {
                await showAllCooks()
            } else if (action === 'my_orders') {
                showMyOrdersModule()
            } else if (action === 'file_complaint' || action === 'file_complaint_from_orders') {
                handleFileComplaint()
            } else if (action === 'back_to_dashboard') {
                resetModule()
                showDashboard()
            }
            // Smart Recommend sub-actions
            else if (action === 'health_mode') {
                handleHealthMode()
            } else if (action === 'budget_mode') {
                handleBudgetMode()
            } else if (action === 'risk_mode') {
                handleRiskMode()
            } else if (action === 'show_safe_meals' || action === 'show_more_safe_meals') {
                if (contextMemory.healthCondition) {
                    await processHealthRecommendation(contextMemory.healthCondition)
                } else {
                    addMessage('bot', 'Please tell me your health condition first!', [
                        { label: '💊 Health Mode', action: 'health_mode' },
                        { label: '🏠 Back to Menu', action: 'back_to_dashboard' }
                    ])
                }
            } else if (action === 'show_budget_safe_meals') {
                if (contextMemory.healthCondition) {
                    const healthInfo = healthDatabase[contextMemory.healthCondition.toLowerCase()]
                    if (healthInfo) {
                        await processBudgetRecommendation(null, 250, healthInfo.filterPreference)
                    }
                }
            } else if (action === 'show_top_healthy_meals') {
                await processBudgetRecommendation(null, null, 'healthy')
            }
            // Browse meals sub-actions (ONLY 2 OPTIONS)
            else if (action === 'show_top_selling_meals') {
                await showTopSellingMeals()
            } else if (action === 'show_top_rated_meals') {
                await showTopRatedMealsMain()
            } else if (action.startsWith('browse_')) {
                // Redirect any old browse actions to main browse menu
                await showBrowseMealsModule()
            }
            
        } catch (error) {
            console.error('Button action error:', error)
            addMessage('bot', 'Sorry, something went wrong. Please try again! 😊', [
                { label: '🏠 Back to Menu', action: 'back_to_dashboard' }
            ])
        } finally {
            setIsTyping(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const toggleChat = () => {
        setIsOpen(!isOpen)
        setIsMinimized(false)
    }

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={toggleChat}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full w-16 h-16 shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 z-50 flex items-center justify-center group animate-float"
                    aria-label="Open chat"
                >
                    <FiMessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform duration-200" />
                    
                    {hasNewMessage && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold animate-bounce shadow-lg">
                            1
                        </span>
                    )}
                    
                    <span className="absolute inset-0 rounded-full bg-orange-500 opacity-75 animate-ping" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-slideUp border border-gray-200">
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
                                <h3 className="font-semibold text-base">Homely Meals AI</h3>
                                <p className="text-xs text-orange-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    {currentModule === 'dashboard' ? 'Main Menu' : 
                                     currentModule === 'browse_meals' ? 'Browse Meals' :
                                     currentModule === 'smart_recommend' ? 'Smart Recommend' :
                                     currentModule === 'explore_cooks' ? 'Explore Cooks' :
                                     currentModule === 'my_orders' ? 'My Orders' : 'Active'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {currentModule !== 'dashboard' && (
                                <button
                                    onClick={() => { resetModule(); showDashboard(); }}
                                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                                    aria-label="Back to menu"
                                    title="Back to Main Menu"
                                >
                                    <FiHome className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                                aria-label="Minimize chat"
                            >
                                <FiMinimize2 className="w-4 h-4" />
                            </button>
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
                    {!isMinimized && (
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
                                                        onClick={() => handleButtonClick(button.action, button)}
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
                    )}

                    {/* Input Area */}
                    {!isMinimized && (
                        <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    disabled={isTyping}
                                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-full focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all disabled:opacity-50 text-sm"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={inputText.trim() === '' || isTyping}
                                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                    aria-label="Send message"
                                >
                                    <FiSend className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Press Enter to send • AI-Powered Assistant
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Animation Styles */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                
                @keyframes ping {
                    75%, 100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }
                
                .animate-slideUp {
                    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .animate-float {
                    animation: float 3s ease-in-out infinite;
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

export default Chatbot
