import AppError from '../utils/appError.js';
import { faker } from '@faker-js/faker';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';

// Helper function to check if user has access to a category
const hasAccess = (user, category) => {
  if (!user.permissions) return false;
  return user.permissions[category] !== false; // Default to true if not explicitly set to false
};

// Generate mock data for a user if none exists
const generateMockData = async (userId) => {
  // Generate mock transactions (3 months)
  const transactionCategories = [
    'salary', 'freelance', 'investment', 'gift', 'food', 
    'transport', 'housing', 'utilities', 'health', 'entertainment', 'shopping'
  ];
  
  const transactions = [];
  for (let i = 0; i < 90; i++) {
    const isIncome = Math.random() > 0.7;
    const category = isIncome 
      ? faker.helpers.arrayElement(transactionCategories.slice(0, 4)) 
      : faker.helpers.arrayElement(transactionCategories.slice(4));
    
    transactions.push({
      user: userId,
      amount: isIncome 
        ? faker.finance.amount(1000, 10000, 2) 
        : -faker.finance.amount(5, 500, 2),
      type: isIncome ? 'income' : 'expense',
      category,
      description: isIncome 
        ? `Income from ${faker.company.name()}` 
        : `Payment to ${faker.company.name()}`,
      date: faker.date.recent({ days: 90 }),
      recurring: Math.random() > 0.8,
      recurringFrequency: Math.random() > 0.8 
        ? faker.helpers.arrayElement(['daily', 'weekly', 'monthly', 'yearly']) 
        : null,
    });
  }
  await Transaction.insertMany(transactions);

  // Generate mock assets
  const assetTypes = ['savings', 'checking', 'investment', 'property', 'vehicle'];
  const assets = Array.from({ length: 5 }, () => ({
    user: userId,
    type: faker.helpers.arrayElement(assetTypes),
    name: `${faker.finance.accountName()} ${faker.finance.account(4)}`,
    currentValue: faker.finance.amount(1000, 500000, 2),
    purchaseValue: faker.finance.amount(500, 400000, 2),
    purchaseDate: faker.date.past(5),
    isLiquid: Math.random() > 0.5,
  }));
  await Asset.insertMany(assets);

  // Generate mock liabilities
  const liabilityTypes = ['credit_card', 'mortgage', 'student_loan', 'car_loan'];
  const liabilities = Array.from({ length: 3 }, () => {
    const type = faker.helpers.arrayElement(liabilityTypes);
    const amount = faker.finance.amount(1000, 500000, 2);
    return {
      user: userId,
      type,
      name: `${faker.finance.accountName()} ${type.split('_').join(' ')}`,
      originalAmount: amount,
      currentBalance: faker.finance.amount(100, amount, 2),
      interestRate: faker.finance.amount(2, 15, 2),
      minimumPayment: faker.finance.amount(50, 2000, 2),
      startDate: faker.date.past(3),
      endDate: faker.date.future(10),
    };
  });
  await Liability.insertMany(liabilities);

  // Generate mock investments
  const investmentTypes = ['stock', 'mutual_fund', 'etf', 'bonds', 'crypto'];
  const investments = Array.from({ length: 8 }, () => {
    const type = faker.helpers.arrayElement(investmentTypes);
    const purchasePrice = faker.finance.amount(10, 1000, 2);
    const currentPrice = purchasePrice * faker.finance.amount(0.5, 2, 2);
    const quantity = faker.finance.amount(1, 100, 0);
    
    return {
      user: userId,
      type,
      symbol: faker.finance.currencyCode(),
      name: `${faker.company.name()} ${type.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`,
      quantity,
      purchasePrice,
      currentPrice,
      purchaseDate: faker.date.past(3),
      currentValue: quantity * currentPrice,
    };
  });
  await Investment.insertMany(investments);
};

// Get all financial data for the dashboard
export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Check if we need to generate mock data
    const transactionCount = await Transaction.countDocuments({ user: userId });
    if (transactionCount === 0) {
      await generateMockData(userId);
    }
    
    // Get all data in parallel
    const [transactions, assets, liabilities, investments] = await Promise.all([
      Transaction.find({ user: userId }).sort('-date').limit(10),
      Asset.find({ user: userId }),
      Liability.find({ user: userId }),
      Investment.find({ user: userId }),
    ]);

    // Calculate summary
    const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // Get recent transactions
    const recentTransactions = transactions.map(tx => ({
      id: tx._id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
    }));

    // Get asset allocation
    const assetAllocation = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.currentValue;
      return acc;
    }, {});

    // Get expense categories (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $abs: '$amount' } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Get income vs expense (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const cashFlow = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: threeMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' },
            type: '$type',
          },
          total: { $sum: { $abs: '$amount' } },
        },
      },
      {
        $group: {
          _id: { month: '$_id.month', year: '$_id.year' },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0],
            },
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Prepare response based on user permissions
    const response = {
      status: 'success',
      data: {
        summary: {
          netWorth: hasAccess(req.user, 'netWorth') ? netWorth : null,
          totalAssets: hasAccess(req.user, 'assets') ? totalAssets : null,
          totalLiabilities: hasAccess(req.user, 'liabilities') ? totalLiabilities : null,
          monthlyIncome: hasAccess(req.user, 'transactions') 
            ? cashFlow.reduce((sum, month) => sum + month.income, 0) / Math.max(cashFlow.length, 1)
            : null,
          monthlyExpense: hasAccess(req.user, 'transactions')
            ? cashFlow.reduce((sum, month) => sum + month.expense, 0) / Math.max(cashFlow.length, 1)
            : null,
        },
        recentTransactions: hasAccess(req.user, 'transactions') ? recentTransactions : [],
        assetAllocation: hasAccess(req.user, 'assets') ? assetAllocation : {},
        expenses: hasAccess(req.user, 'transactions') ? expenses : [],
        cashFlow: hasAccess(req.user, 'transactions') ? cashFlow : [],
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

// Get transactions with filtering and pagination
export const getTransactions = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'transactions')) {
      return next(new AppError('You do not have permission to view transactions', 403));
    }

    const { page = 1, limit = 10, type, category, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { user: req.user._id };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort('-date')
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query),
    ]);
    
    res.status(200).json({
      status: 'success',
      results: transactions.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: transactions,
    });
  } catch (err) {
    next(err);
  }
};

// Get assets
export const getAssets = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'assets')) {
      return next(new AppError('You do not have permission to view assets', 403));
    }
    
    const assets = await Asset.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      results: assets.length,
      data: assets,
    });
  } catch (err) {
    next(err);
  }
};

// Get liabilities
export const getLiabilities = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'liabilities')) {
      return next(new AppError('You do not have permission to view liabilities', 403));
    }
    
    const liabilities = await Liability.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      results: liabilities.length,
      data: liabilities,
    });
  } catch (err) {
    next(err);
  }
};

// Get investments
export const getInvestments = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'investments')) {
      return next(new AppError('You do not have permission to view investments', 403));
    }
    
    const investments = await Investment.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      results: investments.length,
      data: investments,
    });
  } catch (err) {
    next(err);
  }
};

// Get EPF data
export const getEPFData = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'epf')) {
      return next(new AppError('You do not have permission to view EPF data', 403));
    }
    
    // Mock EPF data
    const epfData = {
      accountNumber: 'EPF' + faker.finance.account(8),
      currentBalance: faker.finance.amount(50000, 500000, 2),
      employerContribution: faker.finance.amount(1000, 5000, 2),
      employeeContribution: faker.finance.amount(800, 4000, 2),
      lastUpdated: faker.date.recent(),
      yearlyReturns: [
        { year: 2023, returnRate: 5.35 },
        { year: 2022, returnRate: 5.35 },
        { year: 2021, returnRate: 6.10 },
        { year: 2020, returnRate: 5.20 },
        { year: 2019, returnRate: 5.45 },
      ],
    };
    
    res.status(200).json({
      status: 'success',
      data: epfData,
    });
  } catch (err) {
    next(err);
  }
};

// Get credit score
export const getCreditScore = async (req, res, next) => {
  try {
    if (!hasAccess(req.user, 'creditScore')) {
      return next(new AppError('You do not have permission to view credit score', 403));
    }
    
    // Mock credit score data
    const creditScore = {
      score: faker.finance.amount(300, 850, 0),
      lastUpdated: faker.date.recent(),
      factors: [
        { factor: 'Payment History', impact: 'Positive' },
        { factor: 'Credit Utilization', impact: 'Neutral' },
        { factor: 'Length of Credit History', impact: 'Positive' },
        { factor: 'New Credit', impact: 'Negative' },
        { factor: 'Credit Mix', impact: 'Positive' },
      ],
      scoreRange: {
        excellent: { min: 800, max: 850 },
        veryGood: { min: 740, max: 799 },
        good: { min: 670, max: 739 },
        fair: { min: 580, max: 669 },
        poor: { min: 300, max: 579 },
      },
    };
    
    // Determine score rating
    let rating = 'Poor';
    if (creditScore.score >= 800) rating = 'Excellent';
    else if (creditScore.score >= 740) rating = 'Very Good';
    else if (creditScore.score >= 670) rating = 'Good';
    else if (creditScore.score >= 580) rating = 'Fair';
    
    creditScore.rating = rating;
    
    res.status(200).json({
      status: 'success',
      data: creditScore,
    });
  } catch (err) {
    next(err);
  }
};
