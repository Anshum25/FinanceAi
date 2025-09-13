import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon, BarChart3, Eye } from 'lucide-react';
import { Transaction } from '@/types/financial';
import { format, parseISO } from 'date-fns';

interface ExpenseBreakdownChartProps {
  transactions: Transaction[];
}

interface CategoryData {
  category: string;
  amount: number;
  count: number;
  color: string;
  transactions: Transaction[];
}

const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ transactions }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [viewMode, setViewMode] = useState<'pie' | 'bar'>('pie');

  // Process expense data
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const categoryTotals = new Map<string, { amount: number; count: number; transactions: Transaction[] }>();
  
  expenseTransactions.forEach(transaction => {
    const category = transaction.category;
    const current = categoryTotals.get(category) || { amount: 0, count: 0, transactions: [] };
    categoryTotals.set(category, {
      amount: current.amount + Math.abs(transaction.amount),
      count: current.count + 1,
      transactions: [...current.transactions, transaction]
    });
  });

  // Define colors for categories
  const colors = [
    '#8B5CF6', // Primary purple
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5A2B', // Brown
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#F97316'  // Orange
  ];

  const categoryData: CategoryData[] = Array.from(categoryTotals.entries())
    .map(([category, data], index) => ({
      category,
      amount: data.amount,
      count: data.count,
      transactions: data.transactions,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8); // Top 8 categories

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  const formatTooltip = (value: number, name: string) => [
    `₹ ${value.toFixed(2)}`,
    name
  ];

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.amount / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.category}</p>
          <p className="text-primary">₹ {data.amount.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% of total</p>
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
        </div>
      );
    }
    return null;
  };

  const handleCategoryClick = (data: CategoryData) => {
    setSelectedCategory(data);
  };

  if (categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChartIcon className="w-5 h-5" />
            <span>Expense Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expense data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChartIcon className="w-5 h-5" />
                <span>Expense Breakdown</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('pie')}
                >
                  <PieChartIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('bar')}
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                      onClick={handleCategoryClick}
                      className="cursor-pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={entry.color}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip content={renderCustomTooltip} />
                    <Bar 
                      dataKey="amount" 
                      onClick={handleCategoryClick}
                      className="cursor-pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Category Summary */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.slice(0, 4).map((category) => (
                <Button
                  key={category.category}
                  variant="ghost"
                  className="h-auto p-2 justify-start"
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="flex items-center space-x-2 w-full">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="text-left flex-1">
                      <p className="text-xs font-medium truncate">
                        {category.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹ {category.amount.toFixed(0)}
                      </p>
                    </div>
                    <Eye className="w-3 h-3 text-muted-foreground" />
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Detail Modal */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedCategory?.color }}
              />
              <span>{selectedCategory?.category} Transactions</span>
            </DialogTitle>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    ₹ {selectedCategory.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {selectedCategory.count}
                  </p>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {((selectedCategory.amount / totalExpenses) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">of Total</p>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h4 className="font-semibold mb-3">Recent Transactions</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCategory.transactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 20)
                    .map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          ₹ {Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseBreakdownChart;