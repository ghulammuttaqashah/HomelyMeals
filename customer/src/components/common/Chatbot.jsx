// src/components/common/Chatbot.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, Send, Bot, User as UserIcon } from 'lucide-react';

export function Chatbot({ user, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: `Hello ${user?.name || 'there'}! I'm your Homely Meals assistant. How can I help you today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = (userMessage) => {
    const lowerMessage = (userMessage || "").toLowerCase();
    // ... same response rules as before ...
    if (lowerMessage.includes('order') || lowerMessage.includes('buy')) {
      return "To place an order, browse the available meals on your dashboard and click the 'Order Now' button on your favorite dish!";
    }
    if (lowerMessage.includes('help')) {
      return "I'm here to help! Ask me about orders, profile or features.";
    }
    return "I'm not sure about that — try asking about orders, profile, or meals.";
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

  const close = () => {
    // if onClose provided as function, call it with navigate to let parent control
    if (typeof onClose === "function") {
      onClose(navigate);
    } else {
      navigate(-1);
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
          <Button variant="ghost" size="sm" onClick={close}>
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
                <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-orange-100' : 'text-gray-500'}`}>
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
