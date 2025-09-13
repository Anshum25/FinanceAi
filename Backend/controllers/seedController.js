import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import AccountSummary from '../models/AccountSummary.js';
import AppError from '../utils/appError.js';

export const seedUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Clear existing data for this user
    await Promise.all([
      Transaction.deleteMany({ user: userId }),
      Asset.deleteMany({ user: userId }),
      Liability.deleteMany({ user: userId }),
      Investment.deleteMany({ user: userId }),
      AccountSummary.deleteMany({ user: userId })
    ]);

    // Sample Transactions
    const transactions = [
      { user: userId, type: 'income', amount: 5000, description: 'Salary', category: 'salary', date: new Date('2024-03-15'), merchant: 'Company ABC' },
      { user: userId, type: 'income', amount: 500, description: 'Freelance Work', category: 'freelance', date: new Date('2024-03-20'), merchant: 'Client XYZ' },
      { user: userId, type: 'expense', amount: 1200, description: 'Rent Payment', category: 'rent', date: new Date('2024-03-01'), merchant: 'Property Management' },
      { user: userId, type: 'expense', amount: 800, description: 'Groceries', category: 'groceries', date: new Date('2024-03-05'), merchant: 'Supermarket' },
      { user: userId, type: 'expense', amount: 300, description: 'Electricity Bill', category: 'utilities', date: new Date('2024-03-10'), merchant: 'Electric Company' },
      { user: userId, type: 'expense', amount: 150, description: 'Internet Bill', category: 'utilities', date: new Date('2024-03-12'), merchant: 'ISP Provider' },
      { user: userId, type: 'expense', amount: 200, description: 'Dining Out', category: 'food', date: new Date('2024-03-18'), merchant: 'Restaurant ABC' },
      { user: userId, type: 'expense', amount: 100, description: 'Gas Station', category: 'fuel', date: new Date('2024-03-20'), merchant: 'Shell' },
    ];

    // Sample Assets
    const assets = [
      { user: userId, name: 'Savings Account', type: 'savings', currentValue: 15000, description: 'Emergency fund savings' },
      { user: userId, name: 'Checking Account', type: 'checking', currentValue: 3500, description: 'Primary checking account' },
      { user: userId, name: 'Fixed Deposit', type: 'investment', currentValue: 25000, description: '12-month fixed deposit at 3.5% APY' },
      { user: userId, name: 'Car', type: 'vehicle', currentValue: 35000, description: '2020 Honda Civic' },
    ];

    // Sample Liabilities
    const liabilities = [
      { user: userId, name: 'Car Loan', type: 'car_loan', originalAmount: 20000, currentBalance: 18000, interestRate: 4.5, minimumPayment: 350, description: 'Auto loan for Honda Civic' },
      { user: userId, name: 'Credit Card', type: 'credit_card', originalAmount: 3000, currentBalance: 2500, interestRate: 18.9, minimumPayment: 75, description: 'Main credit card debt' },
    ];

    // Sample Investments
    const investments = [
      { user: userId, name: 'Stock Portfolio', type: 'stock', quantity: 100, purchasePrice: 80, currentPrice: 85, purchaseDate: new Date('2023-01-15'), notes: 'Diversified stock portfolio' },
      { user: userId, name: 'Mutual Fund A', type: 'mutual_fund', quantity: 104, purchasePrice: 48.08, currentPrice: 50, purchaseDate: new Date('2023-06-01'), notes: 'Growth mutual fund' },
    ];

    // Insert all data
    const [createdTransactions, createdAssets, createdLiabilities, createdInvestments] = await Promise.all([
      Transaction.insertMany(transactions),
      Asset.insertMany(assets),
      Liability.insertMany(liabilities),
      Investment.insertMany(investments)
    ]);

    // Calculate totals
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalAssetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalLiabilityValue = liabilities.reduce((sum, l) => sum + l.currentBalance, 0);
    const netWorth = totalAssetValue - totalLiabilityValue;

    // Create account summary
    const accountSummary = {
      user: userId,
      netWorth,
      totalIncome,
      totalExpenses,
      monthlySpend: totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      categoryBreakdown: [
        { category: 'rent', amount: 1200, percentage: 48.0 },
        { category: 'groceries', amount: 800, percentage: 32.0 },
        { category: 'utilities', amount: 450, percentage: 18.0 },
        { category: 'food', amount: 200, percentage: 8.0 },
        { category: 'fuel', amount: 100, percentage: 4.0 }
      ],
      recurringVendors: [
        { vendor: 'Property Management', amount: 1200, frequency: 'monthly' },
        { vendor: 'Electric Company', amount: 300, frequency: 'monthly' },
        { vendor: 'ISP Provider', amount: 150, frequency: 'monthly' }
      ],
      monthlyTrends: [
        { month: '2024-03', income: 5500, expenses: 2750, savings: 2750 }
      ]
    };

    const createdSummary = await AccountSummary.create(accountSummary);

    res.status(200).json({
      status: 'success',
      message: 'Sample data seeded successfully',
      data: {
        transactions: createdTransactions.length,
        assets: createdAssets.length,
        liabilities: createdLiabilities.length,
        investments: createdInvestments.length,
        netWorth: netWorth,
        summary: createdSummary
      }
    });

  } catch (error) {
    console.error('Seeding error:', error);
    next(new AppError('Failed to seed data', 500));
  }
};
