import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { FinancialProvider } from '@/contexts/FinancialContext';
import { ChatProvider } from '@/contexts/ChatContext';
import Navbar from '@/components/layout/Navbar';
import Dashboard from '@/components/dashboard/Dashboard';
import PrivacyPanel from '@/components/dashboard/PrivacyPanel';
import ChatInterface from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FinanceApp: React.FC = () => {
  const [isPrivacyPanelOpen, setIsPrivacyPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FinancialProvider>
        <ChatProvider>
          <div className="min-h-screen bg-background">
            {/* Navigation */}
            <Navbar
              onTogglePermissions={() => setIsPrivacyPanelOpen(true)}
              onToggleChat={() => setIsChatOpen(true)}
            />

            {/* Main Dashboard */}
            <Dashboard 
              onTogglePermissions={() => setIsPrivacyPanelOpen(true)}
            />

            {/* Privacy Panel */}
            <PrivacyPanel
              isOpen={isPrivacyPanelOpen}
              onClose={() => setIsPrivacyPanelOpen(false)}
            />

            {/* Chat Interface */}
            <ChatInterface
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />

            {/* Floating Chat Button (Mobile) */}
            {!isChatOpen && (
              <motion.div
                className="fixed bottom-6 right-6 z-30 md:hidden"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 1
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  onClick={() => setIsChatOpen(true)}
                  className="btn-hero w-14 h-14 rounded-full shadow-glow"
                >
                  <MessageCircle className="w-6 h-6" />
                </Button>
              </motion.div>
            )}
          </div>
        </ChatProvider>
      </FinancialProvider>
    </ThemeProvider>
  );
};

export default FinanceApp;