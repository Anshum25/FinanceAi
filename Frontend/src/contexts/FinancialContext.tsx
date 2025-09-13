import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinancialData, Permissions } from '@/types/financial';
import { mockFinancialData, defaultPermissions } from '@/data/mockData';
import * as api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialContextType {
  financialData: FinancialData;
  permissions: Permissions;
  updatePermissions: (newPermissions: Partial<Permissions>) => void;
  getFilteredData: () => Partial<FinancialData>;
  isLoading: boolean;
  awaitingImport: boolean;
  setAwaitingImport: (val: boolean) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData>(mockFinancialData);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingImport, _setAwaitingImport] = useState<boolean>(() => {
    try {
      return localStorage.getItem("awaitingImport") === "true";
    } catch {
      return false;
    }
  });

  const setAwaitingImport = (val: boolean) => {
    _setAwaitingImport(val);
    try {
      localStorage.setItem("awaitingImport", String(val));
    } catch {}
  };

  // Fetch financial data from backend
  const fetchFinancialData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch data from different endpoints
      const [assetsRes, liabilitiesRes, transactionsRes, investmentsRes] = await Promise.allSettled([
        api.getAssets(),
        api.getLiabilities(), 
        api.getTransactions(),
        api.getInvestments()
      ]);

      const newData: Partial<FinancialData> = {};
      
      if (assetsRes.status === 'fulfilled') {
        newData.assets = assetsRes.value;
      }
      if (liabilitiesRes.status === 'fulfilled') {
        newData.liabilities = liabilitiesRes.value;
      }
      if (transactionsRes.status === 'fulfilled') {
        newData.transactions = transactionsRes.value;
      }
      if (investmentsRes.status === 'fulfilled') {
        newData.investments = investmentsRes.value;
      }

      setFinancialData(prev => ({ ...prev, ...newData }));
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user permissions from backend
  const fetchPermissions = async () => {
    if (!user) return;
    
    try {
      const userPermissions = await api.getUserPermissions();
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const updatePermissions = async (newPermissions: Partial<Permissions>) => {
    setIsLoading(true);
    try {
      // Update local state immediately for better UX
      setPermissions(prev => ({ ...prev, ...newPermissions }));
      
      // Try to update backend, but don't fail if it's not available
      try {
        await api.updateUserPermissions(newPermissions);
      } catch (apiError) {
        console.warn('Backend not available, permissions saved locally only:', apiError);
      }
      
      // Refetch data based on new permissions
      await fetchFinancialData();
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when user changes or component mounts
  useEffect(() => {
    if (user) {
      fetchPermissions();
      fetchFinancialData();
    }
  }, [user]);

  const getFilteredData = (): Partial<FinancialData> => {
    const filtered: Partial<FinancialData> = {};
    
    if (permissions.assets) filtered.assets = financialData.assets;
    if (permissions.liabilities) filtered.liabilities = financialData.liabilities;
    if (permissions.transactions) filtered.transactions = financialData.transactions;
    if (permissions.epf) filtered.epf = financialData.epf;
    if (permissions.creditScore) filtered.creditScore = financialData.creditScore;
    if (permissions.investments) filtered.investments = financialData.investments;
    
    return filtered;
  };

  return (
    <FinancialContext.Provider
      value={{
        financialData,
        permissions,
        updatePermissions,
        getFilteredData,
        isLoading,
        awaitingImport,
        setAwaitingImport,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};