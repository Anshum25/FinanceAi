export interface Asset {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'property' | 'investment' | 'other';
  value: number;
  currency: string;
  lastUpdated: string;
}

export interface Liability {
  id: string;
  name: string;
  type: 'loan' | 'credit_card' | 'mortgage' | 'other';
  balance: number;
  interestRate: number;
  minimumPayment: number;
  currency: string;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'transfer';
  account: string;
  currency: string;
}

export interface EPFData {
  employeeContribution: number;
  employerContribution: number;
  totalBalance: number;
  monthlyContribution: number;
  lastUpdated: string;
}

export interface CreditScore {
  score: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  factors: string[];
  lastUpdated: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'mutual_fund' | 'stock' | 'bond' | 'etf' | 'crypto';
  quantity: number;
  currentPrice: number;
  totalValue: number;
  purchasePrice: number;
  gainLoss: number;
  gainLossPercentage: number;
  currency: string;
  lastUpdated: string;
}

export interface FinancialData {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  epf: EPFData;
  creditScore: CreditScore;
  investments: Investment[];
}

export interface Permissions {
  assets: boolean;
  liabilities: boolean;
  transactions: boolean;
  epf: boolean;
  creditScore: boolean;
  investments: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataUsed?: string[];
}

export interface AIInsight {
  id: string;
  title: string;
  content: string;
  type: 'spending' | 'savings' | 'debt' | 'investment' | 'alert';
  severity: 'info' | 'warning' | 'success' | 'error';
  dataUsed: string[];
  timestamp: string;
}