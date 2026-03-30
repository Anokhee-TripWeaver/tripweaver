import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const Chatbot = ({ user }) => {
  const greetings = ["hi", "hello", "hey", "hii", "hiii"];

  const isTravelIntent = (raw) => {
    const t = raw.toLowerCase();
    const words = t.trim().split(/\s+/).filter(Boolean);
    const travelWords = [
      "travel","trip","tour","vacation","holiday","visit","places","itenary","hotel","flight","airport",
      "stay","resort","sightseeing","things to do","explore","biryani","temple","museum","trek","beach","lake","mountain",
      "restaurant","food","eat","dine","cafe","budget","planner","packing","season"
    ];
    // allow simple greetings
    if (words.length === 1 && greetings.includes(words[0])) return true;
    // allow single-word potential places
    if (words.length === 1 && words[0].length >= 3) return true;
    return travelWords.some((w) => t.includes(w));
  };

  // Removed static local answers; all queries now go to backend after travel intent check.

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: 'Hello! I\'m TripWeaver AI. How can I help you plan your next adventure? ✈️\n\n**I can help with:**\n• Destination recommendations 🌍\n• Hotel & flight bookings 🏨✈️\n• Itinerary planning 📅\n• Travel tips & packing 🎒\n• Budget planning 💰\n\nWhere would you like to go?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enhanced text formatting function
  const formatText = (text) => {
    if (!text) return text;
    
    // Split by lines and process each line
    return text.split('\n').map((line, index) => {
      // Skip empty lines
      if (line.trim() === '') {
        return <div key={index} className="empty-line">&nbsp;</div>;
      }
      
      // Handle lines with emojis (headers)
      const emojiMatch = line.match(/[\u{1F300}-\u{1F9FF}]/gu);
      const isEmojiLine = emojiMatch && emojiMatch.length >= 2;
      
      if (isEmojiLine && line.length < 30) {
        return <div key={index} className="emoji-line">{line}</div>;
      }
      
      // Handle bold text with **
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={index} className="bold-line">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </div>
        );
      }
      
      // Handle bullet points (•, ✓, ✅, -)
      if (/^[•✓✅➤\-]\s/.test(line.trim())) {
        return (
          <div key={index} className="bullet-line">
            <span className="bullet-icon">•</span>
            <span className="bullet-text">{line.substring(1).trim()}</span>
          </div>
        );
      }
      
      // Handle numbered lists (1., 2., etc)
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={index} className="numbered-line">
            {line.trim()}
          </div>
        );
      }
      
      // Handle section headers (lines that are short and have text)
      if (line.length < 60 && (line.includes(':') || line.trim().endsWith(':'))) {
        return <div key={index} className="section-header">{line}</div>;
      }
      
      // Regular paragraph
      return <div key={index} className="regular-line">{line}</div>;
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const cleanedInput = input
      .replace(/restraunts|restraunt|resturant|reatraunst|restarunts|restarunt/gi, "restaurants")
    const words = cleanedInput.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const greetingOnly = words.length === 1 && greetings.includes(words[0]);

    const userMessage = { sender: 'user', text: cleanedInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // If it's not a travel query, reply politely and stop.
    if (!isTravelIntent(input)) {
      setMessages(prev => [...prev, { sender: 'bot', text: "I’m focused on travel planning—ask me about destinations, stays, transport, itineraries, or budgets." }]);
      setIsTyping(false);
      return;
    }

    try {
      const prompt = greetingOnly
        ? `${cleanedInput}\nThe user just greeted you. Reply with one short friendly line and ask for their destination and dates. Do not propose any destination or itinerary yet.`
        : `${cleanedInput}\n\nPlease answer directly with specific travel recommendations (places, hotels/restaurants, itinerary, best time, budget tips) and avoid asking follow-up questions.`;

      const response = await fetch('http://localhost:8090/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: prompt
        }),
        credentials: 'include'
      });

      const data = await response.json();
      const serverReply = (data?.reply || "").toString().trim();
      const genericFallback = "I'm here to help with travel! Share dates, budget, and interests so I can tailor ideas.";
      
      if (response.ok && serverReply) {
        setMessages(prev => [...prev, { sender: 'bot', text: serverReply }]);
      } else {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: '**Error** ⚠️\n\nSorry, I encountered an issue. Please try again!' 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: '**Connection Error** 🔌\n\nUnable to connect to the server. Please check your connection.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick travel suggestions
  const travelSuggestions = [
    "Plan a 5-day Italy itinerary",
    "Best beaches in Thailand for families",
    "Budget hotels in Paris near attractions",
    "What to pack for Japan in spring?",
    "Top 10 things to do in Bali",
    "Best time to visit Switzerland"
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        className="chatbot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close Chat" : "Open Travel Assistant"}
      >
        {isOpen ? '✕' : '✈️'}
      </button>

      {/* Chat Window */}
      <div className={`chatbot-container ${isOpen ? '' : 'minimized'}`}>
        <div className="chatbot-header">
          <h2>✈️ TripWeaver AI</h2>
          <button 
            className="close-btn"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ✕
          </button>
          {user && (
            <div className="user-info">
              Welcome, {user.name}! Ask me about travel planning.
            </div>
          )}
        </div>

        <div className="chat-window">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`chat-message ${msg.sender}-message`}
            >
              <div className="message-sender">
                {msg.sender === 'user' ? 'You' : 'TripWeaver AI'}
              </div>
              <div className="message-text">
                {formatText(msg.text)}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="chat-message bot-message">
              <div className="typing-indicator">
                <span className="typing-text">Planning your trip</span>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          {/* Travel Suggestions */}
          {!isTyping && messages.length <= 2 && (
            <div className="travel-suggestions">
              <div className="suggestions-title">
                ✨ Need travel ideas? ✨
              </div>
              <div className="suggestions-list">
                {travelSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="suggestion-button"
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => {
                        document.querySelector('.chat-input')?.focus();
                      }, 10);
                    }}
                  >
                    <span className="suggestion-emoji">
                      {idx === 0 ? '🇮🇹' : 
                       idx === 1 ? '🏝️' : 
                       idx === 2 ? '🏨' : 
                       idx === 3 ? '🎒' : 
                       idx === 4 ? '🏛️' : '🗺️'}
                    </span>
                    <span className="suggestion-text">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about travel destinations, hotels, or itineraries..."
            disabled={isTyping}
          />
          <button 
            className="send-btn" 
            onClick={sendMessage}
            disabled={isTyping || !input.trim()}
          >
            <span className="send-text">Send</span>
            <span className="send-arrow">➤</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
