import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, User, ArrowRight, Loader2, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am Nivara AI, your smart residential society assistant. How can I help you today? You can ask about society bylaws, visitor rules, maintenance payments, swimming pool timings, or get help drafting a maintenance complaint!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.askAi(text, currentUser.role, currentUser.apartmentId);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I am temporarily unable to connect to the assistant server. Please check your society guidelines or contact the estate office.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'What are the clubhouse booking rules & rates?',
    'What is the society visitor and delivery gate policy?',
    'When are maintenance dues collected and what is late fee?',
    'How do I report elevator breakdown or water leakage?',
  ];

  if (!isOpen) return null;

  return (
    <div id="ai-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div id="ai-drawer-panel" className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-amber-300 text-slate-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-white text-slate-900 flex items-center justify-between border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 border border-amber-200 rounded-xl text-amber-800">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-slate-900">Nivara AI Assistant</h3>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500">Smart Society Assistant & Bylaws Expert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-amber-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-amber-600/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gold-gradient text-white rounded-tr-none shadow-md shadow-amber-600/20'
                    : 'bg-amber-50 text-slate-800 border border-amber-200 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right font-mono ${
                    msg.sender === 'user' ? 'text-amber-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500 bg-amber-50 p-3 rounded-2xl border border-amber-200 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Nivara AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length < 3 && (
          <div className="px-4 py-2.5 bg-amber-50/60 border-t border-amber-200">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Quick Society Inquiries:
            </p>
            <div className="space-y-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-xs bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-600 p-2 rounded-lg border border-amber-200 transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-600 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-amber-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about rules, complaints, maintenance..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-slate-50 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 btn-gold disabled:opacity-50 text-white rounded-xl transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
