import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  PiggyBank,
  CreditCard,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { InsightEngine } from '@/utils/insightEngine';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskQuestion?: (question: string) => void;
}

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  dataUsed: string[];
  actionable?: string;
  followUpQuestions?: string[];
}

const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  onAskQuestion
}) => {
  const { getFilteredData, permissions } = useFinancial();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateInsights();
    }
  }, [isOpen]);

  const generateInsights = async () => {
    setIsLoading(true);
    const data = getFilteredData();
    const insightEngine = new InsightEngine(data);

    try {
      const generatedInsights: Insight[] = [];

      // Spending Analysis
      if (permissions.transactions && data.transactions) {
        const spendingInsight = await insightEngine.processNaturalLanguageQuery('Analyze my spending patterns this month');
        if (spendingInsight) {
          generatedInsights.push({
            id: 'spending',
            type: spendingInsight.includes('increased') ? 'warning' : 'positive',
            title: 'Spending Pattern Analysis',
            description: spendingInsight,
            dataUsed: ['Transactions'],
            followUpQuestions: [
              'Show me my biggest expenses',
              'How can I reduce my spending?',
              'What did I spend on dining last month?'
            ]
          });
        }
      }

      // Net Worth Analysis
      if (permissions.assets && permissions.liabilities && data.assets && data.liabilities) {
        const totalAssets = data.assets.reduce((sum, asset) => sum + asset.value, 0);
        const totalLiabilities = data.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
        const netWorth = totalAssets - totalLiabilities;

        generatedInsights.push({
          id: 'networth',
          type: netWorth > 0 ? 'positive' : 'warning',
          title: 'Net Worth Health',
          description: `Your current net worth is MYR ${netWorth.toLocaleString()}. ${netWorth > 0 ? 'Great job maintaining a positive net worth!' : 'Consider focusing on debt reduction or asset building.'}`,
          dataUsed: ['Assets', 'Liabilities'],
          actionable: netWorth < 0 ? 'Focus on paying down high-interest debt first' : 'Consider increasing your investment allocation',
          followUpQuestions: [
            'How can I increase my net worth?',
            'What are my highest value assets?',
            'Should I pay off debt or invest?'
          ]
        });
      }

      // Investment Analysis
      if (permissions.investments && data.investments && data.investments.length > 0) {
        const totalGains = data.investments.reduce((sum, inv) => sum + inv.gainLoss, 0);
        const avgGainPercentage = data.investments.reduce((sum, inv) => sum + inv.gainLossPercentage, 0) / data.investments.length;

        generatedInsights.push({
          id: 'investments',
          type: totalGains >= 0 ? 'positive' : 'negative',
          title: 'Investment Performance',
          description: `Your investment portfolio shows ${totalGains >= 0 ? 'gains' : 'losses'} of MYR ${Math.abs(totalGains).toFixed(2)} with an average return of ${avgGainPercentage.toFixed(1)}%.`,
          dataUsed: ['Investments'],
          actionable: avgGainPercentage < 5 ? 'Consider diversifying your portfolio for better returns' : 'Your portfolio is performing well',
          followUpQuestions: [
            'Which investments are performing best?',
            'Should I rebalance my portfolio?',
            'How much should I invest monthly?'
          ]
        });
      }

      // Credit Score Analysis
      if (permissions.creditScore && data.creditScore) {
        const score = data.creditScore.score;
        generatedInsights.push({
          id: 'credit',
          type: score >= 750 ? 'positive' : score >= 650 ? 'neutral' : 'warning',
          title: 'Credit Health',
          description: `Your credit score of ${score} is ${score >= 750 ? 'excellent' : score >= 650 ? 'good' : 'needs improvement'}. ${data.creditScore.rating}`,
          dataUsed: ['Credit Score'],
          actionable: score < 700 ? 'Focus on timely payments and reducing credit utilization' : 'Maintain your excellent credit habits',
          followUpQuestions: [
            'How can I improve my credit score?',
            'What factors affect my credit the most?',
            'Should I apply for a new credit card?'
          ]
        });
      }

      // Debt Analysis
      if (permissions.liabilities && data.liabilities && data.liabilities.length > 0) {
        const totalDebt = data.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
        const highInterestDebt = data.liabilities.filter(debt => debt.interestRate && debt.interestRate > 15);

        generatedInsights.push({
          id: 'debt',
          type: highInterestDebt.length > 0 ? 'warning' : 'neutral',
          title: 'Debt Management',
          description: `You have MYR ${totalDebt.toLocaleString()} in total debt. ${highInterestDebt.length > 0 ? `${highInterestDebt.length} debt(s) have high interest rates that should be prioritized.` : 'Your debt interest rates are manageable.'}`,
          dataUsed: ['Liabilities'],
          actionable: highInterestDebt.length > 0 ? 'Consider the debt avalanche method - pay minimums on all debts, then put extra money toward the highest interest rate debt' : 'Continue making regular payments',
          followUpQuestions: [
            'What\'s the best way to pay off my debt?',
            'Should I consolidate my loans?',
            'How much extra should I pay on my debt?'
          ]
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <TrendingUp className="w-5 h-5 text-success" />;
      case 'negative': return <TrendingDown className="w-5 h-5 text-danger" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <Target className="w-5 h-5 text-primary" />;
    }
  };

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-l-success';
      case 'negative': return 'border-l-danger';
      case 'warning': return 'border-l-warning';
      default: return 'border-l-primary';
    }
  };

  const handleFollowUpQuestion = (question: string) => {
    onAskQuestion?.(question);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <span>AI Financial Insights</span>
          </DialogTitle>
          <DialogDescription>
            Personalized insights based on your financial data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Generating insights...</span>
            </div>
          ) : (
            <AnimatePresence>
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-l-4 ${getInsightBorderColor(insight.type)}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between text-lg">
                        <div className="flex items-center space-x-2">
                          {getInsightIcon(insight.type)}
                          <span>{insight.title}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {insight.dataUsed.map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              🔒 {category}
                            </Badge>
                          ))}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.description}
                      </p>

                      {insight.actionable && (
                        <div className="p-3 bg-primary/5 rounded-lg mb-3">
                          <p className="text-sm font-medium text-primary">
                            💡 Actionable Advice: {insight.actionable}
                          </p>
                        </div>
                      )}

                      {insight.followUpQuestions && insight.followUpQuestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">
                            Ask me more:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {insight.followUpQuestions.map((question, qIndex) => (
                              <Button
                                key={qIndex}
                                variant="outline"
                                size="sm"
                                className="text-xs h-auto py-1 px-2"
                                onClick={() => handleFollowUpQuestion(question)}
                              >
                                <MessageCircle className="w-3 h-3 mr-1" />
                                {question}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!isLoading && insights.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No insights available. Enable more data permissions to get personalized advice.
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Insights are generated based on your permitted data categories
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={generateInsights} disabled={isLoading}>
              Refresh Insights
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIInsightsModal;