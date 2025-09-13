import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseBankStatement, categorizeTransaction } from '../utils/pdfParser.js';
import Transaction from '../models/Transaction.js';
import AccountSummary from '../models/AccountSummary.js';
import AppError from '../utils/appError.js';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads/statements';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF files are allowed', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// Upload and process bank statement
export const uploadBankStatement = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a PDF file', 400));
    }

    const filePath = req.file.path;
    const userId = req.user._id;

    // Parse PDF and extract transactions
    const rawTransactions = await parseBankStatement(filePath);
    
    if (!rawTransactions || rawTransactions.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return next(new AppError('No transactions found in the uploaded statement', 400));
    }

    // Process and categorize transactions
    const processedTransactions = rawTransactions.map(transaction => ({
      ...transaction,
      user: userId,
      category: categorizeTransaction(transaction.description),
      confidence: calculateConfidence(transaction)
    }));

    // Save transactions to database
    const savedTransactions = await Transaction.insertMany(processedTransactions);

    // Update account summary
    await updateAccountSummary(userId);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Bank statement processed successfully',
        transactionsCount: savedTransactions.length,
        transactions: savedTransactions.slice(0, 10), // Return first 10 for preview
        summary: {
          totalIncome: processedTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0),
          totalExpenses: Math.abs(processedTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)),
          dateRange: {
            from: new Date(Math.min(...processedTransactions.map(t => new Date(t.date)))),
            to: new Date(Math.max(...processedTransactions.map(t => new Date(t.date))))
          }
        }
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload processing error:', error);
    next(new AppError('Failed to process bank statement', 500));
  }
};

// Calculate confidence score for transaction categorization
const calculateConfidence = (transaction) => {
  const desc = transaction.description.toLowerCase();
  
  // High confidence keywords
  const highConfidenceKeywords = [
    'swiggy', 'zomato', 'uber', 'ola', 'amazon', 'flipkart',
    'netflix', 'spotify', 'salary', 'rent', 'electricity'
  ];
  
  // Medium confidence keywords
  const mediumConfidenceKeywords = [
    'payment', 'purchase', 'transfer', 'withdrawal', 'deposit'
  ];

  for (const keyword of highConfidenceKeywords) {
    if (desc.includes(keyword)) return 0.9;
  }

  for (const keyword of mediumConfidenceKeywords) {
    if (desc.includes(keyword)) return 0.7;
  }

  return 0.5; // Default confidence
};

// Update account summary after new transactions
const updateAccountSummary = async (userId) => {
  try {
    // Get all transactions for user
    const transactions = await Transaction.find({ user: userId });
    
    if (transactions.length === 0) return;

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = Math.abs(transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));

    const netWorth = totalIncome - totalExpenses;

    // Calculate monthly spend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlySpend = Math.abs(transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0));

    // Calculate category breakdown
    const categoryBreakdown = calculateCategoryBreakdown(transactions);
    
    // Calculate recurring vendors
    const recurringVendors = calculateRecurringVendors(transactions);

    // Calculate monthly trends
    const monthlyTrends = calculateMonthlyTrends(transactions);

    // Update or create account summary
    await AccountSummary.findOneAndUpdate(
      { user: userId },
      {
        netWorth,
        totalIncome,
        totalExpenses,
        monthlySpend,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        categoryBreakdown,
        recurringVendors,
        monthlyTrends,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

  } catch (error) {
    console.error('Error updating account summary:', error);
  }
};

// Calculate category breakdown
const calculateCategoryBreakdown = (transactions) => {
  const categoryTotals = {};
  const totalExpenses = Math.abs(transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));

  transactions
    .filter(t => t.type === 'expense')
    .forEach(transaction => {
      const category = transaction.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 };
      }
      categoryTotals[category].amount += Math.abs(transaction.amount);
      categoryTotals[category].count += 1;
    });

  return Object.entries(categoryTotals).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    transactionCount: data.count
  })).sort((a, b) => b.amount - a.amount);
};

// Calculate recurring vendors
const calculateRecurringVendors = (transactions) => {
  const vendorFrequency = {};
  
  transactions.forEach(transaction => {
    const merchant = transaction.merchant || extractMerchantFromDescription(transaction.description);
    if (merchant && merchant.length > 3) {
      if (!vendorFrequency[merchant]) {
        vendorFrequency[merchant] = {
          transactions: [],
          category: transaction.category
        };
      }
      vendorFrequency[merchant].transactions.push(transaction);
    }
  });

  return Object.entries(vendorFrequency)
    .filter(([, data]) => data.transactions.length >= 2)
    .map(([merchant, data]) => {
      const amounts = data.transactions.map(t => Math.abs(t.amount));
      const dates = data.transactions.map(t => new Date(t.date)).sort();
      
      return {
        name: merchant,
        category: data.category,
        averageAmount: amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length,
        frequency: determineFrequency(dates),
        lastTransaction: dates[dates.length - 1]
      };
    })
    .sort((a, b) => b.averageAmount - a.averageAmount)
    .slice(0, 10);
};

// Extract merchant name from description
const extractMerchantFromDescription = (description) => {
  // Remove common banking terms
  const cleanDesc = description
    .replace(/\b(UPI|NEFT|IMPS|POS|ATM|DEBIT|CREDIT)\b/gi, '')
    .replace(/\b\d+\b/g, '')
    .trim();
  
  return cleanDesc.length > 3 ? cleanDesc.substring(0, 30) : null;
};

// Determine transaction frequency
const determineFrequency = (dates) => {
  if (dates.length < 2) return 'monthly';
  
  const intervals = [];
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }
  
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  
  if (avgInterval <= 10) return 'weekly';
  if (avgInterval <= 35) return 'monthly';
  if (avgInterval <= 100) return 'quarterly';
  return 'yearly';
};

// Calculate monthly trends
const calculateMonthlyTrends = (transactions) => {
  const monthlyData = {};
  
  transactions.forEach(transaction => {
    const monthKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        income: 0,
        expenses: 0,
        categories: {}
      };
    }
    
    if (transaction.type === 'income') {
      monthlyData[monthKey].income += transaction.amount;
    } else {
      monthlyData[monthKey].expenses += Math.abs(transaction.amount);
      
      const category = transaction.category;
      if (!monthlyData[monthKey].categories[category]) {
        monthlyData[monthKey].categories[category] = 0;
      }
      monthlyData[monthKey].categories[category] += Math.abs(transaction.amount);
    }
  });

  return Object.values(monthlyData)
    .map(month => ({
      ...month,
      savings: month.income - month.expenses,
      topCategories: Object.entries(month.categories)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
    }))
    .sort((a, b) => new Date(a.month) - new Date(b.month));
};
