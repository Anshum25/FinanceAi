import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import Asset from './models/Asset.js';
import Liability from './models/Liability.js';
import Investment from './models/Investment.js';
import User from './models/User.js';

dotenv.config();

async function populateTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai');
    console.log('✅ Connected to database');

    // Create or find test user with the ID that frontend uses
    const testUserId = '507f1f77bcf86cd799439011';
    
    // Clear existing data for this user
    await Transaction.deleteMany({ userId: testUserId });
    await Asset.deleteMany({ userId: testUserId });
    await Liability.deleteMany({ userId: testUserId });
    await Investment.deleteMany({ userId: testUserId });
    console.log('🧹 Cleared existing test data');

    // Create comprehensive financial data
    const transactions = [
      // Income transactions
      { userId: testUserId, amount: 85000, type: 'income', category: 'salary', description: 'Monthly Salary - Tech Company', date: new Date('2024-12-01'), balance: 85000 },
      { userId: testUserId, amount: 15000, type: 'income', category: 'freelance', description: 'Freelance Web Development', date: new Date('2024-12-15'), balance: 100000 },
      { userId: testUserId, amount: 2500, type: 'income', category: 'investment_income', description: 'Dividend from Mutual Funds', date: new Date('2024-12-20'), balance: 102500 },
      
      // Expense transactions
      { userId: testUserId, amount: 25000, type: 'expense', category: 'rent_mortgage', description: 'Monthly Rent Payment', date: new Date('2024-12-02'), balance: 77500 },
      { userId: testUserId, amount: 8500, type: 'expense', category: 'groceries', description: 'Monthly Grocery Shopping', date: new Date('2024-12-03'), balance: 69000 },
      { userId: testUserId, amount: 3200, type: 'expense', category: 'utilities', description: 'Electricity + Water Bill', date: new Date('2024-12-05'), balance: 65800 },
      { userId: testUserId, amount: 1800, type: 'expense', category: 'transportation', description: 'Uber + Metro Travel', date: new Date('2024-12-06'), balance: 64000 },
      { userId: testUserId, amount: 4500, type: 'expense', category: 'food_dining', description: 'Restaurant + Food Delivery', date: new Date('2024-12-07'), balance: 59500 },
      { userId: testUserId, amount: 2200, type: 'expense', category: 'entertainment', description: 'Netflix + Movie Tickets', date: new Date('2024-12-08'), balance: 57300 },
      { userId: testUserId, amount: 6500, type: 'expense', category: 'shopping', description: 'Clothing + Electronics', date: new Date('2024-12-10'), balance: 50800 },
      { userId: testUserId, amount: 1200, type: 'expense', category: 'healthcare', description: 'Medical Checkup', date: new Date('2024-12-12'), balance: 49600 },
      { userId: testUserId, amount: 10000, type: 'expense', category: 'investment', description: 'SIP - Mutual Fund Investment', date: new Date('2024-12-25'), balance: 39600 },
      
      // Recent transactions for current month
      { userId: testUserId, amount: 85000, type: 'income', category: 'salary', description: 'January Salary Credit', date: new Date('2025-01-01'), balance: 124600 },
      { userId: testUserId, amount: 25000, type: 'expense', category: 'rent_mortgage', description: 'January Rent Payment', date: new Date('2025-01-02'), balance: 99600 },
      { userId: testUserId, amount: 3500, type: 'expense', category: 'groceries', description: 'Weekly Grocery Shopping', date: new Date('2025-01-05'), balance: 96100 },
      { userId: testUserId, amount: 800, type: 'expense', category: 'transportation', description: 'Cab Fare', date: new Date('2025-01-08'), balance: 95300 },
    ];

    const assets = [
      { userId: testUserId, type: 'savings_account', name: 'HDFC Savings Account', balance: 450000, accountNumber: '50100123456789', bankName: 'HDFC Bank', isActive: true },
      { userId: testUserId, type: 'current_account', name: 'ICICI Current Account', balance: 125000, accountNumber: '019205123456', bankName: 'ICICI Bank', isActive: true },
      { userId: testUserId, type: 'cash', name: 'Cash in Hand', balance: 15000, isActive: true },
      { userId: testUserId, type: 'fd', name: 'Fixed Deposit - SBI', balance: 200000, accountNumber: 'FD123456789', bankName: 'SBI', isActive: true, maturityDate: new Date('2025-12-01'), interestRate: 6.5 },
      { userId: testUserId, type: 'property', name: 'Apartment - Bangalore', balance: 8500000, description: '2BHK Apartment in Electronic City', isActive: true },
    ];

    const liabilities = [
      { 
        userId: testUserId, 
        type: 'credit_card', 
        name: 'HDFC Credit Card', 
        lender: 'HDFC Bank',
        originalAmount: 100000,
        currentBalance: 15000, 
        interestRate: 18.5,
        monthlyPayment: 2500,
        startDate: new Date('2023-06-01'),
        nextDueDate: new Date('2025-02-15'),
        creditLimit: 100000,
        availableCredit: 85000,
        minimumPayment: 750,
        accountNumber: '4532********1234'
      },
      {
        userId: testUserId,
        type: 'personal_loan',
        name: 'Personal Loan - Axis Bank',
        lender: 'Axis Bank',
        originalAmount: 500000,
        currentBalance: 320000,
        interestRate: 12.5,
        monthlyPayment: 8500,
        startDate: new Date('2023-01-15'),
        nextDueDate: new Date('2025-02-10'),
        loanTerm: 60,
        remainingTerm: 38,
        accountNumber: 'PL789012345'
      }
    ];

    const investments = [
      { 
        userId: testUserId, 
        type: 'mutual_fund', 
        name: 'SBI Bluechip Fund', 
        currentValue: 125000, 
        investedAmount: 100000, 
        quantity: 2500, 
        purchasePrice: 40, 
        purchaseDate: new Date('2023-06-01'),
        currentPrice: 50, 
        returns: 25000, 
        returnsPercentage: 25 
      },
      { 
        userId: testUserId, 
        type: 'stock', 
        name: 'Reliance Industries', 
        currentValue: 85000, 
        investedAmount: 75000, 
        quantity: 35, 
        purchasePrice: 2143, 
        purchaseDate: new Date('2023-08-15'),
        currentPrice: 2428, 
        returns: 10000, 
        returnsPercentage: 13.33 
      },
      { 
        userId: testUserId, 
        type: 'etf', 
        name: 'Nifty 50 ETF', 
        currentValue: 65000, 
        investedAmount: 60000, 
        quantity: 400, 
        purchasePrice: 150, 
        purchaseDate: new Date('2023-09-01'),
        currentPrice: 162.5, 
        returns: 5000, 
        returnsPercentage: 8.33 
      },
      { 
        userId: testUserId, 
        type: 'bonds', 
        name: 'Government Bond 2030', 
        currentValue: 50000, 
        investedAmount: 50000, 
        quantity: 50, 
        purchasePrice: 1000, 
        purchaseDate: new Date('2023-10-01'),
        currentPrice: 1000, 
        returns: 0, 
        returnsPercentage: 0 
      }
    ];

    // Insert all data
    console.log('📊 Creating transactions...');
    await Transaction.insertMany(transactions);
    console.log(`✅ Created ${transactions.length} transactions`);

    console.log('💰 Creating assets...');
    await Asset.insertMany(assets);
    console.log(`✅ Created ${assets.length} assets`);

    console.log('💳 Creating liabilities...');
    await Liability.insertMany(liabilities);
    console.log(`✅ Created ${liabilities.length} liabilities`);

    console.log('📈 Creating investments...');
    await Investment.insertMany(investments);
    console.log(`✅ Created ${investments.length} investments`);

    // Calculate and display summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalInvestments = investments.reduce((sum, i) => sum + i.currentValue, 0);
    const netWorth = totalAssets + totalInvestments - totalLiabilities;

    console.log('\n📊 FINANCIAL SUMMARY:');
    console.log(`💰 Total Income: ₹${totalIncome.toLocaleString()}`);
    console.log(`💸 Total Expenses: ₹${totalExpenses.toLocaleString()}`);
    console.log(`🏦 Total Assets: ₹${totalAssets.toLocaleString()}`);
    console.log(`💳 Total Liabilities: ₹${totalLiabilities.toLocaleString()}`);
    console.log(`📈 Total Investments: ₹${totalInvestments.toLocaleString()}`);
    console.log(`💎 Net Worth: ₹${netWorth.toLocaleString()}`);
    console.log(`📊 Cash Flow: ₹${(totalIncome - totalExpenses).toLocaleString()}`);

    console.log('\n✅ SUCCESS: All test data created successfully!');
    console.log('🎯 Dashboard should now display proper financial data');
    console.log('🤖 AI should now provide intelligent responses based on this data');

  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

populateTestData();
