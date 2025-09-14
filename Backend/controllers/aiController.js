// Enhanced AI controller with comprehensive financial data access
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import EPF from '../models/EPF.js';
import CreditScore from '../models/CreditScore.js';
import AccountSummary from '../models/AccountSummary.js';
import AppError from '../utils/appError.js';
import { faker } from '@faker-js/faker';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get comprehensive financial data for AI context
const getFinancialContext = async (userId) => {
  try {
    const [user, summary, transactions, assets, liabilities, investments, epf, creditScore] = await Promise.all([
      User.findById(userId).select('name email preferences'),
      AccountSummary.findOne({ userId }),
      Transaction.find({ userId }).sort({ date: -1 }).limit(50),
      Asset.find({ userId, isActive: true }),
      Liability.find({ userId, isActive: true }),
      Investment.find({ userId, isActive: true }),
      EPF.findOne({ userId, isActive: true }),
      CreditScore.getLatestScore(userId)
    ]);

    // Calculate additional metrics
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
    const totalInvestments = investments.reduce((sum, investment) => sum + investment.currentValue, 0);
    const netWorth = totalAssets + totalInvestments - totalLiabilities;

    // Get income vs expense summary for last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const incomeExpenseSummary = await Transaction.getIncomeExpenseSummary(userId, threeMonthsAgo, new Date());

    return {
      user,
      summary,
      recentTransactions: transactions,
      assets: {
        items: assets,
        total: totalAssets,
        bankAccounts: assets.filter(a => ['bank_account', 'savings_account', 'current_account'].includes(a.type)),
        cash: assets.filter(a => a.type === 'cash'),
        fixedDeposits: assets.filter(a => a.type === 'fd')
      },
      liabilities: {
        items: liabilities,
        total: totalLiabilities,
        loans: liabilities.filter(l => l.type.includes('loan')),
        creditCards: liabilities.filter(l => l.type === 'credit_card')
      },
      investments: {
        items: investments,
        total: totalInvestments,
        stocks: investments.filter(i => i.type === 'stocks'),
        mutualFunds: investments.filter(i => i.type === 'mutual_funds'),
        etfs: investments.filter(i => i.type === 'etf')
      },
      epf,
      creditScore,
      financialMetrics: {
        netWorth,
        totalAssets,
        totalLiabilities,
        totalInvestments,
        debtToIncomeRatio: summary?.monthlyIncome ? (totalLiabilities / (summary.monthlyIncome * 12)) * 100 : 0,
        savingsRate: summary?.monthlySavings && summary?.monthlyIncome ? (summary.monthlySavings / summary.monthlyIncome) * 100 : 0
      },
      incomeExpenseSummary
    };
  } catch (error) {
    console.error('Error fetching financial context:', error);
    return null;
  }
};

// Generate sample data for new users
const generateSampleData = async (userId) => {
  console.log('🔄 Generating sample data for user:', userId);
  
  // Create sample transactions with realistic INR amounts
  const sampleTransactions = [
    { userId: userId, amount: 75000, type: 'income', category: 'salary', description: 'Monthly salary', date: new Date('2025-01-01') },
    { userId: userId, amount: 2500, type: 'expense', category: 'groceries', description: 'Grocery shopping', date: new Date('2025-01-10') },
    { userId: userId, amount: 800, type: 'expense', category: 'transportation', description: 'Uber ride', date: new Date('2025-01-09') },
    { userId: userId, amount: 3200, type: 'expense', category: 'utilities', description: 'Electricity bill', date: new Date('2025-01-08') },
    { userId: userId, amount: 4500, type: 'expense', category: 'entertainment', description: 'Movie and dinner', date: new Date('2025-01-07') }
  ];
  
  const sampleAssets = [
    { userId: userId, type: 'savings_account', name: 'Savings Account', balance: 500000 },
    { userId: userId, type: 'current_account', name: 'Checking Account', balance: 125000 },
    { userId: userId, type: 'cash', name: 'Cash in Hand', balance: 15000 }
  ];
  
  const sampleLiabilities = [
    { 
      userId: userId, 
      type: 'credit_card', 
      name: 'Credit Card', 
      lender: 'HDFC Bank',
      originalAmount: 50000,
      currentBalance: 2500, 
      interestRate: 18.5,
      monthlyPayment: 500,
      startDate: new Date('2024-01-01'),
      nextDueDate: new Date('2025-02-15'),
      creditLimit: 50000,
      availableCredit: 47500,
      minimumPayment: 250
    }
  ];
  
  const sampleInvestments = [
    { 
      userId: userId, 
      type: 'stock', 
      name: 'Apple Inc.', 
      currentValue: 15000, 
      quantity: 100, 
      purchasePrice: 120,
      purchaseDate: new Date('2024-06-01'),
      currentPrice: 150
    }
  ];
  
  try {
    console.log('📊 Creating transactions...');
    await Transaction.insertMany(sampleTransactions);
    console.log('💰 Creating assets...');
    await Asset.insertMany(sampleAssets);
    console.log('💳 Creating liabilities...');
    await Liability.insertMany(sampleLiabilities);
    console.log('📈 Creating investments...');
    await Investment.insertMany(sampleInvestments);
    console.log('✅ All sample data created successfully');
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Generate a response using Gemini
export const generateAIResponse = async (req, res, next) => {
  try {
    const { message, context = {} } = req.body;
    const userId = req.user._id;
    
    if (!message) {
      return next(new AppError('Please provide a message', 400));
    }
    
    // Try to get existing data, if none exists or validation fails, create sample data
    let transactions, assets, liabilities, investments;
    
    try {
      [transactions, assets, liabilities, investments] = await Promise.all([
        Transaction.find({ userId: userId }).sort('-date').limit(50),
        Asset.find({ userId: userId }),
        Liability.find({ userId: userId }),
        Investment.find({ userId: userId }),
      ]);
      
      console.log(`📊 Found existing data: ${transactions.length} transactions, ${assets.length} assets, ${liabilities.length} liabilities, ${investments.length} investments`);
      
      // Only generate sample data if NO data exists at all
      if (transactions.length === 0 && assets.length === 0 && liabilities.length === 0 && investments.length === 0) {
        console.log('🔄 No existing data found, generating sample data...');
        await generateSampleData(userId);
        [transactions, assets, liabilities, investments] = await Promise.all([
          Transaction.find({ userId: userId }).sort('-date').limit(50),
          Asset.find({ userId: userId }),
          Liability.find({ userId: userId }),
          Investment.find({ userId: userId }),
        ]);
      }
    } catch (error) {
      // If there are validation errors with existing data, clear and regenerate
      console.log('🧹 Error fetching data:', error.message);
      console.log('🧹 Error details:', error);
      try {
        await Transaction.deleteMany({ userId: userId });
        await Asset.deleteMany({ userId: userId });
        await Liability.deleteMany({ userId: userId });
        await Investment.deleteMany({ userId: userId });
        console.log('✅ Old data cleared successfully');
        
        await generateSampleData(userId);
        console.log('✅ New sample data generated successfully');
        
        [transactions, assets, liabilities, investments] = await Promise.all([
          Transaction.find({ userId: userId }).sort('-date').limit(50),
          Asset.find({ userId: userId }),
          Liability.find({ userId: userId }),
          Investment.find({ userId: userId }),
        ]);
        console.log('✅ Fresh data retrieved successfully');
      } catch (regenerationError) {
        console.error('❌ Error during data regeneration:', regenerationError);
        // If regeneration fails, provide minimal fallback data
        transactions = [];
        assets = [];
        liabilities = [];
        investments = [];
      }
    }

    // Prepare user's financial data as JSON
    const userData = {
      transactions: transactions.map(t => ({
        amount: t.amount,
        type: t.type,
        category: t.category,
        description: t.description,
        date: t.date
      })),
      assets: assets.map(a => ({
        type: a.type,
        name: a.name,
        currentValue: a.balance || a.currentValue || 0,
        isLiquid: a.isLiquid
      })),
      liabilities: liabilities.map(l => ({
        type: l.type,
        name: l.name,
        currentBalance: l.currentBalance,
        interestRate: l.interestRate
      })),
      investments: investments.map(i => ({
        type: i.type,
        name: i.name,
        currentValue: i.currentValue,
        quantity: i.quantity,
        purchasePrice: i.purchasePrice
      }))
    };

    // Create prompt with user data
    let prompt = `You are a financial assistant. Here is the user's financial data in JSON format:

${JSON.stringify(userData, null, 2)}

User question: ${message}

Please provide a helpful response based on their actual financial data. If they ask about their finances, use the data provided above.`;
    
    // Add conversation context if provided
    if (context.messages && Array.isArray(context.messages)) {
      prompt += `\n\nPrevious conversation:\n`;
      context.messages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // Call the Gemini API with fallback models
    let aiResponse;
    
    if (process.env.GEMINI_API_KEY) {
      try {
        // Try Gemini Flash first (faster and cheaper)
        console.log('🚀 Calling Gemini Flash API...');
        aiResponse = await callGeminiAPI(prompt, 'gemini-1.5-flash');
      } catch (flashError) {
        console.log("⚠️ Gemini Flash failed, trying Pro model:", flashError.message);
        
        try {
          // Fallback to Pro model
          console.log('🚀 Calling Gemini Pro API...');
          aiResponse = await callGeminiAPI(prompt, 'gemini-1.5-pro');
        } catch (proError) {
          console.error('❌ Both Gemini models failed:', proError);
          console.log('🔄 Using fallback response...');
          aiResponse = generateFallbackResponse(message, userData);
        }
      }
    } else {
      // Fallback response when API key is not configured
      aiResponse = generateFallbackResponse(message, userData);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        response: aiResponse,
        usedCategories: [],
      },
    });
    
  } catch (err) {
    console.error('Error in generateAIResponse:', err);
    next(new AppError('Error generating AI response', 500));
  }
};

// Call Gemini API using direct HTTP requests
const callGeminiAPI = async (prompt, model = 'gemini-1.5-flash') => {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are a professional financial advisor and AI assistant. Provide helpful, accurate financial advice based on the user's data. Keep responses conversational but informative. ${prompt}`,
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const geminiResponse = response.data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini API Response:', geminiResponse);
    return geminiResponse;
  } catch (error) {
    // Handle specific Gemini API errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error("Invalid Gemini API key");
    } else if (error.response?.status === 429) {
      throw new Error("Gemini API rate limit exceeded");
    } else {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
};

// Generate fallback response when Gemini API is not available
const generateFallbackResponse = (message, userData) => {
  const lowerMessage = message.toLowerCase();
  
  // Calculate basic financial metrics
  const totalAssets = userData.assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
  const totalLiabilities = userData.liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  const monthlyIncome = userData.transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const monthlyExpenses = userData.transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // Generate contextual responses based on the question
  if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
    return `Your monthly expenses are ₹${monthlyExpenses.toFixed(2)}. Your top spending categories are ${userData.transactions
      .filter(tx => tx.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .map(tx => tx.category)
      .slice(0, 3)
      .join(', ')}.`;
  }
  
  if (lowerMessage.includes('income') || lowerMessage.includes('earn')) {
    return `Your monthly income is ₹${monthlyIncome.toFixed(2)}. After expenses of ₹${monthlyExpenses.toFixed(2)}, you have a net cash flow of ₹${(monthlyIncome - monthlyExpenses).toFixed(2)}.`;
  }
  
  if (lowerMessage.includes('net worth') || lowerMessage.includes('worth')) {
    return `Your current net worth is ₹${netWorth.toFixed(2)}. This includes ₹${totalAssets.toFixed(2)} in assets and ₹${totalLiabilities.toFixed(2)} in liabilities.`;
  }
  
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    return `You're currently saving ₹${(monthlyIncome - monthlyExpenses).toFixed(2)} per month, which is a ${savingsRate.toFixed(1)}% savings rate. ${savingsRate >= 20 ? 'Great job!' : 'Consider increasing your savings rate for better financial security.'}`;
  }
  
  if (lowerMessage.includes('debt') || lowerMessage.includes('owe')) {
    return `You currently have ₹${totalLiabilities.toFixed(2)} in total debt. ${totalLiabilities > 0 ? 'Consider focusing on paying down high-interest debt first.' : 'Great job staying debt-free!'}`;
  }
  
  if (lowerMessage.includes('vacation') || lowerMessage.includes('afford') || lowerMessage.includes('trip')) {
    const availableCash = totalAssets - totalLiabilities;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const emergencyFund = monthlyExpenses * 3; // 3 months emergency fund
    const safeVacationBudget = Math.max(0, availableCash - emergencyFund);
    
    if (safeVacationBudget > 50000) {
      return `Based on your finances, you could afford a vacation! You have ₹${safeVacationBudget.toFixed(2)} available after maintaining a 3-month emergency fund. Consider budgeting ₹${Math.min(safeVacationBudget * 0.5, monthlySavings * 2).toFixed(2)} for a vacation to stay financially secure.`;
    } else if (monthlySavings > 0) {
      const monthsToSave = Math.ceil(100000 / monthlySavings);
      return `You're saving ₹${monthlySavings.toFixed(2)} per month. To afford a nice vacation, consider saving for ${monthsToSave} months to build up a vacation fund of ₹${(monthsToSave * monthlySavings).toFixed(2)}.`;
    } else {
      return `Based on your current finances, I'd recommend focusing on increasing your savings rate before planning a vacation. Try to reduce expenses or increase income to create a vacation fund.`;
    }
  }
  
  // Default response
  return `I can help you analyze your finances! You have ₹${totalAssets.toFixed(2)} in assets, ₹${totalLiabilities.toFixed(2)} in liabilities, for a net worth of ₹${netWorth.toFixed(2)}. Your monthly income is ₹${monthlyIncome.toFixed(2)} and expenses are ₹${monthlyExpenses.toFixed(2)}. What would you like to know more about?`;
};

// Get financial insights
export const getFinancialInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get all financial data
    const [transactions, assets, liabilities, investments] = await Promise.all([
      Transaction.find({ userId: userId }),
      Asset.find({ userId: userId }),
      Liability.find({ userId: userId }),
      Investment.find({ userId: userId }),
    ]);
    
    // Calculate total assets and liabilities
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.balance || asset.currentValue || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.currentBalance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // Calculate monthly income and expenses
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const recentTransactions = transactions.filter(tx => new Date(tx.date) >= oneMonthAgo);
    const monthlyIncome = recentTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const monthlyExpenses = recentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate savings rate
    const savingsRate = monthlyIncome > 0 
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
      : 0;
    
    // Calculate debt-to-income ratio
    const debtToIncome = monthlyIncome > 0 
      ? (totalLiabilities / monthlyIncome) * 100 
      : 0;
    
    // Prepare insights
    const insights = {
      netWorth: {
        value: netWorth,
        trend: 'up', // This would be calculated based on historical data
        description: netWorth >= 0 ? 'Positive net worth' : 'Negative net worth',
      },
      monthlyCashFlow: {
        income: monthlyIncome,
        expenses: monthlyExpenses,
        net: monthlyIncome - monthlyExpenses,
        trend: 'up', // This would be calculated based on historical data
      },
      savingsRate: {
        value: savingsRate,
        description: savingsRate >= 20 
          ? 'Great! You\'re saving a healthy portion of your income.'
          : savingsRate >= 10 
            ? 'Good, but consider increasing your savings rate.'
            : 'Consider increasing your savings rate for better financial security.',
      },
      debtToIncome: {
        value: debtToIncome,
        description: debtToIncome < 36 
          ? 'Healthy debt-to-income ratio.'
          : debtToIncome < 43 
            ? 'Manageable, but consider reducing debt.'
            : 'High debt-to-income ratio. Focus on debt reduction.',
      },
      investmentPerformance: {
        totalValue: investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0),
        totalGain: investments.reduce((sum, inv) => {
          const costBasis = (inv.quantity || 0) * (inv.purchasePrice || 0);
          return sum + ((inv.currentValue || 0) - costBasis);
        }, 0),
        // This would be calculated based on historical data
        annualizedReturn: 7.5, // Example value
      },
      recommendations: [
        'Review your monthly subscriptions to identify potential savings.',
        'Consider increasing your emergency fund to cover 3-6 months of expenses.',
        'Diversify your investment portfolio to manage risk.',
      ],
    };
    
    res.status(200).json({
      status: 'success',
      data: insights,
    });
    
  } catch (err) {
    console.error('Error in getFinancialInsights:', err);
    next(new AppError('Error generating financial insights', 500));
  }
};

// Generate a financial forecast
export const generateFinancialForecast = async (req, res, next) => {
  try {
    const { years = 5 } = req.query;
    const userId = req.user._id;
    
    // Get financial data
    const [transactions, assets, liabilities] = await Promise.all([
      Transaction.find({ user: userId }),
      Asset.find({ user: userId }),
      Liability.find({ user: userId }),
    ]);
    
    // Calculate current net worth
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.balance || asset.currentValue || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.currentBalance || 0), 0);
    
    // Calculate average monthly income and expenses
    const monthlyTransactions = {};
    transactions.forEach(tx => {
      const month = tx.date.toISOString().substring(0, 7); // YYYY-MM format
      if (!monthlyTransactions[month]) {
        monthlyTransactions[month] = { income: 0, expenses: 0 };
      }
      
      if (tx.type === 'income') {
        monthlyTransactions[month].income += tx.amount || 0;
      } else {
        monthlyTransactions[month].expenses += Math.abs(tx.amount || 0);
      }
    });
    
    const monthlyData = Object.values(monthlyTransactions);
    const avgMonthlyIncome = monthlyData.reduce((sum, month) => sum + month.income, 0) / Math.max(monthlyData.length, 1);
    const avgMonthlyExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0) / Math.max(monthlyData.length, 1);
    const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;
    
    // Generate forecast
    const forecast = [];
    let currentNetWorth = totalAssets - totalLiabilities;
    let currentSavings = currentNetWorth;
    
    for (let year = 1; year <= years; year++) {
      // Simple projection: current savings + (yearly savings * year)
      // In a real app, this would consider investment returns, debt payments, etc.
      const projectedSavings = currentSavings + (avgMonthlySavings * 12 * year);
      
      forecast.push({
        year: new Date().getFullYear() + year,
        projectedNetWorth: projectedSavings,
        projectedSavings: avgMonthlySavings * 12,
        // These would be more sophisticated calculations in a real app
        projectedAssets: totalAssets * (1 + 0.05 * year), // 5% growth
        projectedLiabilities: Math.max(0, totalLiabilities * (1 - 0.15 * year)), // 15% reduction per year
      });
      
      currentSavings = projectedSavings;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        currentNetWorth,
        avgMonthlyIncome,
        avgMonthlyExpenses,
        avgMonthlySavings,
        forecast,
      },
    });
    
  } catch (err) {
    console.error('Error in generateFinancialForecast:', err);
    next(new AppError('Error generating financial forecast', 500));
  }
};
