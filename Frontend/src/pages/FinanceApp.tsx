import React, { useState, useEffect } from 'react';
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
import ImportDataModal from '@/components/modals/ImportDataModal';
import { useFinancial } from '@/contexts/FinancialContext';

const InnerApp: React.FC = () => {
  const [isPrivacyPanelOpen, setIsPrivacyPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { awaitingImport } = useFinancial();
  const [importOpen, setImportOpen] = useState(false);

  const hasDismissed = (() => {
    try { return localStorage.getItem("importDismissed") === "true"; } catch { return false; }
  })();

  const openImport = () => {
    try { localStorage.removeItem("importDismissed"); } catch {}
    setImportOpen(true);
  };

  useEffect(() => {
    if (awaitingImport && !hasDismissed) setImportOpen(true);
  }, [awaitingImport, hasDismissed]);

  return (
    <div className="min-h-screen bg-background">
            {/* Navigation */}
            <Navbar
              onTogglePermissions={() => setIsPrivacyPanelOpen(true)}
              onToggleChat={() => setIsChatOpen(true)}
            />

            {/* Main Dashboard */}
            <Dashboard 
              onTogglePermissions={() => setIsPrivacyPanelOpen(true)}
              onOpenImport={openImport}
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

            {/* Import Data Modal */}
            <ImportDataModal
              open={importOpen}
              onOpenChange={(open) => {
                setImportOpen(open);
                if (!open) {
                  try {
                    // If user closed the modal (X) without importing, remember dismissal
                    const imported = localStorage.getItem("dataImported") === "true";
                    if (!imported) localStorage.setItem("importDismissed", "true");
                  } catch {}
                }
              }}
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
  );
};

const FinanceApp: React.FC = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <FinancialProvider>
      <ChatProvider>
        <InnerApp />
      </ChatProvider>
    </FinancialProvider>
  </ThemeProvider>
);

export default FinanceApp;