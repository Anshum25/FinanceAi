import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { InsightEngine } from '@/utils/insightEngine';
import { Badge } from '@/components/ui/badge';
import { useVoiceInput, useTextToSpeech } from '@/hooks/useVoiceInput';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const { messages, isTyping, addMessage, setTyping } = useChat();
  const { getFilteredData, permissions } = useFinancial();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice functionality
  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error: voiceError
  } = useVoiceInput({
    continuous: false,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setInput(transcript.trim());
        resetTranscript();
      }
    }
  });

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: ttsSupported
  } = useTextToSpeech({
    rate: 0.9,
    pitch: 1,
    volume: 0.8
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage
    });

    // Set typing state
    setTyping(true);

    // Simulate AI processing delay
    setTimeout(async () => {
      const filteredData = getFilteredData();
      const insightEngine = new InsightEngine(filteredData);
      
      try {
        const response = await insightEngine.processNaturalLanguageQuery(userMessage);
        const dataUsed = getDataCategoriesUsed(userMessage);
        
        addMessage({
          role: 'assistant',
          content: response,
          dataUsed
        });

        // Optionally speak the response
        if (ttsSupported && response.length < 200) {
          speak(response);
        }
      } catch (error) {
        addMessage({
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again."
        });
      } finally {
        setTyping(false);
      }
    }, 1500);
  };

  const getDataCategoriesUsed = (query: string): string[] => {
    const usedCategories: string[] = [];
    const lowerQuery = query.toLowerCase();

    if ((lowerQuery.includes('spend') || lowerQuery.includes('expense') || lowerQuery.includes('transaction')) && permissions.transactions) {
      usedCategories.push('Transactions');
    }
    if ((lowerQuery.includes('asset') || lowerQuery.includes('account') || lowerQuery.includes('balance')) && permissions.assets) {
      usedCategories.push('Assets');
    }
    if ((lowerQuery.includes('debt') || lowerQuery.includes('loan') || lowerQuery.includes('liability')) && permissions.liabilities) {
      usedCategories.push('Liabilities');
    }
    if ((lowerQuery.includes('net worth') || lowerQuery.includes('worth')) && (permissions.assets || permissions.liabilities)) {
      usedCategories.push('Assets', 'Liabilities');
    }
    if (lowerQuery.includes('investment') && permissions.investments) {
      usedCategories.push('Investments');
    }
    if (lowerQuery.includes('credit') && permissions.creditScore) {
      usedCategories.push('Credit Score');
    }
    if (lowerQuery.includes('epf') && permissions.epf) {
      usedCategories.push('EPF');
    }

    return [...new Set(usedCategories)];
  };

  const sampleQuestions = [
    "How much did I spend last month?",
    "What's my current net worth?",
    "Can I afford a vacation next month?",
    "How can I pay off my debt faster?",
    "What are my biggest expenses?"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Chat Panel */}
          <motion.div
            className="fixed bottom-0 right-0 md:bottom-4 md:right-4 w-full md:w-96 h-full md:h-[600px] bg-card border-l md:border border-border shadow-2xl z-50 md:rounded-xl overflow-hidden flex flex-col"
            initial={{ 
              y: '100%',
              x: 0,
              scale: 1
            }}
            animate={{ 
              y: 0,
              x: 0,
              scale: 1
            }}
            exit={{ 
              y: '100%',
              x: 0,
              scale: 1
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary-glow/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Financial AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">Ask me about your finances</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🤖</div>
                  <h4 className="font-semibold text-foreground mb-2">Hello! I'm your AI financial assistant</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about your finances. Here are some examples:
                  </p>
                  <div className="space-y-2">
                    {sampleQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full text-left justify-start text-xs"
                        onClick={() => setInput(question)}
                      >
                        "{question}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <p className="text-sm">{message.content}</p>
                    {message.dataUsed && message.dataUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.dataUsed.map((category) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            🔒 {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="chat-bubble-ai">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask about your finances..."}
                    disabled={isTyping || isListening}
                    className="pr-10"
                  />
                  {transcript && !input && (
                    <div className="absolute inset-0 px-3 py-2 text-muted-foreground italic">
                      {transcript}
                    </div>
                  )}
                </div>
                
                {/* Voice Input Button */}
                {voiceSupported && (
                  <Button
                    type="button"
                    variant={isListening ? "destructive" : "outline"}
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isTyping}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}

                {/* TTS Control Button */}
                {ttsSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isSpeaking ? cancelSpeech : undefined}
                    disabled={!isSpeaking}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  disabled={!input.trim() || isTyping || isListening}
                  size="sm"
                  className="btn-hero"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              
              {voiceError && (
                <p className="text-xs text-danger mt-2">{voiceError}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatInterface;