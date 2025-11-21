import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, Send, Bot, User as UserIcon } from 'lucide-react';

export function Chatbot({ user, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: `Hello ${user.name}! I'm your Homely Meals assistant. How can I help you today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // Customer-specific responses
    if (user.type === 'customer') {
      if (lowerMessage.includes('order') || lowerMessage.includes('buy')) {
        return "To place an order, browse the available meals on your dashboard and click the 'Order Now' button on your favorite dish!";
      }
      if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
        return "You can search for meals using the search bar on your dashboard. You can also filter by category, cuisine type, and sort by price or rating!";
      }
      if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
        return "Delivery times vary by cook. You can see the preparation time on each meal card. Make sure your delivery address is updated in your profile!";
      }
      if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
        return "We accept various payment methods including credit cards, debit cards, and digital wallets. Payment is processed securely at checkout.";
      }
    }

    // Cook-specific responses
    if (user.type === 'cook') {
      if (lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new meal')) {
        return "To add a new meal, click the 'Add New Meal' button on your dashboard. Fill in all the details including name, description, price, and category!";
      }
      if (lowerMessage.includes('edit') || lowerMessage.includes('update')) {
        return "You can edit any of your meals by clicking the 'Edit' button on the meal card. Don't forget to save your changes!";
      }
      if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
        return "To delete a meal, click the trash icon on the meal card. Be careful - this action cannot be undone!";
      }
      if (lowerMessage.includes('available') || lowerMessage.includes('hide') || lowerMessage.includes('show')) {
        return "You can toggle meal availability using the 'Hide' or 'Show' button on each meal card. This controls whether customers can see and order your meal.";
      }
    }

    // General responses
    if (lowerMessage.includes('profile') || lowerMessage.includes('account')) {
      return "You can view and edit your profile by clicking the 'Profile' button in the header. Update your personal information, contact details, and preferences there.";
    }
    if (lowerMessage.includes('sentiment') || lowerMessage.includes('analytics')) {
      return "Check out the Sentiment Analysis page to see customer feedback trends and insights about your experience on Homely Meals!";
    }
    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return "I'm here to help! You can ask me about orders, meals, your profile, or any features of Homely Meals. What would you like to know?";
    }
    if (lowerMessage.includes('logout') || lowerMessage.includes('sign out')) {
      return "To logout, click the 'Logout' button in the header. You'll be redirected to the login page.";
    }
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      return "Hello! How can I assist you today? Feel free to ask me anything about Homely Meals!";
    }
    if (lowerMessage.includes('thank')) {
      return "You're welcome! Let me know if you need anything else. Happy cooking/eating! 😊";
    }

    // Default response
    return "I'm not sure about that, but I can help you with orders, meal management, profile settings, and general questions about Homely Meals. What would you like to know?";
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: generateBotResponse(inputValue),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-orange-600" />
            <CardTitle>Homely Meals Assistant</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-orange-600" />
                </div>
              )}

              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-orange-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleSendMessage} className="bg-orange-600 hover:bg-orange-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
