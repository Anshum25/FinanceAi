import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: 'savings' | 'debt' | 'investment' | 'emergency' | 'other';
  description?: string;
  createdAt: string;
  isCompleted: boolean;
}

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoalsModal: React.FC<GoalsModalProps> = ({ isOpen, onClose }) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'savings' as const,
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const loadGoals = () => {
    const savedGoals = localStorage.getItem('financeai-goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  };

  const saveGoals = (updatedGoals: FinancialGoal[]) => {
    localStorage.setItem('financeai-goals', JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount || !newGoal.targetDate) return;

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      title: newGoal.title,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: parseFloat(newGoal.currentAmount) || 0,
      targetDate: newGoal.targetDate,
      category: newGoal.category,
      description: newGoal.description,
      createdAt: new Date().toISOString(),
      isCompleted: false
    };

    const updatedGoals = [...goals, goal];
    saveGoals(updatedGoals);
    
    setNewGoal({
      title: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: 'savings',
      description: ''
    });
    setIsAddingGoal(false);
  };

  const handleUpdateProgress = (goalId: string, newAmount: number) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updated = { 
          ...goal, 
          currentAmount: newAmount,
          isCompleted: newAmount >= goal.targetAmount 
        };
        return updated;
      }
      return goal;
    });
    saveGoals(updatedGoals);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    saveGoals(updatedGoals);
  };

  const getProgressPercentage = (goal: FinancialGoal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    return differenceInDays(parseISO(targetDate), new Date());
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'savings': return '🏦';
      case 'debt': return '💳';
      case 'investment': return '📈';
      case 'emergency': return '🛡️';
      default: return '🎯';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'savings': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'debt': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'investment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'emergency': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Financial Goals</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Goal */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Your Goals</h3>
              <Button
                onClick={() => setIsAddingGoal(!isAddingGoal)}
                size="sm"
                className="btn-hero"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Goal
              </Button>
            </div>

            <AnimatePresence>
              {isAddingGoal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mb-4 p-4 bg-muted/30 rounded-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Goal Title</Label>
                      <Input
                        id="title"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        placeholder="e.g., Emergency Fund"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({...newGoal, category: e.target.value as any})}
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="savings">Savings</option>
                        <option value="debt">Debt Payoff</option>
                        <option value="investment">Investment</option>
                        <option value="emergency">Emergency Fund</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="targetAmount">Target Amount (MYR)</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currentAmount">Current Amount (MYR)</Label>
                      <Input
                        id="currentAmount"
                        type="number"
                        value={newGoal.currentAmount}
                        onChange={(e) => setNewGoal({...newGoal, currentAmount: e.target.value})}
                        placeholder="2500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="targetDate">Target Date</Label>
                      <Input
                        id="targetDate"
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                        placeholder="6 months of expenses"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleAddGoal} size="sm">
                      Add Goal
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingGoal(false)} 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Goals List */}
          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No goals set yet. Add your first financial goal to get started!
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {goals.map((goal, index) => {
                  const progress = getProgressPercentage(goal);
                  const daysRemaining = getDaysRemaining(goal.targetDate);
                  
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`${goal.isCompleted ? 'border-success bg-success/5' : ''}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                              <div>
                                <h3 className="font-semibold flex items-center space-x-2">
                                  {goal.title}
                                  {goal.isCompleted && (
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                  )}
                                </h3>
                                {goal.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {goal.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getCategoryColor(goal.category)}>
                                {goal.category}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGoal(goal.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Progress */}
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Progress</span>
                                <span className="font-medium">
                                  MYR {goal.currentAmount.toLocaleString()} / MYR {goal.targetAmount.toLocaleString()}
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {progress.toFixed(1)}% complete
                              </p>
                            </div>

                            {/* Timeline */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>Target: {format(parseISO(goal.targetDate), 'MMM dd, yyyy')}</span>
                              </div>
                              <span className={`font-medium ${daysRemaining < 0 ? 'text-danger' : daysRemaining < 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                                {daysRemaining < 0 
                                  ? `${Math.abs(daysRemaining)} days overdue`
                                  : `${daysRemaining} days remaining`
                                }
                              </span>
                            </div>

                            {/* Update Progress */}
                            {!goal.isCompleted && (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  placeholder={goal.currentAmount.toString()}
                                  className="flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.target as HTMLInputElement;
                                      const newAmount = parseFloat(input.value);
                                      if (!isNaN(newAmount)) {
                                        handleUpdateProgress(goal.id, newAmount);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                                    const newAmount = parseFloat(input.value);
                                    if (!isNaN(newAmount)) {
                                      handleUpdateProgress(goal.id, newAmount);
                                      input.value = '';
                                    }
                                  }}
                                >
                                  Update
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsModal;