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
    const threeMonthSpending = this.calculateSpending(transactions, threeMonthsAgo, now);

    const avgMonthlySpending = threeMonthSpending / 3;
    const spendingChange = ((lastMonthSpending - avgMonthlySpending) / avgMonthlySpending) * 100;

    return {
      id: 'spending-analysis',
      type: 'spending',
      title: 'Spending Analysis',
      description: this.generateSpendingDescription(lastMonthSpending, spendingChange),
      severity: this.getSpendingSeverity(spendingChange),
      actionItems: this.generateSpendingActions(spendingChange),
      data: {
        lastMonthSpending,
        avgMonthlySpending,
        spendingChange
      }
    };
  }

  generateIncomeAnalysis(): AIInsight | null {
    if (!this.data.transactions) return null;

    const transactions = this.data.transactions;
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const threeMonthsAgo = subMonths(now, 3);

    const lastMonthIncome = this.calculateIncome(transactions, lastMonth, now);
    const threeMonthIncome = this.calculateIncome(transactions, threeMonthsAgo, now);
    const avgMonthlyIncome = threeMonthIncome / 3;
    const incomeChange = ((lastMonthIncome - avgMonthlyIncome) / avgMonthlyIncome) * 100;

    return {
      id: 'income-analysis',
      type: 'income',
      title: 'Income Analysis',
      description: this.generateIncomeDescription(lastMonthIncome, incomeChange),
      severity: this.getIncomeSeverity(incomeChange),
      actionItems: this.generateIncomeActions(incomeChange),
      data: {
        lastMonthIncome,
        avgMonthlyIncome,
        incomeChange
      }
    };
  }

  generateSavingsAnalysis(): AIInsight | null {
    if (!this.data.transactions) return null;

    const transactions = this.data.transactions;
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    const lastMonthIncome = this.calculateIncome(transactions, lastMonth, now);
    const lastMonthSpending = this.calculateSpending(transactions, lastMonth, now);
    const savingsAmount = lastMonthIncome - lastMonthSpending;
    const savingsRate = lastMonthIncome > 0 ? (savingsAmount / lastMonthIncome) * 100 : 0;

    return {
      id: 'savings-analysis',
      type: 'savings',
      title: 'Savings Analysis',
      description: this.generateSavingsDescription(savingsAmount, savingsRate),
      severity: this.getSavingsSeverity(savingsRate),
      actionItems: this.generateSavingsActions(savingsRate),
      data: {
        savingsAmount,
        savingsRate,
        lastMonthIncome,
        lastMonthSpending
      }
    };
  }

  generateDebtAnalysis(): AIInsight | null {
    if (!this.data.liabilities || this.data.liabilities.length === 0) return null;

    const totalDebt = this.data.liabilities.reduce((sum, liability) => sum + (liability.currentBalance || 0), 0);
    const highInterestDebt = this.data.liabilities.filter(l => (l.interestRate || 0) > 15);
    const avgInterestRate = this.data.liabilities.reduce((sum, l) => sum + (l.interestRate || 0), 0) / this.data.liabilities.length;

    return {
      id: 'debt-analysis',
      type: 'debt',
      title: 'Debt Analysis',
      description: this.generateDebtDescription(totalDebt, highInterestDebt.length, avgInterestRate),
      severity: this.getDebtSeverity(totalDebt, avgInterestRate),
      actionItems: this.generateDebtActions(highInterestDebt, avgInterestRate),
      data: {
        totalDebt,
        highInterestDebtCount: highInterestDebt.length,
        avgInterestRate
      }
    };
  }

  processNaturalLanguageQuery(query: string): AIInsight[] {
    const insights: AIInsight[] = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes('spend') || queryLower.includes('expense')) {
      const spendingInsight = this.generateSpendingAnalysis();
      if (spendingInsight) insights.push(spendingInsight);
    }

    if (queryLower.includes('income') || queryLower.includes('earn')) {
      const incomeInsight = this.generateIncomeAnalysis();
      if (incomeInsight) insights.push(incomeInsight);
    }

    if (queryLower.includes('save') || queryLower.includes('saving')) {
      const savingsInsight = this.generateSavingsAnalysis();
      if (savingsInsight) insights.push(savingsInsight);
    }

    if (queryLower.includes('debt') || queryLower.includes('loan')) {
      const debtInsight = this.generateDebtAnalysis();
      if (debtInsight) insights.push(debtInsight);
    }

    // If no specific query, return all insights
    if (insights.length === 0) {
      const allInsights = [
        this.generateSpendingAnalysis(),
        this.generateIncomeAnalysis(),
        this.generateSavingsAnalysis(),
        this.generateDebtAnalysis()
      ].filter(Boolean) as AIInsight[];
      
      return allInsights;
    }

    return insights;
  }

  private calculateSpending(transactions: Transaction[], startDate: Date, endDate: Date): number {
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'expense' && transactionDate >= startDate && transactionDate <= endDate;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private calculateIncome(transactions: Transaction[], startDate: Date, endDate: Date): number {
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'income' && transactionDate >= startDate && transactionDate <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private generateSpendingDescription(amount: number, change: number): string {
    const changeText = change > 0 ? `increased by ${change.toFixed(1)}%` : `decreased by ${Math.abs(change).toFixed(1)}%`;
    return `You spent $${amount.toFixed(2)} last month, which has ${changeText} compared to your 3-month average.`;
  }

  private generateIncomeDescription(amount: number, change: number): string {
    const changeText = change > 0 ? `increased by ${change.toFixed(1)}%` : `decreased by ${Math.abs(change).toFixed(1)}%`;
    return `Your income was $${amount.toFixed(2)} last month, which has ${changeText} compared to your 3-month average.`;
  }

  private generateSavingsDescription(amount: number, rate: number): string {
    if (amount > 0) {
      return `You saved $${amount.toFixed(2)} last month, achieving a ${rate.toFixed(1)}% savings rate.`;
    } else {
      return `You spent $${Math.abs(amount).toFixed(2)} more than you earned last month.`;
    }
  }

  private generateDebtDescription(totalDebt: number, highInterestCount: number, avgRate: number): string {
    let description = `You have $${totalDebt.toFixed(2)} in total debt with an average interest rate of ${avgRate.toFixed(1)}%.`;
    if (highInterestCount > 0) {
      description += ` ${highInterestCount} of your debts have high interest rates (>15%).`;
    }
    return description;
  }

  private getSpendingSeverity(change: number): 'low' | 'medium' | 'high' {
    if (change > 20) return 'high';
    if (change > 10) return 'medium';
    return 'low';
  }

  private getIncomeSeverity(change: number): 'low' | 'medium' | 'high' {
    if (change < -10) return 'high';
    if (change < 0) return 'medium';
    return 'low';
  }

  private getSavingsSeverity(rate: number): 'low' | 'medium' | 'high' {
    if (rate < 0) return 'high';
    if (rate < 10) return 'medium';
    return 'low';
  }

  private getDebtSeverity(totalDebt: number, avgRate: number): 'low' | 'medium' | 'high' {
    if (totalDebt > 50000 || avgRate > 20) return 'high';
    if (totalDebt > 20000 || avgRate > 15) return 'medium';
    return 'low';
  }

  private generateSpendingActions(change: number): string[] {
    const actions = [];
    if (change > 20) {
      actions.push('Review your recent expenses to identify unusual spending');
      actions.push('Set up spending alerts for large purchases');
    } else if (change > 10) {
      actions.push('Monitor your spending categories more closely');
    } else {
      actions.push('Continue maintaining your current spending habits');
    }
    return actions;
  }

  private generateIncomeActions(change: number): string[] {
    const actions = [];
    if (change < -10) {
      actions.push('Explore additional income sources');
      actions.push('Review your budget to adjust for lower income');
    } else if (change > 10) {
      actions.push('Consider increasing your savings rate');
      actions.push('Review your investment strategy');
    }
    return actions;
  }

  private generateSavingsActions(rate: number): string[] {
    const actions = [];
    if (rate < 0) {
      actions.push('Create an emergency budget plan');
      actions.push('Identify areas to cut expenses immediately');
    } else if (rate < 10) {
      actions.push('Aim to increase your savings rate to 10-20%');
      actions.push('Review and optimize your monthly expenses');
    } else {
      actions.push('Great job! Consider investing your excess savings');
    }
    return actions;
  }

  private generateDebtActions(highInterestDebt: any[], avgRate: number): string[] {
    const actions = [];
    if (highInterestDebt.length > 0) {
      actions.push('Prioritize paying off high-interest debt first');
      actions.push('Consider debt consolidation options');
    }
    if (avgRate > 15) {
      actions.push('Look into refinancing options for lower rates');
    }
    actions.push('Create a debt payoff plan with target dates');
    return actions;
  }
}
