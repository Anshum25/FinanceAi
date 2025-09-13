import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple connection test and data insertion
const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to MongoDB');

    // Get collections directly
    const db = mongoose.connection.db;
    
    // Check if user exists
    const users = await db.collection('users').find({}).toArray();
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user account first.');
      process.exit(1);
    }

    const userId = users[0]._id;
    console.log('Using user ID:', userId);

    // Clear existing data
    await db.collection('transactions').deleteMany({ user: userId });
    await db.collection('assets').deleteMany({ user: userId });
    await db.collection('liabilities').deleteMany({ user: userId });
    await db.collection('investments').deleteMany({ user: userId });
    await db.collection('accountsummaries').deleteMany({ user: userId });

    // Insert sample transactions
    const transactions = [
      { user: userId, type: 'income', amount: 5000, description: 'Salary', category: 'salary', date: new Date('2024-03-15'), merchant: 'Company ABC' },
      { user: userId, type: 'expense', amount: 1200, description: 'Rent Payment', category: 'rent', date: new Date('2024-03-01'), merchant: 'Property Management' },
      { user: userId, type: 'expense', amount: 800, description: 'Groceries', category: 'groceries', date: new Date('2024-03-05'), merchant: 'Supermarket' },
      { user: userId, type: 'expense', amount: 300, description: 'Electricity Bill', category: 'utilities', date: new Date('2024-03-10'), merchant: 'Electric Company' }
    ];

    await db.collection('transactions').insertMany(transactions);
    console.log('✅ Inserted transactions');

    // Insert sample assets
    const assets = [
      { user: userId, name: 'Savings Account', type: 'savings', currentValue: 15000, description: 'Emergency fund savings' },
      { user: userId, name: 'Checking Account', type: 'checking', currentValue: 3500, description: 'Primary checking account' }
    ];

    await db.collection('assets').insertMany(assets);
    console.log('✅ Inserted assets');

    // Insert sample liabilities
    const liabilities = [
      { user: userId, name: 'Credit Card', type: 'credit_card', originalAmount: 3000, currentBalance: 2500, interestRate: 18.9, minimumPayment: 75, description: 'Main credit card debt' }
    ];

    await db.collection('liabilities').insertMany(liabilities);
    console.log('✅ Inserted liabilities');

    // Insert sample investments
    const investments = [
      { user: userId, name: 'Stock Portfolio', type: 'stock', quantity: 100, purchasePrice: 80, currentPrice: 85, purchaseDate: new Date('2023-01-15'), notes: 'Diversified stock portfolio' }
    ];

    await db.collection('investments').insertMany(investments);
    console.log('✅ Inserted investments');

    // Create account summary
    const accountSummary = {
      user: userId,
      netWorth: 16000, // 18500 assets - 2500 liabilities
      totalIncome: 5000,
      totalExpenses: 2300,
      monthlySpend: 2300,
      savingsRate: 54,
      categoryBreakdown: [
        { category: 'rent', amount: 1200, percentage: 52.2 },
        { category: 'groceries', amount: 800, percentage: 34.8 },
        { category: 'utilities', amount: 300, percentage: 13.0 }
      ],
      recurringVendors: [
        { vendor: 'Property Management', amount: 1200, frequency: 'monthly' },
        { vendor: 'Electric Company', amount: 300, frequency: 'monthly' }
      ],
      monthlyTrends: [
        { month: '2024-03', income: 5000, expenses: 2300, savings: 2700 }
      ]
    };

    await db.collection('accountsummaries').insertOne(accountSummary);
    console.log('✅ Inserted account summary');

    console.log('🎉 Database seeding completed successfully!');
    console.log('💡 You can now refresh your frontend to see the data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Connection closed');
  }
};

main();
