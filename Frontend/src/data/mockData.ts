import { FinancialData, Permissions } from '@/types/financial';

export const mockFinancialData: FinancialData = {
  assets: [
    {
      id: '1',
      name: 'Savings Account',
      type: 'bank',
      value: 25000,
      currency: 'INR',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Current Account',
      type: 'bank',
      value: 8500,
      currency: 'INR',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: '3', 
      name: 'Cash on Hand',
      type: 'cash',
      value: 1200,
      currency: 'INR',
      lastUpdated: '2024-01-14T18:00:00Z'
    },
    {
      id: '4',
      name: 'Primary Residence',
      type: 'property',
      value: 450000,
      currency: 'INR',
      lastUpdated: '2024-01-01T00:00:00Z'
    }
  ],
  
  liabilities: [
    {
      id: '1',
      name: 'Home Mortgage',
      type: 'mortgage',
      balance: 280000,
      interestRate: 4.2,
      minimumPayment: 1800,
      currency: 'INR',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Credit Card',
      type: 'credit_card',
      balance: 4500,
      interestRate: 18.0,
      minimumPayment: 150,
      currency: 'INR',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: '3',
      name: 'Car Loan',
      type: 'loan',
      balance: 15000,
      interestRate: 6.5,
      minimumPayment: 450,
      currency: 'INR',
      lastUpdated: '2024-01-15T10:30:00Z'
    }
  ],
  
  transactions: [
    // Income transactions
    {
      id: '1',
      date: '2024-01-01',
      description: 'Salary',
      amount: 6500,
      category: 'Salary',
      type: 'income',
      account: 'Current Account',
      currency: 'INR'
    },
    {
      id: '2',
      date: '2024-01-03',
      description: 'Freelance Work',
      amount: 1200,
      category: 'Freelance',
      type: 'income',
      account: 'Current Account',
      currency: 'INR'
    },
    
    // Expense transactions
    {
      id: '3',
      date: '2024-01-02',
      description: 'Groceries - Tesco',
      amount: -450,
      category: 'Food & Groceries',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    {
      id: '4',
      date: '2024-01-05',
      description: 'Mortgage Payment',
      amount: -1800,
      category: 'Housing',
      type: 'expense',
      account: 'Current Account',
      currency: 'INR'
    },
    {
      id: '5',
      date: '2024-01-05',
      description: 'Car Loan Payment',
      amount: -450,
      category: 'Transportation',
      type: 'expense',
      account: 'Current Account',
      currency: 'INR'
    },
    {
      id: '6',
      date: '2024-01-08',
      description: 'Petrol - Shell',
      amount: -120,
      category: 'Transportation',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    {
      id: '7',
      date: '2024-01-10',
      description: 'Restaurant - Sushi King',
      amount: -85,
      category: 'Dining Out',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    {
      id: '8',
      date: '2024-01-12',
      description: 'Electricity Bill',
      amount: -180,
      category: 'Utilities',
      type: 'expense',
      account: 'Current Account',
      currency: 'INR'
    },
    {
      id: '9',
      date: '2024-01-14',
      description: 'Online Shopping',
      amount: -250,
      category: 'Shopping',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    {
      id: '10',
      date: '2024-01-15',
      description: 'Coffee - Starbucks',
      amount: -15,
      category: 'Dining Out',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    
    // Previous month transactions (December)
    {
      id: '11',
      date: '2023-12-28',
      description: 'Year-end Bonus',
      amount: 3000,
      category: 'Bonus',
      type: 'income',
      account: 'Savings Account',
      currency: 'INR'
    },
    {
      id: '12',
      date: '2023-12-15',
      description: 'Holiday Shopping',
      amount: -800,
      category: 'Shopping',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    },
    {
      id: '13',
      date: '2023-12-20',
      description: 'Family Dinner',
      amount: -200,
      category: 'Dining Out',
      type: 'expense',
      account: 'Credit Card',
      currency: 'INR'
    }
  ],
  
  epf: {
    employeeContribution: 650,
    employerContribution: 780,
    totalBalance: 125000,
    monthlyContribution: 1430,
    lastUpdated: '2024-01-01T00:00:00Z'
  },
  
  creditScore: {
    score: 745,
    rating: 'Excellent',
    factors: [
      'Consistent payment history',
      'Low credit utilization (12%)',
      'Long credit history (8 years)',
      'Good mix of credit types'
    ],
    lastUpdated: '2024-01-01T00:00:00Z'
  },
  
  investments: [
    {
      id: '1',
      name: 'CIMB Islamic Equity Growth Fund',
      type: 'mutual_fund',
      quantity: 1000,
      currentPrice: 2.45,
      totalValue: 2450,
      purchasePrice: 2.20,
      gainLoss: 250,
      gainLossPercentage: 11.36,
      currency: 'INR',
      lastUpdated: '2024-01-15T16:00:00Z'
    },
    {
      id: '2',
      name: 'Maybank Technology Sector Fund',
      type: 'mutual_fund',
      quantity: 500,
      currentPrice: 3.80,
      totalValue: 1900,
      purchasePrice: 4.10,
      gainLoss: -150,
      gainLossPercentage: -7.32,
      currency: 'INR',
      lastUpdated: '2024-01-15T16:00:00Z'
    },
    {
      id: '3',
      name: 'KLCI ETF',
      type: 'etf',
      quantity: 200,
      currentPrice: 16.50,
      totalValue: 3300,
      purchasePrice: 15.80,
      gainLoss: 140,
      gainLossPercentage: 4.43,
      currency: 'INR',
      lastUpdated: '2024-01-15T16:00:00Z'
    }
  ]
};

export const defaultPermissions: Permissions = {
  assets: false,
  liabilities: false,
  transactions: false,
  epf: false,
  creditScore: false,
  investments: false
};