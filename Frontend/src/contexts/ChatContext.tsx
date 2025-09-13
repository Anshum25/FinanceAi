import React, { createContext, useContext, useState } from 'react';
import { ChatMessage, AIInsight } from '@/types/financial';

interface ChatContextType {
  messages: ChatMessage[];
  insights: AIInsight[];
  isTyping: boolean;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addInsight: (insight: Omit<AIInsight, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  setTyping: (typing: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addInsight = (insight: Omit<AIInsight, 'id' | 'timestamp'>) => {
    const newInsight: AIInsight = {
      ...insight,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setInsights(prev => [...prev, newInsight]);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const setTyping = (typing: boolean) => {
    setIsTyping(typing);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        insights,
        isTyping,
        addMessage,
        addInsight,
        clearChat,
        setTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};