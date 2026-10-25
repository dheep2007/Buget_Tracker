import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./Transactions.css";

// Helper: format a number as Indian Rupees (e.g. ₹1,250.00)
function formatINR(num) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(num);
}

// Helper: turn a Date into "YYYY-MM-DD" for the <input type="date">
function toInputDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// Helper: today's date in "YYYY-MM-DD"
function todayStr() {
    return toInputDate(new Date());
}

function Transactions() {
    // ── Category lists from the backend ──
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);

    // ── Transaction list ──
    const [transactions, setTransactions] = useState([]);
    const [loadingList, setLoadingList] = useState(true);

    // ── Form fields ──
    const [type, setType] = useState("expense");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(todayStr());

    // ── Edit mode: null means "add mode", an id means "edit mode" ──
    const [editingId, setEditingId] = useState(null);

    // ── UI state ──
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ── Fetch categories and transactions on first load ──
    useEffect(() => {
        fetchCategories();
        fetchTransactions();
    }, []);

    // ── When type changes, reset category to the first option ──
    useEffect(() => {
        const list = type === "income" ? incomeCategories : expenseCategories;
        // Only reset if the current category isn't valid for the new type
        if (list.length > 0 && !list.includes(category)) {
            setCategory(list[0]);
        }
    }, [type, incomeCategories, expenseCategories]);

    // ── API calls ──

    async function fetchCategories() {
        try {
            const res = await api.get("/transactions/categories");
            setIncomeCategories(res.data.income);
            setExpenseCategories(res.data.expense);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load categories");
        }
    }

    async function fetchTransactions() {
        setLoadingList(true);
        try {
            const res = await api.get("/transactions");
            setTransactions(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load transactions");
        } finally {
            setLoadingList(false);
        }
    }

    // ── Form submit: create or update ──
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSaving(true);

        const body = {
            type,
            amount: Number(amount),
            category,
            description,
            date,
        };

        try {
            if (editingId) {
                // Update existing transaction
                await api.put(`/transactions/${editingId}`, body);
            } else {
                // Create new transaction
                await api.post("/transactions", body);
            }

            // Refresh the list and reset the form
            await fetchTransactions();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    // ── Edit: fill the form with an existing transaction ──
    function handleEdit(tx) {
        setEditingId(tx._id);
        setType(tx.type);
        setAmount(tx.amount);
        setCategory(tx.category);
        setDescription(tx.description || "");
        setDate(toInputDate(tx.date));
        setError("");
        // Scroll to top so the user sees the form
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ── Delete: confirm then remove ──
    async function handleDelete(id) {
        if (!window.confirm("Delete this transaction?")) return;
        setError("");
        try {
            await api.delete(`/transactions/${id}`);
            await fetchTransactions();
            // If we were editing this transaction, exit edit mode
            if (editingId === id) resetForm();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete");
        }
    }

    // ── Reset form back to "add" mode ──
    function resetForm() {
        setEditingId(null);
        setType("expense");
        setAmount("");
        const list = expenseCategories;
        setCategory(list.length > 0 ? list[0] : "");
        setDescription("");
        setDate(todayStr());
    }

    // ── Which categories to show in the dropdown? ──
    const categoryOptions = type === "income" ? incomeCategories : expenseCategories;

    // ── Render ──
    return (
        <div className="transactions-page">
            <Link to="/" className="back-link">← Back to Dashboard</Link>
            <h1>Transactions</h1>

            {/* Error message */}
            {error && <div className="tx-error">{error}</div>}

            {/* ── Add / Edit form ── */}
            <form className="tx-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Amount (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            {categoryOptions.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group full">
                    <label>Description (optional)</label>
                    <input
                        type="text"
                        maxLength={200}
                        placeholder="e.g. Lunch at canteen"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="form-buttons">
                    <button type="submit" className="btn-submit" disabled={saving}>
                        {saving
                            ? (editingId ? "Updating..." : "Adding...")
                            : (editingId ? "Update" : "Add Transaction")}
                    </button>
                    {editingId && (
                        <button type="button" className="btn-cancel" onClick={resetForm}>
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* ── Transaction list ── */}
            {loadingList ? (
                <p>Loading...</p>
            ) : transactions.length === 0 ? (
                <p className="tx-empty">No transactions yet. Add one above!</p>
            ) : (
                <div className="tx-list">
                    {transactions.map((tx) => (
                        <div className="tx-item" key={tx._id}>
                            <div className="tx-item-left">
                                <div className="tx-item-top">
                                    <span className="tx-category">{tx.category}</span>
                                    <span className={`tx-type-badge ${tx.type}`}>{tx.type}</span>
                                </div>
                                {tx.description && <span className="tx-desc">{tx.description}</span>}
                                <span className="tx-date">{new Date(tx.date).toLocaleDateString("en-IN")}</span>
                            </div>

                            <div className="tx-item-right">
                                <span className={`tx-amount ${tx.type}`}>
                                    {tx.type === "income" ? "+" : "−"}{formatINR(tx.amount)}
                                </span>
                                <div className="tx-actions">
                                    <button className="btn-edit" onClick={() => handleEdit(tx)}>Edit</button>
                                    <button className="btn-delete" onClick={() => handleDelete(tx._id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Transactions;
