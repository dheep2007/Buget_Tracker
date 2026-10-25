const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// @route   GET /api/dashboard/summary
// @access  Private
// Returns a summary of the logged-in user's financial data
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id; // protect middleware attaches user document
    const objectId = new mongoose.Types.ObjectId(userId);
    const pipeline = [
      { $match: { user: objectId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
              }
            }
          ],
          expenseByCategory: [
            { $match: { type: 'expense' } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $project: { _id: 0, category: '$_id', total: 1 } }
          ],
          incomeByCategory: [
            { $match: { type: 'income' } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $project: { _id: 0, category: '$_id', total: 1 } }
          ],
          monthlyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'Asia/Kolkata' } },
                income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
              }
            },
            { $sort: { _id: 1 } }
          ],
          recentTransactions: [
            { $sort: { date: -1, createdAt: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ];
    const agg = await Transaction.aggregate(pipeline);
    const data = agg[0] || {};
    const totals = (data.totals && data.totals[0]) || { totalIncome: 0, totalExpense: 0 };
    const totalIncome = totals.totalIncome || 0;
    const totalExpense = totals.totalExpense || 0;
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome === 0 ? 0 : Math.round(((balance / totalIncome) * 1000)) / 10;

    // Build 6-month trend with zeroes for missing months
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
    }
    const trendMap = {};
    (data.monthlyTrend || []).forEach(m => { trendMap[m._id] = { income: m.income, expense: m.expense }; });
    const monthlyTrend = months.map(m => ({ month: m, income: trendMap[m]?.income || 0, expense: trendMap[m]?.expense || 0 }));

    res.json({
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      expenseByCategory: data.expenseByCategory || [],
      incomeByCategory: data.incomeByCategory || [],
      monthlyTrend,
      recentTransactions: data.recentTransactions || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getDashboardSummary };