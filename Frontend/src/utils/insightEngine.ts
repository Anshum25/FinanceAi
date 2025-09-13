import { FinancialData, Transaction, AIInsight } from '@/types/financial';
import { format, subDays, subMonths, parseISO } from 'date-fns';

export class InsightEngine {
  private data: Partial<FinancialData>;

  constructor(data: Partial<FinancialData>) {
    this.data = data;
  }

  generateSpendingAnalysis(): AIInsight | null {
    if (!this.data.transactions) return null;

    const transactions = this.data.transactions;
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const threeMonthsAgo = subMonths(now, 3);

    // Calculate spending for different periods
    const lastMonthSpending = this.calculateSpending(transactions, lastMonth, now);
    const previousMonthSpending = this.calculateSpending(transactions, subMonths(lastMonth, 1), lastMonth);
    const avgThreeMonthSpending = this.calculateSpending(transactions, threeMonthsAgo, now) / 3;

    let severity: 'info' | 'warning' | 'success' | 'error' = 'info';
    let content = `You spent MYR ${lastMonthSpending.toFixed(2)} last month.`;

    // Check for unusual spending patterns
    const increaseFromPrevious = ((lastMonthSpending - previousMonthSpending) / previousMonthSpending) * 100;
    const increaseFromAverage = ((lastMonthSpending - avgThreeMonthSpending) / avgThreeMonthSpending) * 100;

    if (increaseFromAverage > 20) {
      severity = 'warning';
      content += ` This is ${increaseFromAverage.toFixed(1)}% higher than your 3-month average. Consider reviewing your recent purchases.`;
    } else if (increaseFromPrevious < -10) {
      severity = 'success';
      content += ` Great job! You reduced spending by ${Math.abs(increaseFromPrevious).toFixed(1)}% compared to the previous month.`;
    }

    // Add top spending categories
    const categories = this.getTopSpendingCategories(transactions, lastMonth, now);
    if (categories.length > 0) {
      content += ` Your top spending categories were: ${categories.slice(0, 3).map(c => `${c.category} (MYR ${c.amount.toFixed(2)})`).join(', ')}.`;
    }

    return {
      id: '',
      title: 'Spending Pattern Analysis',
      content,
      type: 'spending',
      severity,
      dataUsed: ['transactions'],
      timestamp: ''
    };
  }

  generateSavingsForecast(): AIInsight | null {
    if (!this.data.transactions) return null;

    const transactions = this.data.transactions;
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);

    const avgMonthlyIncome = this.calculateIncome(transactions, threeMonthsAgo, now) / 3;
    const avgMonthlyExpenses = Math.abs(this.calculateSpending(transactions, threeMonthsAgo, now)) / 3;
    const monthlySavings = avgMonthlyIncome - avgMonthlyExpenses;

    const threeMonthForecast = monthlySavings * 3;

    let severity: 'info' | 'warning' | 'success' | 'error' = 'info';
    let content = `Based on your current patterns, you're saving MYR ${monthlySavings.toFixed(2)} per month.`;

    if (monthlySavings > 0) {
      severity = 'success';
      content += ` At this rate, you'll save MYR ${threeMonthForecast.toFixed(2)} over the next 3 months.`;
    } else {
      severity = 'warning';
      content += ` You're currently spending more than you earn. Consider reducing expenses to improve your savings rate.`;
    }

    return {
      id: '',
      title: 'Savings Forecast',
      content,
      type: 'savings',
      severity,
      dataUsed: ['transactions'],
      timestamp: ''
    };
  }

  generateDebtStrategy(): AIInsight | null {
    if (!this.data.liabilities || this.data.liabilities.length === 0) return null;

    const debts = this.data.liabilities.filter(l => l.type !== 'mortgage');
    if (debts.length === 0) return null;

    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

    // Sort by interest rate for avalanche method
    const sortedByRate = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    // Sort by balance for snowball method
    const sortedByBalance = [...debts].sort((a, b) => a.balance - b.balance);

    const highestRateDebt = sortedByRate[0];
    const smallestDebt = sortedByBalance[0];

    let content = `You have MYR ${totalDebt.toFixed(2)} in non-mortgage debt. `;

    if (highestRateDebt.interestRate > 15) {
      content += `Consider the "Avalanche Method": focus extra payments on your ${highestRateDebt.name} (${highestRateDebt.interestRate}% interest) to save on interest costs.`;
    } else {
      content += `Consider the "Snowball Method": focus on paying off your ${smallestDebt.name} (MYR ${smallestDebt.balance.toFixed(2)}) first for psychological wins.`;
    }

    return {
      id: '',
      title: 'Debt Repayment Strategy',
      content,
      type: 'debt',
      severity: totalDebt > 10000 ? 'warning' : 'info',
      dataUsed: ['liabilities'],
      timestamp: ''
    };
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    // Spending queries
    if (lowerQuery.includes('spend') || lowerQuery.includes('expense')) {
      if (lowerQuery.includes('last month')) {
        return this.handleSpendingQuery('last_month');
      } else if (lowerQuery.includes('this month')) {
        return this.handleSpendingQuery('this_month');
      } else if (lowerQuery.includes('last 3 months') || lowerQuery.includes('three months')) {
        return this.handleSpendingQuery('three_months');
      }
    }

    // Savings queries
    if (lowerQuery.includes('save') || lowerQuery.includes('saving')) {
      return this.handleSavingsQuery();
    }

    // Net worth queries
    if (lowerQuery.includes('net worth') || lowerQuery.includes('worth')) {
      return this.handleNetWorthQuery();
    }

    // Debt queries
    if (lowerQuery.includes('debt') || lowerQuery.includes('loan') || lowerQuery.includes('owe')) {
      return this.handleDebtQuery();
    }

    // Default response
    return "I'd be happy to help you with your finances! You can ask me about your spending, savings, net worth, or debt. For example: 'How much did I spend last month?' or 'What's my current net worth?'";
  }

  private handleSpendingQuery(period: 'last_month' | 'this_month' | 'three_months'): string {
    if (!this.data.transactions) {
      return "I need access to your transactions to analyze spending. Would you like to grant access?";
    }

    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'last_month':
        startDate = subMonths(now, 1);
        periodLabel = 'last month';
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'this month';
        break;
      case 'three_months':
        startDate = subMonths(now, 3);
        periodLabel = 'the last 3 months';
        break;
    }

    const spending = Math.abs(this.calculateSpending(this.data.transactions, startDate, now));
    const categories = this.getTopSpendingCategories(this.data.transactions, startDate, now);

    let response = `You spent MYR ${spending.toFixed(2)} ${periodLabel}.`;
    
    if (categories.length > 0) {
      response += ` Your top spending categories were: ${categories.slice(0, 3).map(c => `${c.category} (MYR ${c.amount.toFixed(2)})`).join(', ')}.`;
    }

    return response;
  }

  private handleSavingsQuery(): string {
    if (!this.data.transactions) {
      return "I need access to your transactions to calculate your savings rate. Would you like to grant access?";
    }

    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);

    const avgMonthlyIncome = this.calculateIncome(this.data.transactions, threeMonthsAgo, now) / 3;
    const avgMonthlyExpenses = Math.abs(this.calculateSpending(this.data.transactions, threeMonthsAgo, now)) / 3;
    const monthlySavings = avgMonthlyIncome - avgMonthlyExpenses;

    if (monthlySavings > 0) {
      return `Based on your recent patterns, you're saving approximately MYR ${monthlySavings.toFixed(2)} per month. That's ${((monthlySavings / avgMonthlyIncome) * 100).toFixed(1)}% of your income!`;
    } else {
      return `Based on your recent patterns, you're currently spending more than you earn by approximately MYR ${Math.abs(monthlySavings).toFixed(2)} per month. Consider reviewing your expenses to improve your savings rate.`;
    }
  }

  private handleNetWorthQuery(): string {
    const hasAssets = this.data.assets && this.data.assets.length > 0;
    const hasLiabilities = this.data.liabilities && this.data.liabilities.length > 0;

    if (!hasAssets && !hasLiabilities) {
      return "I need access to your assets and liabilities to calculate your net worth. Would you like to grant access?";
    }

    const totalAssets = hasAssets ? this.data.assets!.reduce((sum, asset) => sum + asset.value, 0) : 0;
    const totalLiabilities = hasLiabilities ? this.data.liabilities!.reduce((sum, liability) => sum + liability.balance, 0) : 0;
    const netWorth = totalAssets - totalLiabilities;

    let response = `Your current net worth is MYR ${netWorth.toFixed(2)}.`;
    
    if (hasAssets) {
      response += ` You have MYR ${totalAssets.toFixed(2)} in assets`;
    }
    
    if (hasLiabilities) {
      response += hasAssets ? ` and MYR ${totalLiabilities.toFixed(2)} in liabilities.` : ` You have MYR ${totalLiabilities.toFixed(2)} in liabilities.`;
    }

    return response;
  }

  private handleDebtQuery(): string {
    if (!this.data.liabilities) {
      return "I need access to your liabilities to analyze your debt. Would you like to grant access?";
    }

    const debts = this.data.liabilities.filter(l => l.type !== 'mortgage');
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

    if (totalDebt === 0) {
      return "Great news! You don't have any consumer debt. You only have your mortgage remaining.";
    }

    const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const highestRateDebt = debts.reduce((highest, debt) => debt.interestRate > highest.interestRate ? debt : highest);

    return `You have MYR ${totalDebt.toFixed(2)} in consumer debt with minimum payments of MYR ${totalMinPayments.toFixed(2)} per month. Your highest interest debt is ${highestRateDebt.name} at ${highestRateDebt.interestRate}% - consider focusing extra payments there first.`;
  }

  private calculateSpending(transactions: Transaction[], startDate: Date, endDate: Date): number {
    return transactions
      .filter(t => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= startDate && transactionDate <= endDate && t.type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private calculateIncome(transactions: Transaction[], startDate: Date, endDate: Date): number {
    return transactions
      .filter(t => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= startDate && transactionDate <= endDate && t.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private getTopSpendingCategories(transactions: Transaction[], startDate: Date, endDate: Date): Array<{ category: string; amount: number }> {
    const categories = new Map<string, number>();

    transactions
      .filter(t => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= startDate && transactionDate <= endDate && t.type === 'expense';
      })
      .forEach(t => {
        const current = categories.get(t.category) || 0;
        categories.set(t.category, current + Math.abs(t.amount));
      });

    return Array.from(categories.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
}