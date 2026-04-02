import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import API_BASE from "../config";

const Chatbot = ({ user, pageContext }) => {
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
  
  // Resizable state
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleResizeMove = (e) => {
    if (isResizing) {
      const deltaX = resizeStart.x - e.clientX;
      const deltaY = resizeStart.y - e.clientY;
      
      const newWidth = Math.max(320, Math.min(800, resizeStart.width + deltaX));
      const newHeight = Math.max(400, Math.min(800, resizeStart.height + deltaY));
      
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart]);

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

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/chat/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          context: {
            page: window.location.pathname,
            user: user ? { username: user.username || user.name, email: user.email } : null,
            ...(pageContext || {})
          }
        }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log('[Agent Response]', data); // debug

      if (response.ok) {
        // Parse suggest actions out of reply text before displaying
        const suggestRegex = /\[ACTION:suggest\|([^\]]+)\]/g;
        const suggests = [];
        let cleanReply = data.reply || '';
        let match;
        while ((match = suggestRegex.exec(data.reply || '')) !== null) {
          const parts = match[1].split('|').reduce((acc, p) => {
            const [k, ...v] = p.split(':');
            acc[k.trim()] = v.join(':').trim();
            return acc;
          }, {});
          suggests.push(parts);
          cleanReply = cleanReply.replace(match[0], '').trim();
        }

        // Also handle suggests from structured actionData
        const allSuggests = suggests.length > 0 ? suggests
          : (data.action === 'suggest' && data.actionData?.suggests) ? data.actionData.suggests : [];

        setMessages(prev => [...prev, {
          sender: 'bot',
          text: cleanReply || data.error,
          suggests: allSuggests
        }]);

        // Only execute non-navigate/suggest actions automatically
        if (data.action && data.action !== 'navigate' && data.action !== 'suggest') {
          await executeAction(data.action, data.actionData, currentInput, data.reply);
        }
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Sorry, I encountered an issue. Please try again!' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: '🔌 Unable to connect to the server. Please check your connection.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const executeAction = async (action, actionData, originalMessage, botReply) => {
    try {
      if (action === 'navigate' && actionData?.path) {
        const state = (actionData.destination || actionData.startDate) ? {
          restore: {
            destination: actionData.destination || '',
            origin: actionData.origin || '',
            budget: actionData.budget || '',
            searchDate: actionData.startDate || '',
            endDate: actionData.endDate || '',
            autoSearch: !!(actionData.destination && actionData.startDate && actionData.endDate)
          }
        } : undefined;
        setTimeout(() => {
          if (state) {
            // Use sessionStorage so data survives the page navigation
            sessionStorage.setItem('agent_navigate', JSON.stringify(state.restore));
          }
          window.location.href = actionData.path;
        }, 1200);

      } else if (action === 'send_email') {
        // Extract email from message if not in actionData
        let toEmail = actionData?.to;
        if (!toEmail || toEmail === 'unknown') {
          const emailMatch = originalMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          toEmail = emailMatch ? emailMatch[0] : user?.email;
        }
        if (!toEmail) {
          setMessages(prev => [...prev, { sender: 'bot', text: '📧 Please provide your email address so I can send it to you!' }]);
          return;
        }

        // Convert bot's reply markdown to readable HTML
        const replyHtml = (botReply || originalMessage)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^#{1,3} (.+)$/gm, '<h3 style="color:#e85d26">$1</h3>')
          .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>');

        const emailRes = await fetch(`${API_BASE}/chat/agent/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail,
            subject: actionData?.subject || 'TripWeaver - Your Travel Itinerary',
            content: `<html><body style="font-family:Arial;padding:20px;max-width:600px;margin:auto">
              <div style="background:linear-gradient(135deg,#e85d26,#f97316);padding:20px;border-radius:10px 10px 0 0;text-align:center">
                <h2 style="color:white;margin:0">✈️ TripWeaver Travel Itinerary</h2>
              </div>
              <div style="background:#fff;padding:20px;border:1px solid #eee;border-radius:0 0 10px 10px">
                <p style="color:#666">Here's the itinerary you requested:</p>
                <div style="background:#f9f9f9;padding:15px;border-radius:8px;line-height:1.8">${replyHtml}</div>
                <br><p style="color:#888">Safe travels! ✈️</p>
                <p><strong>TripWeaver Team</strong></p>
              </div>
            </body></html>`
          }),
          credentials: 'include'
        });
        const emailData = await emailRes.json();
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: emailRes.ok ? `✅ Email sent to ${toEmail}!` : `❌ Failed to send email: ${emailData.error}`
        }]);

      } else if (action === 'join_trip') {
        if (!user) {
          setMessages(prev => [...prev, { sender: 'bot', text: '🔐 Please log in first to join a trip!' }]);
          return;
        }
        const joinRes = await fetch(`${API_BASE}/chat/agent/join-trip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: actionData?.tripId,
            destination: actionData?.destination,
            startDate: actionData?.startDate,
            endDate: actionData?.endDate,
            hostEmail: actionData?.hostEmail,
            hostName: actionData?.hostName,
            requesterEmail: actionData?.requesterEmail || user?.email,
            requesterName: actionData?.requesterName || user?.username || user?.name,
            pricePerPerson: actionData?.pricePerPerson
          }),
          credentials: 'include'
        });
        const joinData = await joinRes.json();
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: joinRes.ok
            ? `✅ Join request sent for the trip to ${actionData?.destination}! The host will be notified.`
            : `❌ ${joinData.error || 'Failed to send join request'}`
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Action failed: ' + err.message }]);
    }
  };

  const handleSuggestClick = (suggest) => {
    const path = suggest.path || '/';
    if (suggest.destination || suggest.startDate) {
      sessionStorage.setItem('agent_navigate', JSON.stringify({
        destination: suggest.destination || '',
        origin: suggest.origin || '',
        budget: suggest.budget || '',
        searchDate: suggest.startDate || '',
        endDate: suggest.endDate || '',
        autoSearch: !!(suggest.destination && suggest.startDate && suggest.endDate && suggest.budget)
      }));
    }
    window.location.href = path;
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
      <div 
        ref={chatContainerRef}
        className={`chatbot-container ${isOpen ? '' : 'minimized'}`}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`
        }}
      >
        {/* Resize Handle */}
        <div 
          className="resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
        
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
                {msg.suggests && msg.suggests.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {msg.suggests.map((s, si) => (
                      <button key={si} onClick={() => handleSuggestClick(s)}
                        style={{
                          background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                          color: '#fff', border: 'none', borderRadius: 20,
                          padding: '7px 14px', cursor: 'pointer', fontSize: '0.85rem',
                          fontWeight: 600, textAlign: 'left', width: 'fit-content',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                        }}>
                        {s.label || '→ Open'}
                      </button>
                    ))}
                  </div>
                )}
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
