import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import MissingDocumentModal from '@/components/modals/MissingDocumentModal';

interface PrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const permissionCategories = [
  {
    key: 'assets' as const,
    label: 'Assets',
    description: 'Bank accounts, cash, property values',
    icon: '💰',
  },
  {
    key: 'liabilities' as const,
    label: 'Liabilities',
    description: 'Loans, credit cards, mortgages',
    icon: '💳',
  },
  {
    key: 'transactions' as const,
    label: 'Transactions',
    description: 'Income, expenses, spending patterns',
    icon: '📊',
  },
  {
    key: 'epf' as const,
    label: 'EPF Balance',
    description: 'Retirement fund contributions and balance',
    icon: '🏦',
  },
  {
    key: 'creditScore' as const,
    label: 'Credit Score',
    description: 'Credit rating and factors',
    icon: '📈',
  },
  {
    key: 'investments' as const,
    label: 'Investments',
    description: 'Mutual funds, stocks, portfolio performance',
    icon: '📈',
  },
];

const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ isOpen, onClose }) => {
  const { permissions, updatePermissions, isLoading } = useFinancial();
  const { toast } = useToast();
  const [hasDocuments, setHasDocuments] = useState<Record<string, boolean>>({});
  const [missingDocumentModal, setMissingDocumentModal] = useState<{
    open: boolean;
    permissionType: string;
  }>({ open: false, permissionType: '' });
  const [isEnableAllFlow, setIsEnableAllFlow] = useState(false);
  const [processedDocuments, setProcessedDocuments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      checkDocuments();
    }
  }, [isOpen]);

  const checkDocuments = async () => {
    try {
      const response = await api.checkDocumentsForPermissions();
      setHasDocuments(response.data.hasDocuments);
    } catch (error) {
      console.error('Failed to check documents:', error);
    }
  };

  const handleToggle = async (category: keyof typeof permissions) => {
    const newValue = !permissions[category];
    
    // If enabling a permission, check if documents exist
    if (newValue && !hasDocuments[category]) {
      setIsEnableAllFlow(false); // This is a single toggle, not enable all flow
      setMissingDocumentModal({ open: true, permissionType: category });
      return;
    }
    
    updatePermissions({ [category]: newValue });
    
    toast({
      title: newValue ? 'Access Granted' : 'Access Revoked',
      description: `${permissionCategories.find(c => c.key === category)?.label} data access ${newValue ? 'enabled' : 'disabled'}.`,
      variant: newValue ? 'default' : 'destructive',
    });
  };

  const handleDocumentUploaded = async () => {
    // Capture the category before closing the modal
    const category = missingDocumentModal.permissionType as keyof typeof permissions;
    
    // Close the current modal immediately
    setMissingDocumentModal({ open: false, permissionType: '' });
    
    // Add to processed documents to prevent asking for it again
    setProcessedDocuments(prev => new Set([...prev, category]));
    
    // Refresh document status and enable the permission
    await checkDocuments();
    updatePermissions({ [category]: true });
    
    toast({
      title: 'Access Granted',
      description: `${permissionCategories.find(c => c.key === category)?.label} data access enabled.`,
    });
    
    // Only continue the flow if this was part of "Enable All"
    if (isEnableAllFlow) {
      setTimeout(async () => {
        // Find next unprocessed document type
        const unprocessedDocuments = permissionCategories.filter(
          cat => !processedDocuments.has(cat.key) && cat.key !== category
        );
        
        if (unprocessedDocuments.length > 0) {
          // Continue with next unprocessed document
          setMissingDocumentModal({ 
            open: true, 
            permissionType: unprocessedDocuments[0].key 
          });
          
          toast({
            title: 'Next Document Required',
            description: `Please upload documents for ${unprocessedDocuments[0].label} to continue enabling all permissions.`,
          });
        } else {
          // All document types have been processed, enable all permissions
          const allEnabled = permissionCategories.reduce(
            (acc, cat) => ({ ...acc, [cat.key]: true }),
            {}
          );
          
          await updatePermissions(allEnabled);
          setIsEnableAllFlow(false); // Reset the flow state
          setProcessedDocuments(new Set()); // Reset processed documents
          
          toast({
            title: 'All Access Granted',
            description: 'All documents uploaded successfully. Full access to all financial data enabled.',
          });
        }
      }, 1500); // Increased delay to ensure modal closes and document check completes
    }
  };

  const enableAllPermissions = async () => {
    // Reset processed documents for new "Enable All" flow
    setProcessedDocuments(new Set());
    
    // Set the enable all flow state
    setIsEnableAllFlow(true);
    
    // Start with the first permission category
    const firstCategory = permissionCategories[0];
    setMissingDocumentModal({ 
      open: true, 
      permissionType: firstCategory.key 
    });
    
    toast({
      title: 'Documents Required',
      description: `Please upload documents for ${permissionCategories.length} categories to enable all permissions.`,
      variant: 'destructive',
    });
  };

  const disableAllPermissions = async () => {
    // Disable all permission categories
    const allDisabled = permissionCategories.reduce(
      (acc, category) => ({ ...acc, [category.key]: false }),
      {}
    );
    
    console.log('Disabling all permissions:', allDisabled);
    await updatePermissions(allDisabled);
    
    toast({
      title: 'All Access Revoked',
      description: 'Access to all financial data disabled.',
      variant: 'destructive',
    });
  };

  const enabledCount = permissionCategories.filter(category => permissions[category.key]).length;
  const totalCount = permissionCategories.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Data Access Control
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {enabledCount}/{totalCount} categories enabled
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enableAllPermissions}
                  disabled={isLoading || enabledCount === totalCount}
                  className="flex-1"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Enable All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disableAllPermissions}
                  disabled={isLoading || enabledCount === 0}
                  className="flex-1"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Disable All
                </Button>
              </div>

              {/* Privacy Notice */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔒</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      Your Privacy Matters
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      AI insights are generated only from data categories you've enabled. 
                      Your financial data never leaves your device.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permission Categories */}
              <div className="space-y-4">
                {permissionCategories.map((category, index) => (
                  <motion.div
                    key={category.key}
                    className="permission-toggle"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{category.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            {category.label}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {permissions[category.key] ? (
                              <Eye className="w-4 h-4 text-success" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Switch
                              checked={permissions[category.key]}
                              onCheckedChange={() => handleToggle(category.key)}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Loading State */}
              {isLoading && (
                <motion.div
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="financial-card p-6 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Updating permissions...
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Missing Document Modal */}
          <MissingDocumentModal
            open={missingDocumentModal.open}
            onOpenChange={(open) => setMissingDocumentModal({ ...missingDocumentModal, open })}
            permissionType={missingDocumentModal.permissionType}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPanel;