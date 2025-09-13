import axios from 'axios';
import { faker } from '@faker-js/faker';
import AppError from '../utils/appError.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';

// Generate sample data for new users
const generateSampleData = async (userId) => {
  // Create sample transactions
  const sampleTransactions = [
    { user: userId, amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary', date: new Date('2025-01-01') },
    { user: userId, amount: -150, type: 'expense', category: 'food', description: 'Grocery shopping', date: new Date('2025-01-10') },
    { user: userId, amount: -50, type: 'expense', category: 'transport', description: 'Uber ride', date: new Date('2025-01-09') },
    { user: userId, amount: -80, type: 'expense', category: 'utilities', description: 'Electricity bill', date: new Date('2025-01-08') },
    { user: userId, amount: -200, type: 'expense', category: 'entertainment', description: 'Movie and dinner', date: new Date('2025-01-07') }
  ];
  
  const sampleAssets = [
    { user: userId, type: 'savings', name: 'Savings Account', currentValue: 25000, isLiquid: true },
    { user: userId, type: 'checking', name: 'Checking Account', currentValue: 5000, isLiquid: true }
  ];
  
  const sampleLiabilities = [
    { user: userId, type: 'credit_card', name: 'Credit Card', currentBalance: 2500, interestRate: 18.5 }
  ];
  
  const sampleInvestments = [
    { user: userId, type: 'stock', name: 'Apple Inc.', currentValue: 15000, quantity: 100, purchasePrice: 120 }
  ];
  
  await Promise.all([
    Transaction.insertMany(sampleTransactions),
    Asset.insertMany(sampleAssets),
    Liability.insertMany(sampleLiabilities),
    Investment.insertMany(sampleInvestments)
  ]);
};

// Generate a response using Gemini
export const generateAIResponse = async (req, res, next) => {
  try {
    const { message, context = {} } = req.body;
    const userId = req.user._id;
    
    if (!message) {
      return next(new AppError('Please provide a message', 400));
    }
    
    // Check if user has any data, if not generate sample data
    const transactionCount = await Transaction.countDocuments({ user: userId });
    if (transactionCount === 0) {
      await generateSampleData(userId);
    }
    
    // Get user's financial data
    const [transactions, assets, liabilities, investments] = await Promise.all([
      Transaction.find({ user: userId }).sort('-date').limit(50),
      Asset.find({ user: userId }),
      Liability.find({ user: userId }),
      Investment.find({ user: userId }),
    ]);

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
        currentValue: a.currentValue,
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
        aiResponse = await callGeminiAPI(prompt, 'gemini-1.5-flash');
      } catch (flashError) {
        console.log("Gemini Flash failed, trying Pro model:", flashError.message);
        
        try {
          // Fallback to Pro model
          aiResponse = await callGeminiAPI(prompt, 'gemini-1.5-pro');
        } catch (proError) {
          console.error('Both Gemini models failed:', proError);
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

    return response.data.candidates[0].content.parts[0].text;
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
  const totalAssets = userData.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalLiabilities = userData.liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  const monthlyIncome = userData.transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const monthlyExpenses = Math.abs(userData.transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0));
  
  // Generate contextual responses based on the question
  if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
    return `Based on your recent transactions, you've spent $${monthlyExpenses.toFixed(2)} this month. Your largest expense categories appear to be ${userData.transactions
      .filter(tx => tx.type === 'expense')
      .map(tx => tx.category)
      .slice(0, 3)
      .join(', ')}.`;
  }
  
  if (lowerMessage.includes('income') || lowerMessage.includes('earn')) {
    return `Your monthly income is $${monthlyIncome.toFixed(2)}. After expenses of $${monthlyExpenses.toFixed(2)}, you have a net cash flow of $${(monthlyIncome - monthlyExpenses).toFixed(2)}.`;
  }
  
  if (lowerMessage.includes('net worth') || lowerMessage.includes('worth')) {
    return `Your current net worth is $${netWorth.toFixed(2)}. This includes $${totalAssets.toFixed(2)} in assets and $${totalLiabilities.toFixed(2)} in liabilities.`;
  }
  
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    return `You're currently saving $${(monthlyIncome - monthlyExpenses).toFixed(2)} per month, which is a ${savingsRate.toFixed(1)}% savings rate. ${savingsRate >= 20 ? 'Great job!' : 'Consider increasing your savings rate for better financial security.'}`;
  }
  
  if (lowerMessage.includes('debt') || lowerMessage.includes('owe')) {
    return `You currently have $${totalLiabilities.toFixed(2)} in total debt. ${totalLiabilities > 0 ? 'Consider focusing on paying down high-interest debt first.' : 'Great job staying debt-free!'}`;
  }
  
  // Default response
  return `I can help you analyze your finances! You have $${totalAssets.toFixed(2)} in assets, $${totalLiabilities.toFixed(2)} in liabilities, for a net worth of $${netWorth.toFixed(2)}. Your monthly income is $${monthlyIncome.toFixed(2)} and expenses are $${monthlyExpenses.toFixed(2)}. What would you like to know more about?`;
};

// Get financial insights
export const getFinancialInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get all financial data
    const [transactions, assets, liabilities, investments] = await Promise.all([
      Transaction.find({ user: userId }),
      Asset.find({ user: userId }),
      Liability.find({ user: userId }),
      Investment.find({ user: userId }),
    ]);
    
    // Calculate total assets and liabilities
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.currentBalance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // Calculate monthly income and expenses
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const recentTransactions = transactions.filter(tx => new Date(tx.date) >= oneMonthAgo);
    const monthlyIncome = recentTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const monthlyExpenses = Math.abs(recentTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0));
    
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
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
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
