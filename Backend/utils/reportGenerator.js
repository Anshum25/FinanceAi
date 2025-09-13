import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Transaction from '../models/Transaction.js';
import AccountSummary from '../models/AccountSummary.js';

// Generate comprehensive financial report
export const generateFinancialReport = async (userId, options = {}) => {
  try {
    // Get user's financial data
    const [summary, recentTransactions] = await Promise.all([
      AccountSummary.findOne({ user: userId }),
      Transaction.find({ user: userId }).sort({ date: -1 }).limit(100)
    ]);

    if (!summary) {
      throw new Error('No financial data found for user');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const reportPath = `reports/financial-report-${userId}-${Date.now()}.pdf`;
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Create write stream
    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    // Generate report content
    await generateReportHeader(doc, options.userName || 'User');
    await generateNetWorthSection(doc, summary);
    await generateCategoryAnalysis(doc, summary);
    await generateMonthlyTrends(doc, summary);
    await generateAIInsights(doc, summary, recentTransactions);
    await generateRecommendations(doc, summary);

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return reportPath;

  } catch (error) {
    throw new Error(`Report generation failed: ${error.message}`);
  }
};

// Generate report header with logo and title
const generateReportHeader = async (doc, userName) => {
  // Add FinanceAI logo (placeholder - you can add actual logo)
  doc.fontSize(24)
     .fillColor('#6366f1')
     .text('FinanceAI', 50, 50)
     .fontSize(12)
     .fillColor('#64748b')
     .text('Your Personal Financial Assistant', 50, 80);

  // Report title
  doc.fontSize(20)
     .fillColor('#1e293b')
     .text(`Financial Report for ${userName}`, 50, 120)
     .fontSize(12)
     .fillColor('#64748b')
     .text(`Generated on ${new Date().toLocaleDateString()}`, 50, 150);

  // Add separator line
  doc.moveTo(50, 180)
     .lineTo(550, 180)
     .strokeColor('#e2e8f0')
     .stroke();

  doc.y = 200;
};

// Generate net worth summary section
const generateNetWorthSection = async (doc, summary) => {
  doc.fontSize(16)
     .fillColor('#1e293b')
     .text('Net Worth Summary', 50, doc.y)
     .moveDown();

  // Net worth box
  const boxY = doc.y;
  doc.rect(50, boxY, 500, 80)
     .fillAndStroke('#f8fafc', '#e2e8f0');

  // Net worth value
  const netWorthColor = summary.netWorth >= 0 ? '#10b981' : '#ef4444';
  doc.fontSize(24)
     .fillColor(netWorthColor)
     .text(`₹${formatNumber(summary.netWorth)}`, 70, boxY + 20);

  doc.fontSize(12)
     .fillColor('#64748b')
     .text('Current Net Worth', 70, boxY + 50);

  // Additional metrics
  doc.fontSize(12)
     .fillColor('#1e293b')
     .text(`Monthly Income: ₹${formatNumber(summary.totalIncome)}`, 300, boxY + 20)
     .text(`Monthly Expenses: ₹${formatNumber(summary.totalExpenses)}`, 300, boxY + 35)
     .text(`Savings Rate: ${summary.savingsRate.toFixed(1)}%`, 300, boxY + 50);

  doc.y = boxY + 100;
};

// Generate category analysis with pie chart representation
const generateCategoryAnalysis = async (doc, summary) => {
  doc.fontSize(16)
     .fillColor('#1e293b')
     .text('Spending by Category', 50, doc.y)
     .moveDown();

  if (summary.categoryBreakdown.length === 0) {
    doc.fontSize(12)
       .fillColor('#64748b')
       .text('No spending data available', 50, doc.y);
    return;
  }

  // Top 5 categories
  const topCategories = summary.categoryBreakdown.slice(0, 5);
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  let currentY = doc.y;
  
  topCategories.forEach((category, index) => {
    // Color indicator
    doc.rect(50, currentY, 15, 15)
       .fillAndStroke(colors[index], colors[index]);

    // Category info
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text(category.category.charAt(0).toUpperCase() + category.category.slice(1), 75, currentY)
       .text(`₹${formatNumber(category.amount)}`, 250, currentY)
       .text(`${category.percentage.toFixed(1)}%`, 350, currentY)
       .text(`${category.transactionCount} transactions`, 420, currentY);

    currentY += 25;
  });

  doc.y = currentY + 20;
};

// Generate monthly trends section
const generateMonthlyTrends = async (doc, summary) => {
  doc.fontSize(16)
     .fillColor('#1e293b')
     .text('Monthly Trends (Last 6 Months)', 50, doc.y)
     .moveDown();

  if (summary.monthlyTrends.length === 0) {
    doc.fontSize(12)
       .fillColor('#64748b')
       .text('No trend data available', 50, doc.y);
    return;
  }

  // Table header
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Month', 50, doc.y)
     .text('Income', 150, doc.y)
     .text('Expenses', 220, doc.y)
     .text('Savings', 290, doc.y)
     .text('Top Category', 360, doc.y);

  doc.y += 20;

  // Recent months data
  const recentMonths = summary.monthlyTrends.slice(-6);
  
  recentMonths.forEach(month => {
    const topCategory = month.topCategories && month.topCategories[0] 
      ? month.topCategories[0].category 
      : 'N/A';

    doc.fontSize(10)
       .fillColor('#1e293b')
       .text(month.month, 50, doc.y)
       .text(`₹${formatNumber(month.income)}`, 150, doc.y)
       .text(`₹${formatNumber(month.expenses)}`, 220, doc.y)
       .text(`₹${formatNumber(month.savings)}`, 290, doc.y)
       .text(topCategory, 360, doc.y);

    doc.y += 15;
  });

  doc.y += 20;
};

// Generate AI-powered insights section
const generateAIInsights = async (doc, summary, transactions) => {
  doc.fontSize(16)
     .fillColor('#1e293b')
     .text('AI-Generated Insights', 50, doc.y)
     .moveDown();

  const insights = generateFinancialInsights(summary, transactions);

  insights.forEach(insight => {
    // Insight icon based on type
    const iconColor = insight.type === 'positive' ? '#10b981' : 
                     insight.type === 'warning' ? '#f59e0b' : '#6366f1';
    
    doc.circle(60, doc.y + 5, 3)
       .fillAndStroke(iconColor, iconColor);

    doc.fontSize(11)
       .fillColor('#1e293b')
       .text(insight.message, 75, doc.y);

    doc.y += 20;
  });

  doc.y += 10;
};

// Generate recommendations section
const generateRecommendations = async (doc, summary) => {
  doc.fontSize(16)
     .fillColor('#1e293b')
     .text('Personalized Recommendations', 50, doc.y)
     .moveDown();

  const recommendations = generateRecommendations_internal(summary);

  recommendations.forEach((rec, index) => {
    doc.fontSize(11)
       .fillColor('#1e293b')
       .text(`${index + 1}. ${rec}`, 50, doc.y);

    doc.y += 18;
  });

  // Footer
  doc.y += 30;
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('This report was generated by FinanceAI. For questions, contact support.', 50, doc.y);
};

// Helper function to format numbers
const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(Math.abs(num));
};

// Generate financial insights
const generateFinancialInsights = (summary, transactions) => {
  const insights = [];

  // Savings rate analysis
  if (summary.savingsRate < 10) {
    insights.push({
      type: 'warning',
      message: 'Your savings rate is below 10%. Consider reducing discretionary spending.'
    });
  } else if (summary.savingsRate > 20) {
    insights.push({
      type: 'positive',
      message: 'Excellent savings rate! You\'re building wealth effectively.'
    });
  }

  // Top category analysis
  if (summary.categoryBreakdown.length > 0) {
    const topCategory = summary.categoryBreakdown[0];
    if (topCategory.percentage > 40) {
      insights.push({
        type: 'warning',
        message: `${topCategory.category} dominates your spending at ${topCategory.percentage.toFixed(1)}%. Consider diversifying expenses.`
      });
    }
  }

  // Monthly trend analysis
  if (summary.monthlyTrends.length >= 2) {
    const recent = summary.monthlyTrends.slice(-2);
    const expenseChange = ((recent[1].expenses - recent[0].expenses) / recent[0].expenses) * 100;
    
    if (expenseChange > 15) {
      insights.push({
        type: 'warning',
        message: `Your expenses increased by ${expenseChange.toFixed(1)}% last month. Monitor your spending closely.`
      });
    } else if (expenseChange < -10) {
      insights.push({
        type: 'positive',
        message: `Great job reducing expenses by ${Math.abs(expenseChange).toFixed(1)}% last month!`
      });
    }
  }

  // Recurring vendor analysis
  if (summary.recurringVendors.length > 0) {
    const totalRecurring = summary.recurringVendors.reduce((sum, vendor) => sum + vendor.averageAmount, 0);
    const recurringPercentage = (totalRecurring / summary.totalExpenses) * 100;
    
    if (recurringPercentage > 50) {
      insights.push({
        type: 'info',
        message: `${recurringPercentage.toFixed(1)}% of your expenses are recurring. Review subscriptions and memberships.`
      });
    }
  }

  return insights;
};

// Generate personalized recommendations
const generateRecommendations_internal = (summary) => {
  const recommendations = [];

  // Emergency fund recommendation
  const monthlyExpenses = summary.monthlySpend;
  const emergencyFund = monthlyExpenses * 6;
  
  if (summary.netWorth < emergencyFund) {
    recommendations.push(
      `Build an emergency fund of ₹${formatNumber(emergencyFund)} (6 months of expenses)`
    );
  }

  // Category-specific recommendations
  if (summary.categoryBreakdown.length > 0) {
    const foodSpending = summary.categoryBreakdown.find(cat => cat.category === 'food');
    if (foodSpending && foodSpending.percentage > 25) {
      recommendations.push('Consider meal planning and cooking at home to reduce food expenses');
    }

    const transportSpending = summary.categoryBreakdown.find(cat => cat.category === 'transport');
    if (transportSpending && transportSpending.percentage > 20) {
      recommendations.push('Explore public transport or carpooling options to reduce transport costs');
    }

    const entertainmentSpending = summary.categoryBreakdown.find(cat => cat.category === 'entertainment');
    if (entertainmentSpending && entertainmentSpending.percentage > 15) {
      recommendations.push('Look for free or low-cost entertainment alternatives');
    }
  }

  // Investment recommendations
  if (summary.savingsRate > 15) {
    recommendations.push('Consider investing your surplus in mutual funds or SIPs for long-term growth');
  }

  // Debt recommendations
  if (summary.netWorth < 0) {
    recommendations.push('Focus on paying off high-interest debt first using the avalanche method');
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
};
