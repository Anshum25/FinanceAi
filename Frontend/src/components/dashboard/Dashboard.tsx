import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank,
  Shield,
  AlertTriangle
} from 'lucide-react';
import KPICard from './KPICard';
import ExpenseChart from './ExpenseChart';
import ExpenseBreakdownChart from '@/components/charts/ExpenseBreakdownChart';
import AIInsightsModal from '@/components/modals/AIInsightsModal';
import GoalsModal from '@/components/goals/GoalsModal';
import { useFinancial } from '@/contexts/FinancialContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFReportGenerator } from '@/utils/pdfGenerator';

interface DashboardProps {
  onTogglePermissions: () => void;
  onOpenImport?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTogglePermissions, onOpenImport }) => {
  const { getFilteredData, permissions, awaitingImport } = useFinancial();
  const { addMessage } = useChat();
  const data = getFilteredData();
  
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // Calculate KPIs
  const totalAssets = data.assets?.reduce((sum, asset) => sum + asset.value, 0) || 0;
  const totalLiabilities = data.liabilities?.reduce((sum, liability) => sum + liability.balance, 0) || 0;
  const netWorth = totalAssets - totalLiabilities;
  
  const hasPermissions = Object.values(permissions).some(Boolean);
  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  // Calculate monthly spending
  const monthlySpending = data.transactions
    ? Math.abs(data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0))
    : 0;

  // Calculate investment gains
  const totalInvestmentValue = data.investments?.reduce((sum, inv) => sum + inv.totalValue, 0) || 0;
  const totalInvestmentGains = data.investments?.reduce((sum, inv) => sum + inv.gainLoss, 0) || 0;

  const handleGeneratePDF = async () => {
    try {
      const pdfGenerator = new PDFReportGenerator(data);
      await pdfGenerator.generateMonthlyReport();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleAskAI = (question: string) => {
    addMessage({
      role: 'user',
      content: question
    });
    // The parent component should handle opening the chat
  };

  if (!hasPermissions) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 gradient-primary rounded-2xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-4">
              Welcome to FinanceAI
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your personal AI financial assistant is ready to help you understand and optimize your finances. 
              To get started, grant access to your financial data categories.
            </p>

            <div className="financial-card p-8 max-w-md mx-auto mb-8">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Privacy First
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your financial data never leaves your device. You control exactly what information 
                the AI can access to provide insights.
              </p>
              <Button 
                onClick={onTogglePermissions}
                className="btn-hero w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Set Data Permissions
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="financial-card p-6 text-center">
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-semibold text-foreground mb-2">Smart Insights</h4>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered analysis of your spending patterns and financial health
                </p>
              </div>
              <div className="financial-card p-6 text-center">
                <div className="text-3xl mb-3">💬</div>
                <h4 className="font-semibold text-foreground mb-2">Natural Chat</h4>
                <p className="text-sm text-muted-foreground">
                  Ask questions in plain English about your finances
                </p>
              </div>
              <div className="financial-card p-6 text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-semibold text-foreground mb-2">Actionable Advice</h4>
                <p className="text-sm text-muted-foreground">
                  Receive personalized recommendations to improve your financial future
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Financial Dashboard
              </h1>
              <p className="text-muted-foreground">
                AI insights from {enabledCount} of {totalCount} data categories
              </p>
            </div>
            
            {enabledCount < totalCount && (
              <Alert className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some insights may be limited. Enable more data categories for better analysis.
                  <Button 
                    variant="link" 
                    className="p-0 ml-2 h-auto"
                    onClick={onTogglePermissions}
                  >
                    Manage Permissions
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {permissions.assets && permissions.liabilities && (
            <KPICard
              title="Net Worth"
              value={awaitingImport ? '---' : `MYR ${netWorth.toLocaleString()}`}
              change={awaitingImport ? undefined : (netWorth > 0 ? '+5.2% this month' : undefined)}
              changeType={awaitingImport ? 'neutral' : (netWorth > 0 ? 'positive' : 'negative')}
              icon={netWorth > 0 ? TrendingUp : TrendingDown}
              delay={0}
            />
          )}
          
          {permissions.transactions && (
            <KPICard
              title="Monthly Spending"
              value={awaitingImport ? '---' : `MYR ${monthlySpending.toLocaleString()}`}
              change={awaitingImport ? undefined : "-8.3% vs last month"}
              changeType={awaitingImport ? 'neutral' : 'positive'}
              icon={CreditCard}
              delay={0.1}
            />
          )}

          {permissions.investments && data.investments && data.investments.length > 0 && (
            <KPICard
              title="Investments"
              value={awaitingImport ? '---' : `MYR ${totalInvestmentValue.toLocaleString()}`}
              change={awaitingImport ? undefined : `${totalInvestmentGains >= 0 ? '+' : ''}${((totalInvestmentGains / (totalInvestmentValue - totalInvestmentGains)) * 100).toFixed(1)}%`}
              changeType={awaitingImport ? 'neutral' : (totalInvestmentGains >= 0 ? 'positive' : 'negative')}
              icon={TrendingUp}
              delay={0.2}
            />
          )}

          {permissions.creditScore && data.creditScore && (
            <KPICard
              title="Credit Score"
              value={awaitingImport ? '---' : data.creditScore.score.toString()}
              change={awaitingImport ? undefined : data.creditScore.rating}
              changeType={awaitingImport ? 'neutral' : (data.creditScore.score >= 700 ? 'positive' : 'neutral')}
              icon={PiggyBank}
              delay={0.3}
            />
          )}
        </div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!awaitingImport && permissions.transactions && data.transactions && (
            <>
              <ExpenseChart transactions={data.transactions} />
              <ExpenseBreakdownChart transactions={data.transactions} />
            </>
          )}
          
          {/* Savings Forecast - Enhanced */}
          {(awaitingImport || !permissions.transactions || !data.transactions) && (
            <motion.div
              className="financial-card p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {awaitingImport ? 'No data yet' : 'Savings Forecast'}
                </h3>
                {awaitingImport && (
                  <Button size="sm" variant="gradient" onClick={onOpenImport}>Import Data</Button>
                )}
              </div>
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-success/5 to-success/10 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-success mx-auto mb-4" />
                  {awaitingImport ? (
                    <>
                      <p className="text-muted-foreground mb-2">All values are set to ---</p>
                      <p className="text-xs text-muted-foreground">Import your data to unlock insights</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-2">Savings trend analysis</p>
                      <p className="text-xs text-muted-foreground">Enable transaction access to see your savings forecast</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Actions */}
        <motion.div
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="financial-card p-6 text-center">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="font-semibold text-foreground mb-2">AI Insights</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get personalized financial recommendations
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowAIInsights(true)}
            >
              View Insights
            </Button>
          </div>
          
          <div className="financial-card p-6 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold text-foreground mb-2">Monthly Report</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download comprehensive financial report
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleGeneratePDF}
            >
              Generate PDF
            </Button>
          </div>
          
          <div className="financial-card p-6 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-semibold text-foreground mb-2">Set Goals</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create and track financial objectives
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowGoals(true)}
            >
              Manage Goals
            </Button>
          </div>
        </motion.div>

        {/* Modals */}
        <AIInsightsModal
          isOpen={showAIInsights}
          onClose={() => setShowAIInsights(false)}
          onAskQuestion={handleAskAI}
        />
        
        <GoalsModal
          isOpen={showGoals}
          onClose={() => setShowGoals(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;