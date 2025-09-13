import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinancialData, Permissions } from '@/types/financial';
import { mockFinancialData, defaultPermissions } from '@/data/mockData';

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
  const [financialData] = useState<FinancialData>(mockFinancialData);
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

  const updatePermissions = (newPermissions: Partial<Permissions>) => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setPermissions(prev => ({ ...prev, ...newPermissions }));
      setIsLoading(false);
    }, 500);
  };

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