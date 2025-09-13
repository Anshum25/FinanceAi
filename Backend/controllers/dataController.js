import Transaction from '../models/Transaction.js';
import AccountSummary from '../models/AccountSummary.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import AppError from '../utils/appError.js';

// Get user's financial summary from AccountSummary collection
export const getFinancialSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get cached summary first
    let summary = await AccountSummary.findOne({ user: userId });
    
    if (!summary) {
      // If no summary exists, calculate and create one
      summary = await calculateAndCreateSummary(userId);
    }
    
    // Get additional real-time data
    const [recentTransactions, assets, liabilities, investments] = await Promise.all([
      Transaction.find({ user: userId }).sort({ date: -1 }).limit(10),
      Asset.find({ user: userId }),
      Liability.find({ user: userId }),
      Investment.find({ user: userId })
    ]);
    
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.currentBalance || 0), 0);
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        netWorth: summary.netWorth,
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        monthlySpend: summary.monthlySpend,
        savingsRate: summary.savingsRate,
        totalAssets,
        totalLiabilities,
        totalInvestments,
        categoryBreakdown: summary.categoryBreakdown,
        monthlyTrends: summary.monthlyTrends.slice(-6), // Last 6 months
        recentTransactions,
        lastUpdated: summary.lastUpdated
      }
    });
    
  } catch (err) {
    console.error('Error in getFinancialSummary:', err);
    next(new AppError('Error fetching financial summary', 500));
  }
};

// Get user's transactions with advanced filtering
export const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 50, 
      category, 
      type, 
      startDate, 
      endDate,
      minAmount,
      maxAmount,
      merchant,
      search
    } = req.query;
    
    // Build query
    const query = { user: userId };
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (merchant) query.merchant = new RegExp(merchant, 'i');
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }
    
    if (search) {
      query.description = new RegExp(search, 'i');
    }
    
    // Execute query with pagination
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
    
  } catch (err) {
    console.error('Error in getTransactions:', err);
    next(new AppError('Error fetching transactions', 500));
  }
};

// Get category-wise spending analysis
export const getCategoryAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { months = 3 } = req.query;
    
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));
    
    // Get transactions for the specified period
    const transactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: monthsAgo }
    });
    
    // Calculate category totals
    const categoryTotals = {};
    const categoryMonthly = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category;
      const month = transaction.date.toISOString().substring(0, 7);
      const amount = Math.abs(transaction.amount);
      
      // Total by category
      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 };
      }
      categoryTotals[category].amount += amount;
      categoryTotals[category].count += 1;
      
      // Monthly breakdown by category
      if (!categoryMonthly[category]) {
        categoryMonthly[category] = {};
      }
      if (!categoryMonthly[category][month]) {
        categoryMonthly[category][month] = 0;
      }
      categoryMonthly[category][month] += amount;
    });
    
    const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.amount, 0);
    
    // Format response
    const categories = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        transactionCount: data.count,
        averageAmount: data.amount / data.count,
        monthlyBreakdown: categoryMonthly[category] || {}
      }))
      .sort((a, b) => b.amount - a.amount);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories,
        totalExpenses,
        period: {
          months: parseInt(months),
          from: monthsAgo,
          to: new Date()
        }
      }
    });
    
  } catch (err) {
    console.error('Error in getCategoryAnalysis:', err);
    next(new AppError('Error fetching category analysis', 500));
  }
};

// Get spending trends and insights
export const getSpendingTrends = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get account summary for trends
    const summary = await AccountSummary.findOne({ user: userId });
    
    if (!summary) {
      return next(new AppError('No financial data found', 404));
    }
    
    // Calculate month-over-month changes
    const trends = summary.monthlyTrends.map((month, index) => {
      const prevMonth = summary.monthlyTrends[index - 1];
      
      return {
        ...month,
        changes: prevMonth ? {
          incomeChange: ((month.income - prevMonth.income) / prevMonth.income) * 100,
          expenseChange: ((month.expenses - prevMonth.expenses) / prevMonth.expenses) * 100,
          savingsChange: ((month.savings - prevMonth.savings) / Math.abs(prevMonth.savings || 1)) * 100
        } : null
      };
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        monthlyTrends: trends,
        recurringVendors: summary.recurringVendors,
        insights: generateSpendingInsights(trends, summary)
      }
    });
    
  } catch (err) {
    console.error('Error in getSpendingTrends:', err);
    next(new AppError('Error fetching spending trends', 500));
  }
};

// Helper function to calculate and create summary
const calculateAndCreateSummary = async (userId) => {
  const transactions = await Transaction.find({ user: userId });
  
  if (transactions.length === 0) {
    return await AccountSummary.create({
      user: userId,
      netWorth: 0,
      totalIncome: 0,
      totalExpenses: 0,
      monthlySpend: 0,
      savingsRate: 0,
      categoryBreakdown: [],
      recurringVendors: [],
      monthlyTrends: []
    });
  }
  
  // Calculate all metrics
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
  
  return await AccountSummary.create({
    user: userId,
    netWorth,
    totalIncome,
    totalExpenses,
    monthlySpend,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    categoryBreakdown: [],
    recurringVendors: [],
    monthlyTrends: []
  });
};

// Generate spending insights
const generateSpendingInsights = (trends, summary) => {
  const insights = [];
  
  if (trends.length >= 2) {
    const latestMonth = trends[trends.length - 1];
    
    if (latestMonth.changes) {
      if (latestMonth.changes.expenseChange > 20) {
        insights.push({
          type: 'warning',
          message: `Your expenses increased by ${latestMonth.changes.expenseChange.toFixed(1)}% this month`,
          category: 'spending'
        });
      }
      
      if (latestMonth.changes.savingsChange > 10) {
        insights.push({
          type: 'positive',
          message: `Great job! Your savings improved by ${latestMonth.changes.savingsChange.toFixed(1)}%`,
          category: 'savings'
        });
      }
    }
  }
  
  // Top spending category insight
  if (summary.categoryBreakdown.length > 0) {
    const topCategory = summary.categoryBreakdown[0];
    if (topCategory.percentage > 30) {
      insights.push({
        type: 'info',
        message: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your expenses`,
        category: 'analysis'
      });
    }
  }
  
  return insights;
};
