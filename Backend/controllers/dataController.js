import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import EPF from '../models/EPF.js';
import CreditScore from '../models/CreditScore.js';
import AccountSummary from '../models/AccountSummary.js';
import AppError from '../utils/appError.js';

// Get comprehensive financial summary
export const getFinancialSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get all financial data
    const [transactions, assets, liabilities, investments, epf, creditScore] = await Promise.all([
      Transaction.find({ userId: userId }).sort({ date: -1 }).limit(100),
      Asset.find({ userId: userId, isActive: true }),
      Liability.find({ userId: userId, isActive: true }),
      Investment.find({ userId: userId, isActive: true }),
      EPF.findOne({ userId: userId, isActive: true }),
      CreditScore.getLatestScore(userId)
    ]);
    
    // Calculate totals
    const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.currentBalance || 0), 0);
    const totalInvestments = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const netWorth = totalAssets + totalInvestments - totalLiabilities;
    
    // Calculate income/expense for last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentTransactions = transactions.filter(t => t.date >= threeMonthsAgo);
    const totalIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Categorize assets
    const assetBreakdown = {
      bankAccounts: assets.filter(a => ['bank_account', 'savings_account', 'current_account'].includes(a.type)),
      cash: assets.filter(a => a.type === 'cash'),
      fixedDeposits: assets.filter(a => a.type === 'fd'),
      other: assets.filter(a => !['bank_account', 'savings_account', 'current_account', 'cash', 'fd'].includes(a.type))
    };
    
    // Categorize liabilities
    const liabilityBreakdown = {
      loans: liabilities.filter(l => l.type.includes('loan')),
      creditCards: liabilities.filter(l => l.type === 'credit_card'),
      other: liabilities.filter(l => !l.type.includes('loan') && l.type !== 'credit_card')
    };
    
    // Investment breakdown
    const investmentBreakdown = {
      stocks: investments.filter(i => i.type === 'stocks'),
      mutualFunds: investments.filter(i => i.type === 'mutual_funds'),
      etfs: investments.filter(i => i.type === 'etf'),
      bonds: investments.filter(i => i.type === 'bonds'),
      other: investments.filter(i => !['stocks', 'mutual_funds', 'etf', 'bonds'].includes(i.type))
    };
    
    const summary = {
      overview: {
        netWorth,
        totalAssets,
        totalLiabilities,
        totalInvestments,
        monthlyIncome: totalIncome / 3, // Average over 3 months
        monthlyExpenses: totalExpenses / 3,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
      },
      assets: {
        total: totalAssets,
        breakdown: assetBreakdown,
        count: assets.length
      },
      liabilities: {
        total: totalLiabilities,
        breakdown: liabilityBreakdown,
        count: liabilities.length,
        debtToIncomeRatio: totalIncome > 0 ? (totalLiabilities / (totalIncome * 4)) * 100 : 0 // Annualized
      },
      investments: {
        total: totalInvestments,
        breakdown: investmentBreakdown,
        count: investments.length,
        totalProfitLoss: investments.reduce((sum, i) => sum + ((i.currentValue || 0) - (i.totalInvested || 0)), 0)
      },
      epf: epf ? {
        totalBalance: epf.totalBalance,
        monthlyContribution: epf.monthlyContribution,
        projectedRetirement: epf.projectedRetirementCorpus
      } : null,
      creditScore: creditScore ? {
        score: creditScore.score,
        category: creditScore.scoreCategory,
        lastUpdated: creditScore.reportDate
      } : null,
      recentActivity: {
        transactionCount: recentTransactions.length,
        largestIncome: Math.max(...recentTransactions.filter(t => t.type === 'income').map(t => t.amount), 0),
        largestExpense: Math.max(...recentTransactions.filter(t => t.type === 'expense').map(t => t.amount), 0)
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error in getFinancialSummary:', error);
    next(new AppError('Failed to fetch financial summary', 500));
  }
};

// Get assets with detailed breakdown
export const getAssets = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const assets = await Asset.find({ userId: userId, isActive: true }).sort({ balance: -1 });
    
    const breakdown = {
      bankAccounts: assets.filter(a => ['bank_account', 'savings_account', 'current_account'].includes(a.type)),
      cash: assets.filter(a => a.type === 'cash'),
      fixedDeposits: assets.filter(a => a.type === 'fd'),
      recurringDeposits: assets.filter(a => a.type === 'rd'),
      other: assets.filter(a => !['bank_account', 'savings_account', 'current_account', 'cash', 'fd', 'rd'].includes(a.type))
    };
    
    const total = assets.reduce((sum, asset) => sum + asset.balance, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        assets,
        breakdown,
        total,
        count: assets.length
      }
    });
  } catch (error) {
    next(new AppError('Failed to fetch assets', 500));
  }
};

// Get liabilities with detailed breakdown
export const getLiabilities = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const liabilities = await Liability.find({ userId: userId, isActive: true }).sort({ currentBalance: -1 });
    
    const breakdown = {
      loans: liabilities.filter(l => l.type.includes('loan')),
      creditCards: liabilities.filter(l => l.type === 'credit_card'),
      other: liabilities.filter(l => !l.type.includes('loan') && l.type !== 'credit_card')
    };
    
    const total = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
    const totalCreditLimit = liabilities
      .filter(l => l.type === 'credit_card')
      .reduce((sum, l) => sum + (l.creditLimit || 0), 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        liabilities,
        breakdown,
        total,
        totalCreditLimit,
        count: liabilities.length
      }
    });
  } catch (error) {
    console.error('Error in getLiabilities:', error);
    next(new AppError('Failed to fetch liabilities', 500));
  }
};

// Get investments with portfolio analysis
export const getInvestments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const investments = await Investment.find({ userId: userId, isActive: true }).sort({ currentValue: -1 });
    
    const breakdown = {
      stocks: investments.filter(i => i.type === 'stocks'),
      mutualFunds: investments.filter(i => i.type === 'mutual_funds'),
      etfs: investments.filter(i => i.type === 'etf'),
      bonds: investments.filter(i => i.type === 'bonds'),
      gold: investments.filter(i => i.type === 'gold'),
      other: investments.filter(i => !['stocks', 'mutual_funds', 'etf', 'bonds', 'gold'].includes(i.type))
    };
    
    const totalInvested = investments.reduce((sum, inv) => sum + inv.totalInvested, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalProfitLoss = currentValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        investments,
        breakdown,
        portfolio: {
          totalInvested,
          currentValue,
          totalProfitLoss,
          totalReturnPercentage,
          count: investments.length
        }
      }
    });
  } catch (error) {
    next(new AppError('Failed to fetch investments', 500));
  }
};

// Get EPF data
export const getEPFData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const epf = await EPF.findOne({ userId: userId, isActive: true });
    
    if (!epf) {
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'No EPF data found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: epf
    });
  } catch (error) {
    next(new AppError('Failed to fetch EPF data', 500));
  }
};

// Get credit score data
export const getCreditScore = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const creditScore = await CreditScore.getLatestScore(userId);
    const history = await CreditScore.getScoreHistory(userId, 12);
    
    if (!creditScore) {
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'No credit score data found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        current: creditScore,
        history
      }
    });
  } catch (error) {
    next(new AppError('Failed to fetch credit score', 500));
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
      maxAmount
    } = req.query;

    // Build query
    const query = { userId: userId };
    
    if (type) query.type = type;
    if (category) query.category = category;
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

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query)
    ]);

    // Get income vs expense breakdown
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const summary = {
      totalIncome: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      netFlow: incomeTransactions.reduce((sum, t) => sum + t.amount, 0) - expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    };

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        summary,
        breakdown: {
          income: incomeTransactions,
          expenses: expenseTransactions
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(new AppError('Failed to fetch transactions', 500));
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
      userId: userId,
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
    const summary = await AccountSummary.findOne({ userId: userId });
    
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
  const transactions = await Transaction.find({ userId: userId });
  
  if (transactions.length === 0) {
    return await AccountSummary.create({
      userId: userId,
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
    userId: userId,
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
