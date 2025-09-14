import mongoose from 'mongoose';
import Transaction from './models/Transaction.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleTransactions = [
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 50000,
    type: 'income',
    description: 'Salary Credit',
    category: 'salary',
    date: new Date('2024-09-01'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 1200,
    type: 'expense',
    description: 'Swiggy Food Order',
    category: 'food_dining',
    date: new Date('2024-09-02'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 800,
    type: 'expense',
    description: 'Uber Ride',
    category: 'transportation',
    date: new Date('2024-09-03'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 2500,
    type: 'expense',
    description: 'Amazon Shopping',
    category: 'shopping',
    date: new Date('2024-09-04'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 3000,
    type: 'expense',
    description: 'Electricity Bill',
    category: 'utilities',
    date: new Date('2024-09-05'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 15000,
    type: 'expense',
    description: 'Rent Payment',
    category: 'rent_mortgage',
    date: new Date('2024-09-06'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 500,
    type: 'expense',
    description: 'Netflix Subscription',
    category: 'entertainment',
    date: new Date('2024-09-07'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 1800,
    type: 'expense',
    description: 'Petrol Fill',
    category: 'fuel',
    date: new Date('2024-09-08'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 4500,
    type: 'expense',
    description: 'Grocery Shopping',
    category: 'groceries',
    date: new Date('2024-09-09'),
    source: 'manual'
  },
  {
    userId: '507f1f77bcf86cd799439011',
    amount: 2000,
    type: 'expense',
    description: 'Medical Checkup',
    category: 'healthcare',
    date: new Date('2024-09-10'),
    source: 'manual'
  }
];

const createSampleTransactions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Insert sample transactions
    const result = await Transaction.insertMany(sampleTransactions);
    console.log(`Created ${result.length} sample transactions`);
    
    // Show summary
    const incomeCount = await Transaction.countDocuments({ type: 'income' });
    const expenseCount = await Transaction.countDocuments({ type: 'expense' });
    const totalIncome = await Transaction.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`\nSummary:`);
    console.log(`Income transactions: ${incomeCount} (₹${totalIncome[0]?.total || 0})`);
    console.log(`Expense transactions: ${expenseCount} (₹${totalExpenses[0]?.total || 0})`);
    
    await mongoose.disconnect();
    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Error creating sample transactions:', error);
  }
};

createSampleTransactions();
