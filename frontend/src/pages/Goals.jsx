import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./Goals.css";

// ---------- small helper functions ----------

// 50000 -> ₹50,000 (Indian number grouping)
const formatINR = (n) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);

// "2026-12-31T00:00:00.000Z" -> "31 Dec 2026"
const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });

// ISO date -> "2026-12-31" (the format <input type="date"> needs)
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// Read the backend's { message } error, or show a default
const getMessage = (err) =>
    err.response?.data?.message || "Something went wrong. Please try again.";

// Same rules as the backend. Returns an error text, or "" if the form is OK.
const validateForm = (form) => {
    if (!form.title.trim()) return "Title is required";
    if (form.title.trim().length > 100) return "Title must be at most 100 characters";
    const target = Number(form.targetAmount);
    if (form.targetAmount === "" || isNaN(target) || target <= 0)
        return "Target amount must be a number greater than 0";
    if (form.currentAmount !== "") {
        const current = Number(form.currentAmount);
        if (isNaN(current) || current < 0) return "Current savings cannot be negative";
    }
    return "";
};

// Overdue = deadline passed (with the whole deadline day allowed) and goal not done
const isOverdue = (goal) =>
    goal.deadline &&
    !goal.isCompleted &&
    new Date(goal.deadline).getTime() + 24 * 60 * 60 * 1000 < Date.now();

const emptyForm = { title: "", targetAmount: "", currentAmount: "", deadline: "" };

// ---------- one goal card ----------
function GoalCard({ goal, onUpdated, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const startEdit = () => {
        setForm({
            title: goal.title,
            targetAmount: String(goal.targetAmount),
            currentAmount: String(goal.currentAmount),
            deadline: toDateInput(goal.deadline),
        });
        setError("");
        setEditing(true);
    };

    // Save edited goal -> PUT /api/goals/:id
    const saveEdit = async (e) => {
        e.preventDefault();
        const msg = validateForm(form);
        if (msg) return setError(msg);
        setBusy(true);
        setError("");
        try {
            const res = await api.put(`/goals/${goal._id}`, {
                title: form.title.trim(),
                targetAmount: Number(form.targetAmount),
                currentAmount: form.currentAmount === "" ? 0 : Number(form.currentAmount),
                deadline: form.deadline || null, // null clears the deadline
            });
            onUpdated(res.data);
            setEditing(false);
        } catch (err) {
            setError(getMessage(err));
        } finally {
            setBusy(false);
        }
    };

    // Add savings -> PATCH /api/goals/:id/progress
    const addSavings = async () => {
        const value = Number(amount);
        if (amount === "" || isNaN(value) || value <= 0)
            return setError("Enter an amount greater than 0");
        setBusy(true);
        setError("");
        try {
            const res = await api.patch(`/goals/${goal._id}/progress`, { amount: value });
            onUpdated(res.data);
            setAmount("");
        } catch (err) {
            setError(getMessage(err));
        } finally {
            setBusy(false);
        }
    };

    // Delete -> DELETE /api/goals/:id
    const handleDelete = async () => {
        if (!window.confirm(`Delete the goal "${goal.title}"?`)) return;
        setBusy(true);
        setError("");
        try {
            await api.delete(`/goals/${goal._id}`);
            onDeleted(goal._id);
        } catch (err) {
            setError(getMessage(err));
            setBusy(false);
        }
    };

    // ----- edit mode -----
    if (editing) {
        return (
            <div className="goals-card">
                <form onSubmit={saveEdit} className="goals-form">
                    <label>
                        Title
                        <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>
                    <label>
                        Target amount (₹)
                        <input
                            type="number"
                            value={form.targetAmount}
                            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                        />
                    </label>
                    <label>
                        Current savings (₹)
                        <input
                            type="number"
                            value={form.currentAmount}
                            onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                        />
                    </label>
                    <label>
                        Deadline (optional)
                        <input
                            type="date"
                            value={form.deadline}
                            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                        />
                    </label>
                    {error && <p className="goals-error">{error}</p>}
                    <div className="goals-row">
                        <button type="submit" className="goals-btn goals-btn-primary" disabled={busy}>
                            {busy ? "Saving..." : "Save"}
                        </button>
                        <button
                            type="button"
                            className="goals-btn"
                            disabled={busy}
                            onClick={() => setEditing(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // ----- normal view -----
    return (
        <div className="goals-card">
            <div className="goals-card-head">
                <h3>{goal.title}</h3>
                <div className="goals-badges">
                    {goal.isCompleted && <span className="goals-badge goals-badge-done">Completed</span>}
                    {isOverdue(goal) && <span className="goals-badge goals-badge-overdue">Overdue</span>}
                </div>
            </div>

            <p className="goals-amounts">
                <strong>{formatINR(goal.currentAmount)}</strong> saved of {formatINR(goal.targetAmount)}
            </p>

            <div
                className="goals-bar"
                role="progressbar"
                aria-valuenow={goal.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={`goals-bar-fill ${goal.isCompleted ? "goals-bar-done" : ""}`}
                    style={{ width: `${goal.progressPercent}%` }}
                />
            </div>

            <p className="goals-meta">
                {goal.progressPercent}% &middot; {formatINR(goal.remainingAmount)} remaining
                {goal.deadline && <> &middot; Deadline: {formatDate(goal.deadline)}</>}
            </p>

            <div className="goals-row">
                <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="goals-amount-input"
                />
                <button className="goals-btn goals-btn-primary" onClick={addSavings} disabled={busy}>
                    Add Savings
                </button>
            </div>

            {error && <p className="goals-error">{error}</p>}

            <div className="goals-row goals-actions">
                <button className="goals-btn" onClick={startEdit} disabled={busy}>
                    Edit
                </button>
                <button className="goals-btn goals-btn-danger" onClick={handleDelete} disabled={busy}>
                    Delete
                </button>
            </div>
        </div>
    );
}

// ---------- the page ----------
export default function Goals() {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // Load goals once when the page opens -> GET /api/goals
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/goals");
                setGoals(res.data);
            } catch (err) {
                setLoadError(getMessage(err));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Create goal -> POST /api/goals
    const handleCreate = async (e) => {
        e.preventDefault();
        const msg = validateForm(form);
        if (msg) return setFormError(msg);
        setSaving(true);
        setFormError("");
        try {
            const payload = {
                title: form.title.trim(),
                targetAmount: Number(form.targetAmount),
                currentAmount: form.currentAmount === "" ? 0 : Number(form.currentAmount),
            };
            if (form.deadline) payload.deadline = form.deadline;
            const res = await api.post("/goals", payload);
            setGoals((prev) => [res.data, ...prev]); // show new goal at the top
            setForm(emptyForm);
        } catch (err) {
            setFormError(getMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const replaceGoal = (updated) =>
        setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));

    const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g._id !== id));

    return (
        <div className="goals-page">
            <div className="goals-header">
                <h1>Savings Goals</h1>
                <Link to="/" className="goals-back">
                    &larr; Back to Dashboard
                </Link>
            </div>

            <section className="goals-card">
                <h2>Add a Goal</h2>
                <form onSubmit={handleCreate} className="goals-form">
                    <label>
                        Title
                        <input
                            value={form.title}
                            placeholder="e.g. Laptop Fund"
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>
                    <label>
                        Target amount (₹)
                        <input
                            type="number"
                            value={form.targetAmount}
                            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                        />
                    </label>
                    <label>
                        Current savings (₹, optional)
                        <input
                            type="number"
                            value={form.currentAmount}
                            onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                        />
                    </label>
                    <label>
                        Deadline (optional)
                        <input
                            type="date"
                            value={form.deadline}
                            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                        />
                    </label>
                    {formError && <p className="goals-error">{formError}</p>}
                    <button type="submit" className="goals-btn goals-btn-primary" disabled={saving}>
                        {saving ? "Saving..." : "Add Goal"}
                    </button>
                </form>
            </section>

            {loading && <p className="goals-message">Loading goals...</p>}
            {loadError && <p className="goals-error">{loadError}</p>}
            {!loading && !loadError && goals.length === 0 && (
                <p className="goals-message">No savings goals yet. Create your first one above.</p>
            )}

            <div className="goals-list">
                {goals.map((goal) => (
                    <GoalCard key={goal._id} goal={goal} onUpdated={replaceGoal} onDeleted={removeGoal} />
                ))}
            </div>
        </div>
    );
}