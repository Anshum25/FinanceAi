import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import AccountSummary from '../models/AccountSummary.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const seedFinancialData = async (userId) => {
  console.log('Seeding financial data for user:', userId);

  // Sample Transactions
  const transactions = [
    // Income transactions
    { user: userId, type: 'income', amount: 5000, description: 'Salary', category: 'salary', date: new Date('2024-01-15'), merchant: 'Company ABC' },
    { user: userId, type: 'income', amount: 5000, description: 'Salary', category: 'salary', date: new Date('2024-02-15'), merchant: 'Company ABC' },
    { user: userId, type: 'income', amount: 5000, description: 'Salary', category: 'salary', date: new Date('2024-03-15'), merchant: 'Company ABC' },
    { user: userId, type: 'income', amount: 500, description: 'Freelance Work', category: 'freelance', date: new Date('2024-03-20'), merchant: 'Client XYZ' },
    
    // Expense transactions
    { user: userId, type: 'expense', amount: 1200, description: 'Rent Payment', category: 'rent', date: new Date('2024-03-01'), merchant: 'Property Management' },
    { user: userId, type: 'expense', amount: 800, description: 'Groceries', category: 'groceries', date: new Date('2024-03-05'), merchant: 'Supermarket' },
    { user: userId, type: 'expense', amount: 300, description: 'Electricity Bill', category: 'utilities', date: new Date('2024-03-10'), merchant: 'Electric Company' },
    { user: userId, type: 'expense', amount: 150, description: 'Internet Bill', category: 'utilities', date: new Date('2024-03-12'), merchant: 'ISP Provider' },
    { user: userId, type: 'expense', amount: 200, description: 'Dining Out', category: 'food', date: new Date('2024-03-18'), merchant: 'Restaurant ABC' },
    { user: userId, type: 'expense', amount: 100, description: 'Gas Station', category: 'fuel', date: new Date('2024-03-20'), merchant: 'Shell' },
    { user: userId, type: 'expense', amount: 250, description: 'Shopping', category: 'shopping', date: new Date('2024-03-22'), merchant: 'Mall Store' },
    { user: userId, type: 'expense', amount: 80, description: 'Coffee & Snacks', category: 'food', date: new Date('2024-03-25'), merchant: 'Starbucks' },
  ];

  // Sample Assets
  const assets = [
    { user: userId, name: 'Savings Account', type: 'savings', currentValue: 15000, description: 'Emergency fund savings' },
    { user: userId, name: 'Fixed Deposit', type: 'investment', currentValue: 25000, description: '12-month fixed deposit at 3.5% APY' },
    { user: userId, name: 'Car', type: 'vehicle', currentValue: 35000, description: '2020 Honda Civic' },
    { user: userId, name: 'Laptop', type: 'other', currentValue: 2500, description: 'MacBook Pro for work' },
    { user: userId, name: 'Checking Account', type: 'checking', currentValue: 3500, description: 'Primary checking account' },
  ];

  // Sample Liabilities
  const liabilities = [
    { user: userId, name: 'Car Loan', type: 'car_loan', originalAmount: 20000, currentBalance: 18000, interestRate: 4.5, minimumPayment: 350, description: 'Auto loan for Honda Civic' },
    { user: userId, name: 'Credit Card', type: 'credit_card', originalAmount: 3000, currentBalance: 2500, interestRate: 18.9, minimumPayment: 75, description: 'Main credit card debt' },
    { user: userId, name: 'Student Loan', type: 'student_loan', originalAmount: 15000, currentBalance: 12000, interestRate: 6.8, minimumPayment: 150, description: 'Education loan' },
  ];

  // Sample Investments
  const investments = [
    { user: userId, name: 'Stock Portfolio', type: 'stock', quantity: 100, purchasePrice: 80, currentPrice: 85, purchaseDate: new Date('2023-01-15'), notes: 'Diversified stock portfolio' },
    { user: userId, name: 'Mutual Fund A', type: 'mutual_fund', quantity: 104, purchasePrice: 48.08, currentPrice: 50, purchaseDate: new Date('2023-06-01'), notes: 'Growth mutual fund' },
    { user: userId, name: 'ETF Portfolio', type: 'etf', quantity: 95, purchasePrice: 42.11, currentPrice: 40, purchaseDate: new Date('2023-03-10'), notes: 'Index ETF portfolio' },
  ];

  try {
    // Clear existing data for this user
    await Transaction.deleteMany({ user: userId });
    await Asset.deleteMany({ user: userId });
    await Liability.deleteMany({ user: userId });
    await Investment.deleteMany({ user: userId });
    await AccountSummary.deleteMany({ user: userId });

    // Insert new data
    await Transaction.insertMany(transactions);
    await Asset.insertMany(assets);
    await Liability.insertMany(liabilities);
    await Investment.insertMany(investments);

    // Calculate and create account summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalAssetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalLiabilityValue = liabilities.reduce((sum, l) => sum + l.currentBalance, 0);
    const netWorth = totalAssetValue - totalLiabilityValue;

    const accountSummary = {
      user: userId,
      netWorth,
      totalIncome,
      totalExpenses,
      monthlySpend: totalExpenses / 3, // Average over 3 months
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      categoryBreakdown: [
        { category: 'Housing', amount: 1200, percentage: 40 },
        { category: 'Food & Groceries', amount: 1080, percentage: 36 },
        { category: 'Utilities', amount: 450, percentage: 15 },
        { category: 'Transportation', amount: 100, percentage: 3.3 },
        { category: 'Shopping', amount: 250, percentage: 8.3 }
      ],
      recurringVendors: [
        { vendor: 'Property Management', amount: 1200, frequency: 'monthly' },
        { vendor: 'Electric Company', amount: 300, frequency: 'monthly' },
        { vendor: 'ISP Provider', amount: 150, frequency: 'monthly' }
      ],
      monthlyTrends: [
        { month: '2024-01', income: 5000, expenses: 2800, savings: 2200 },
        { month: '2024-02', income: 5000, expenses: 2900, savings: 2100 },
        { month: '2024-03', income: 5500, expenses: 3080, savings: 2420 }
      ]
    };

    await AccountSummary.create(accountSummary);

    console.log('✅ Sample financial data seeded successfully!');
    console.log(`📊 Created ${transactions.length} transactions`);
    console.log(`💰 Created ${assets.length} assets`);
    console.log(`💳 Created ${liabilities.length} liabilities`);
    console.log(`📈 Created ${investments.length} investments`);
    console.log(`📋 Created account summary with net worth: $${netWorth.toLocaleString()}`);

  } catch (error) {
    console.error('Error seeding financial data:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    await connectDB();
    
    // Find the user (assuming there's at least one user)
    const user = await User.findOne().select('_id name email');
    if (!user) {
      console.error('❌ No user found in database. Please create a user account first.');
      process.exit(1);
    }

    console.log(`🔍 Found user: ${user.name} (${user.email})`);
    
    await seedFinancialData(user._id);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('💡 You can now refresh your frontend to see the data in AI Insights.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
};

// Run the seeding script
seedDatabase();
