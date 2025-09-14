import mongoose from 'mongoose';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai';

// Test user ID (from previous sessions)
const TEST_USER_ID = '507f1f77bcf86cd799439011';

async function restoreFinancialData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data for test user
    await Promise.all([
      Asset.deleteMany({ userId: TEST_USER_ID }),
      Liability.deleteMany({ userId: TEST_USER_ID }),
      Transaction.deleteMany({ userId: TEST_USER_ID }),
      Investment.deleteMany({ userId: TEST_USER_ID })
    ]);

    console.log('Cleared existing financial data');

    // Create assets to achieve Net Worth of ₹1,85,000
    const assets = [
      {
        userId: TEST_USER_ID,
        type: 'savings_account',
        name: 'HDFC Savings Account',
        accountNumber: '50100123456789',
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234',
        balance: 85000,
        interestRate: 3.5,
        description: 'Primary savings account',
        isActive: true
      },
      {
        userId: TEST_USER_ID,
        type: 'current_account',
        name: 'ICICI Current Account',
        accountNumber: '60200987654321',
        bankName: 'ICICI Bank',
        ifscCode: 'ICIC0002345',
        balance: 45000,
        interestRate: 0,
        description: 'Business current account',
        isActive: true
      },
      {
        userId: TEST_USER_ID,
        type: 'fd',
        name: 'SBI Fixed Deposit',
        accountNumber: 'FD789012345',
        bankName: 'State Bank of India',
        balance: 50000,
        interestRate: 6.5,
        maturityDate: new Date('2025-06-15'),
        description: '1-year fixed deposit',
        isActive: true
      },
      {
        userId: TEST_USER_ID,
        type: 'cash',
        name: 'Cash in Hand',
        balance: 5000,
        description: 'Emergency cash reserve',
        isActive: true
      }
    ];

    await Asset.insertMany(assets);
    console.log('Created assets with total value: ₹1,85,000');

    // Create transactions for monthly spending of ₹4,000
    const currentDate = new Date();
    const transactions = [];

    // Generate transactions for current month to achieve ₹4,000 spending
    const expenseTransactions = [
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'food_dining',
        subcategory: 'Restaurants',
        amount: 800,
        description: 'Dinner at restaurant',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
        merchant: 'The Great Indian Restaurant'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'groceries',
        subcategory: 'Monthly Shopping',
        amount: 1200,
        description: 'Monthly grocery shopping',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
        merchant: 'Big Bazaar'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'fuel',
        subcategory: 'Petrol',
        amount: 600,
        description: 'Petrol for car',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
        merchant: 'Indian Oil Petrol Pump'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'utilities',
        subcategory: 'Electricity',
        amount: 450,
        description: 'Monthly electricity bill',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        merchant: 'BESCOM'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'entertainment',
        subcategory: 'Movies',
        amount: 300,
        description: 'Movie tickets',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
        merchant: 'PVR Cinemas'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'shopping',
        subcategory: 'Clothing',
        amount: 650,
        description: 'New shirt and jeans',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
        merchant: 'Lifestyle Store'
      }
    ];

    // Add some income transactions to balance the books
    const incomeTransactions = [
      {
        userId: TEST_USER_ID,
        type: 'income',
        category: 'salary',
        subcategory: 'Primary Income',
        amount: 45000,
        description: 'Monthly salary credit',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        merchant: 'Tech Corp Ltd'
      },
      {
        userId: TEST_USER_ID,
        type: 'income',
        category: 'investment_income',
        subcategory: 'Savings Interest',
        amount: 250,
        description: 'Savings account interest',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 3),
        merchant: 'HDFC Bank'
      }
    ];

    transactions.push(...expenseTransactions, ...incomeTransactions);

    // Add previous month transactions for context
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthTransactions = [
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'groceries',
        subcategory: 'Weekly Shopping',
        amount: 1100,
        description: 'Grocery shopping',
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10),
        merchant: 'Spencer\'s Retail'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'fuel',
        subcategory: 'Petrol',
        amount: 550,
        description: 'Petrol refill',
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15),
        merchant: 'HP Petrol Pump'
      },
      {
        userId: TEST_USER_ID,
        type: 'expense',
        category: 'utilities',
        subcategory: 'Internet',
        amount: 800,
        description: 'Broadband bill',
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 20),
        merchant: 'Airtel'
      },
      {
        userId: TEST_USER_ID,
        type: 'income',
        category: 'salary',
        subcategory: 'Primary Income',
        amount: 45000,
        description: 'Monthly salary credit',
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1),
        merchant: 'Tech Corp Ltd'
      }
    ];

    transactions.push(...prevMonthTransactions);

    await Transaction.insertMany(transactions);
    console.log('Created transactions with current month spending: ₹4,000');

    // Verify the data
    const totalAssets = await Asset.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(TEST_USER_ID), isActive: true } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthExpenses = await Transaction.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(TEST_USER_ID),
          type: 'expense',
          date: { $gte: currentMonthStart }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    console.log('\n=== FINANCIAL DATA RESTORED ===');
    console.log(`Net Worth: ₹${totalAssets[0]?.total || 0}`);
    console.log(`Current Month Spending: ₹${currentMonthExpenses[0]?.total || 0}`);
    console.log('================================\n');

    console.log('Financial data restoration completed successfully!');
    
  } catch (error) {
    console.error('Error restoring financial data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
restoreFinancialData();
