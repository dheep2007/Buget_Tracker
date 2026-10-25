import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import Navbar from "../components/Navbar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./Dashboard.css";

// Helper: format number as Indian Rupees (no decimals)
function formatINR(num) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/dashboard/summary");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="dashboard-page">
          <p>Loading dashboard...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="dashboard-page">
          <p className="error-msg">{error}</p>
          <button onClick={fetchSummary}>Retry</button>
        </div>
      </>
    );
  }

  const isEmpty =
    data &&
    data.totalIncome === 0 &&
    data.totalExpense === 0 &&
    (!data.recentTransactions || data.recentTransactions.length === 0);

  return (
    <>
      <Navbar />
      <div className="dashboard-page">
        <header className="dashboard-header">
          <h1>Welcome, {user.name}</h1>
        </header>

        {isEmpty ? (
          <div className="empty-state">
            <p>You have no transactions yet.</p>
            <Link to="/transactions" className="btn-primary">
              Add your first transaction
            </Link>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="summary-cards">
              <div className="card card-income">
                <h3>Total Income</h3>
                <p>{formatINR(data.totalIncome)}</p>
              </div>
              <div className="card card-expense">
                <h3>Total Expenses</h3>
                <p>{formatINR(data.totalExpense)}</p>
              </div>
              <div className="card card-balance">
                <h3>Balance</h3>
                <p>{formatINR(data.balance)}</p>
              </div>
              <div className="card card-savings">
                <h3>Savings Rate</h3>
                <p>{data.savingsRate}%</p>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-section">
              <div className="chart-wrapper bar-chart">
                <h3>Monthly Income / Expense</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthlyTrend}>
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => {
                        const [year, month] = m.split("-");
                        const date = new Date(year, month - 1);
                        return date.toLocaleString("en-IN", {
                          month: "short",
                          year: "numeric",
                        });
                      }}
                    />
                    <YAxis />
                    <RechartTooltip formatter={(value) => formatINR(value)} />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrapper pie-chart">
                <h3>Expense by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.expenseByCategory}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) =>
                        `${entry.category}: ${formatINR(entry.total)}`
                      }
                    >
                      {data.expenseByCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [
                              "#f87171",
                              "#fbbf24",
                              "#34d399",
                              "#60a5fa",
                              "#a78bfa",
                              "#f472b6",
                            ][index % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <RechartTooltip formatter={(value) => formatINR(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <section className="recent-transactions">
              <h3>Recent Transactions</h3>
              <ul>
                {data.recentTransactions.map((tx) => (
                  <li key={tx._id} className="tx-item">
                    <span className="tx-date">
                      {new Date(tx.date).toLocaleDateString("en-IN")}
                    </span>
                    <span className="tx-category">{tx.category}</span>
                    <span className={`tx-amount ${tx.type}`}>
                      {" "}
                      {tx.type === "income" ? "+" : "−"}
                      {formatINR(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/transactions" className="link-btn">
                View all →
              </Link>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default Dashboard;