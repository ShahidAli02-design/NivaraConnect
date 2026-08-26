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
    <div id="ai-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="ai-drawer-panel" className="w-full max-w-md bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-800 text-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">Nivara AI Assistant</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400">Smart Society Assistant & Bylaws Expert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-600/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right font-mono ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-400 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Nivara AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length < 3 && (
          <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Quick Society Inquiries:
            </p>
            <div className="space-y-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-xs bg-slate-900 hover:bg-slate-850 hover:border-indigo-500/40 text-slate-300 p-2 rounded-lg border border-slate-800 transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800">
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
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-900 text-slate-200 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
