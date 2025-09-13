import AccountSummary from '../models/AccountSummary.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';

function monthKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function recomputeAccountSummary(userId, asOfDate = new Date()) {
  const month = monthKey(asOfDate);

  // Aggregate income/expenses for the month
  const start = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1);
  const end = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const txns = await Transaction.find({ userId, date: { $gte: start, $lte: end } }).lean();
  const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = Math.abs(txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0));
  const monthlySpend = totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Category breakdown (expenses only)
  const map = new Map();
  txns.filter(t => t.type === 'expense').forEach(t => {
    const key = t.category || 'other_expense';
    const cur = map.get(key) || { amount: 0, transactionCount: 0 };
    cur.amount += Math.abs(t.amount || 0);
    cur.transactionCount += 1;
    map.set(key, cur);
  });
  const totalCat = Array.from(map.values()).reduce((s, v) => s + v.amount, 0) || 1;
  const categoryBreakdown = Array.from(map.entries()).map(([category, v]) => ({
    category,
    amount: +v.amount.toFixed(2),
    percentage: +((v.amount / totalCat) * 100).toFixed(2),
    transactionCount: v.transactionCount,
  }));

  // Recurring vendors (simple heuristic)
  const vendorMap = new Map();
  txns.filter(t => t.type === 'expense').forEach(t => {
    const name = (t.merchant || t.description || '').trim().toUpperCase();
    if (!name) return;
    const cur = vendorMap.get(name) || { total: 0, count: 0 };
    cur.total += Math.abs(t.amount || 0);
    cur.count += 1;
    vendorMap.set(name, cur);
  });
  const recurringVendors = Array.from(vendorMap.entries())
    .filter(([, v]) => v.count >= 2)
    .slice(0, 10)
    .map(([name, v]) => ({
      name,
      category: 'subscriptions',
      averageAmount: +(v.total / v.count).toFixed(2),
      frequency: 'monthly',
      lastTransaction: end,
    }));

  // Net worth = assets + investments - liabilities
  const [assets, investments, liabilities] = await Promise.all([
    Asset.find({ userId }).lean(),
    Investment.find({ userId }).lean(),
    Liability.find({ userId }).lean(),
  ]);
  const assetsTotal = assets.reduce((s, a) => s + (a.balance || 0), 0);
  const investmentsTotal = investments.reduce((s, i) => s + (i.totalValue || i.currentPrice * i.quantity || 0), 0);
  const liabilitiesTotal = liabilities.reduce((s, l) => s + (l.currentBalance || 0), 0);
  const netWorth = assetsTotal + investmentsTotal - liabilitiesTotal;

  // Upsert AccountSummary (single document per user) and maintain monthlyTrends inline
  const existing = await AccountSummary.findOne({ user: userId });
  if (!existing) {
    await AccountSummary.create({
      user: userId,
      netWorth,
      totalIncome,
      totalExpenses,
      monthlySpend,
      savingsRate,
      categoryBreakdown,
      recurringVendors,
      monthlyTrends: [{ month, income: totalIncome, expenses: totalExpenses, savings: totalIncome - totalExpenses }],
      lastUpdated: new Date(),
    });
    return;
  }

  // Update monthlyTrends for the current month
  const trends = existing.monthlyTrends || [];
  const idx = trends.findIndex(t => t.month === month);
  const newEntry = { month, income: totalIncome, expenses: totalExpenses, savings: totalIncome - totalExpenses };
  if (idx >= 0) {
    trends[idx] = newEntry;
  } else {
    trends.push(newEntry);
  }

  existing.netWorth = netWorth;
  existing.totalIncome = totalIncome;
  existing.totalExpenses = totalExpenses;
  existing.monthlySpend = monthlySpend;
  existing.savingsRate = savingsRate;
  existing.categoryBreakdown = categoryBreakdown;
  existing.recurringVendors = recurringVendors;
  existing.monthlyTrends = trends;
  existing.lastUpdated = new Date();
  await existing.save();
}
