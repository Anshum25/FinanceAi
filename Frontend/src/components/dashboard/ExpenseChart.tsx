import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Transaction } from '@/types/financial';
import { subMonths, parseISO } from 'date-fns';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const COLORS = [
  'hsl(262, 85%, 58%)',  // Primary
  'hsl(268, 85%, 68%)',  // Primary Glow
  'hsl(142, 72%, 45%)',  // Success
  'hsl(38, 100%, 50%)',  // Warning
  'hsl(0, 72%, 55%)',    // Danger
  'hsl(220, 13%, 45%)',  // Muted
];

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    // Filter expenses from last month
    const lastMonthExpenses = transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return transactionDate >= lastMonth && transactionDate <= now && t.type === 'expense';
    });

    // Group by category
    const categoryTotals = new Map<string, number>();
    lastMonthExpenses.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + Math.abs(t.amount));
    });

    // Convert to array and sort by amount
    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: 0 // Will be calculated after sorting
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Top 6 categories
      .map((item, index, array) => {
        const total = array.reduce((sum, cat) => sum + cat.value, 0);
        return {
          ...item,
          percentage: total > 0 ? (item.value / total) * 100 : 0
        };
      });
  }, [transactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="financial-card p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-primary">MYR {data.value.toFixed(2)}</p>
          <p className="text-muted-foreground text-sm">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <motion.div
        className="financial-card p-6 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-muted-foreground">No expense data available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Enable transaction access to see your spending breakdown
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="financial-card p-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Last Month Spending Breakdown
      </h3>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default ExpenseChart;