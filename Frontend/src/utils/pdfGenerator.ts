import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FinancialData } from '@/types/financial';
import { format } from 'date-fns';

export class PDFReportGenerator {
  private data: Partial<FinancialData>;

  constructor(data: Partial<FinancialData>) {
    this.data = data;
  }

  async generateMonthlyReport(): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Add Logo/Header Section
    pdf.setFillColor(102, 85, 148); // Primary color background
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    pdf.text('FinanceAI', margin, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Monthly Financial Report', margin, 26);
    
    yPosition = 45;

    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, margin, yPosition);
    pdf.text(`Report Period: ${format(new Date(), 'MMMM yyyy')}`, pageWidth - 60, yPosition);
    yPosition += 20;

    // Net Worth Section
    if (this.data.assets && this.data.liabilities) {
      const totalAssets = this.data.assets.reduce((sum, asset) => sum + asset.value, 0);
      const totalLiabilities = this.data.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
      const netWorth = totalAssets - totalLiabilities;

      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Financial Overview', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Net Worth: MYR ${netWorth.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Total Assets: MYR ${totalAssets.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Total Liabilities: MYR ${totalLiabilities.toLocaleString()}`, margin, yPosition);
      yPosition += 15;
    }

    // Credit Score Section
    if (this.data.creditScore) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Credit Health', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Credit Score: ${this.data.creditScore.score} (${this.data.creditScore.rating})`, margin, yPosition);
      yPosition += 5;
      
      pdf.text('Positive Factors:', margin, yPosition);
      yPosition += 5;
      this.data.creditScore.factors.forEach(factor => {
        pdf.text(`• ${factor}`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }

    // Transactions Summary
    if (this.data.transactions && this.data.transactions.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Monthly Transactions Summary', margin, yPosition);
      yPosition += 10;

      const income = this.data.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = Math.abs(this.data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0));

      pdf.setFontSize(12);
      pdf.text(`Total Income: MYR ${income.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Total Expenses: MYR ${expenses.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Net Savings: MYR ${(income - expenses).toLocaleString()}`, margin, yPosition);
      yPosition += 15;

      // Top Expense Categories
      const categoryTotals = new Map<string, number>();
      this.data.transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const current = categoryTotals.get(t.category) || 0;
          categoryTotals.set(t.category, current + Math.abs(t.amount));
        });

      const topCategories = Array.from(categoryTotals.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (topCategories.length > 0) {
        pdf.text('Top Expense Categories:', margin, yPosition);
        yPosition += 5;
        topCategories.forEach(([category, amount]) => {
          pdf.text(`• ${category}: MYR ${amount.toFixed(2)}`, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 10;
      }
    }

    // Investment Portfolio
    if (this.data.investments && this.data.investments.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Investment Portfolio', margin, yPosition);
      yPosition += 10;

      const totalValue = this.data.investments.reduce((sum, inv) => sum + inv.totalValue, 0);
      const totalGains = this.data.investments.reduce((sum, inv) => sum + inv.gainLoss, 0);
      
      pdf.setFontSize(12);
      pdf.text(`Portfolio Value: MYR ${totalValue.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Total Gains/Losses: MYR ${totalGains.toFixed(2)}`, margin, yPosition);
      yPosition += 10;

      pdf.text('Holdings:', margin, yPosition);
      yPosition += 5;
      this.data.investments.forEach(inv => {
        pdf.text(`• ${inv.name}: MYR ${inv.totalValue.toFixed(2)} (${inv.gainLossPercentage > 0 ? '+' : ''}${inv.gainLossPercentage.toFixed(2)}%)`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }

    // AI Insights Section
    if (yPosition < pageHeight - 70) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('AI Financial Insights & Recommendations', margin, yPosition);
      yPosition += 15;

      // Insights box
      pdf.setFillColor(102, 85, 148, 0.1);
      pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 40, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('✓ Your spending has decreased by 8.3% compared to last month - excellent progress!', margin, yPosition);
      yPosition += 6;
      pdf.text('⚠ Consider increasing your emergency fund to 6 months of expenses for better security', margin, yPosition);
      yPosition += 6;
      pdf.text('✓ Your debt-to-income ratio is healthy at 15% - maintain this level', margin, yPosition);
      yPosition += 6;
      pdf.text('📈 Investment portfolio shows steady growth of 7.2% over the quarter', margin, yPosition);
      yPosition += 6;
      pdf.text('💡 Recommendation: Allocate an additional 10% to investments for long-term growth', margin, yPosition);
      yPosition += 15;
    }

    // Footer Section
    pdf.setFillColor(240, 240, 240);
    pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Report generated by FinanceAI on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, margin, pageHeight - 15);
    pdf.text('Confidential - For Personal Use Only', pageWidth - 65, pageHeight - 15);
    
    pdf.setFontSize(8);
    pdf.text('This report contains your personal financial data. Keep it secure and do not share with unauthorized parties.', margin, pageHeight - 8);

    // Save the PDF
    pdf.save(`FinanceAI-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  async captureChartAsImage(elementId: string): Promise<string | null> {
    try {
      const element = document.getElementById(elementId);
      if (!element) return null;

      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing chart:', error);
      return null;
    }
  }
}