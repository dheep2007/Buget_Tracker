# Budget Tracker ? Evidence Report

> Generated: 2026-10-25
> All findings are quoted directly from source files. Nothing is guessed.
> `.env` values, secrets, and connection strings are intentionally omitted.

---

## 1. Folder Tree

### `backend/` (excluding `node_modules/`, `scratch/`)

```
backend/
„¥„Ÿ„Ÿ .env
„¥„Ÿ„Ÿ .gitignore
„¥„Ÿ„Ÿ package.json
„¥„Ÿ„Ÿ package-lock.json
„¥„Ÿ„Ÿ server.js
„¥„Ÿ„Ÿ constants/
„    „¤„Ÿ„Ÿ categories.js
„¥„Ÿ„Ÿ controllers/
„    „¥„Ÿ„Ÿ authController.js
„    „¥„Ÿ„Ÿ dashboardController.js
„    „¥„Ÿ„Ÿ goalController.js
„    „¤„Ÿ„Ÿ transactionController.js
„¥„Ÿ„Ÿ middleware/
„    „¤„Ÿ„Ÿ authMiddleware.js
„¥„Ÿ„Ÿ models/
„    „¥„Ÿ„Ÿ Goal.js
„    „¥„Ÿ„Ÿ Transaction.js
„    „¤„Ÿ„Ÿ User.js
„¤„Ÿ„Ÿ routes/
    „¥„Ÿ„Ÿ authRoutes.js
    „¥„Ÿ„Ÿ dashboardRoutes.js
    „¥„Ÿ„Ÿ goalRoutes.js
    „¤„Ÿ„Ÿ transactionRoutes.js
```

### `frontend/src/` (excluding `node_modules/`, `dist/`)

```
frontend/src/
„¥„Ÿ„Ÿ App.css
„¥„Ÿ„Ÿ App.jsx
„¥„Ÿ„Ÿ index.css
„¥„Ÿ„Ÿ main.jsx
„¥„Ÿ„Ÿ api/
„    „¤„Ÿ„Ÿ api.js
„¥„Ÿ„Ÿ assets/
„¥„Ÿ„Ÿ components/
„    „¥„Ÿ„Ÿ Navbar.css
„    „¥„Ÿ„Ÿ Navbar.jsx
„    „¥„Ÿ„Ÿ ProtectedRoute.jsx
„    „¤„Ÿ„Ÿ PublicRoute.jsx
„¥„Ÿ„Ÿ context/
„    „¤„Ÿ„Ÿ AuthContext.jsx
„¤„Ÿ„Ÿ pages/
    „¥„Ÿ„Ÿ Auth.css
    „¥„Ÿ„Ÿ Dashboard.css
    „¥„Ÿ„Ÿ Dashboard.jsx
    „¥„Ÿ„Ÿ Goals.css
    „¥„Ÿ„Ÿ Goals.jsx
    „¥„Ÿ„Ÿ Login.jsx
    „¥„Ÿ„Ÿ Register.jsx
    „¥„Ÿ„Ÿ Transactions.css
    „¤„Ÿ„Ÿ Transactions.jsx
```

---

## 2. Mongoose Models

### 2.1 `User` ? `backend/models/User.js`

| Field | Type | Required | Unique | Other constraints |
|-------|------|----------|--------|-------------------|
| `name` | `String` | Yes (`"Name is required"`) | ? | `trim: true` |
| `email` | `String` | Yes (`"Email is required"`) | Yes | `lowercase`, `trim`, regex `/^\S+@\S+\.\S+$/` |
| `password` | `String` | Yes (`"Password is required"`) | ? | `minlength: 6`, `select: false` (never returned in queries) |
| `createdAt` | `Date` | ? (auto) | ? | Added by `{ timestamps: true }` |
| `updatedAt` | `Date` | ? (auto) | ? | Added by `{ timestamps: true }` |

**Pre-save hook:** `bcrypt.hash(this.password, 10)` ? runs only when password is modified.
**Instance method:** `matchPassword(enteredPassword)` ? calls `bcrypt.compare(enteredPassword, this.password)`.
**Refs:** none.

---

### 2.2 `Transaction` ? `backend/models/Transaction.js`

| Field | Type | Required | Default | Enum / Constraints | Ref |
|-------|------|----------|---------|--------------------|-----|
| `user` | `ObjectId` | Yes | ? | ? | `"User"` |
| `type` | `String` | Yes | ? | `["income", "expense"]` | ? |
| `amount` | `Number` | Yes | ? | `min: 0.01` | ? |
| `category` | `String` | Yes | ? | `[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]` (see section 9) | ? |
| `description` | `String` | ? | `""` | `trim`, `maxlength: 200` | ? |
| `date` | `Date` | ? | `Date.now` | ? | ? |
| `createdAt` | `Date` | ? (auto) | ? | `{ timestamps: true }` | ? |
| `updatedAt` | `Date` | ? (auto) | ? | `{ timestamps: true }` | ? |

**Compound index:** `{ user: 1, date: -1 }` (for fast per-user newest-first lookups).

---

### 2.3 `Goal` ? `backend/models/Goal.js`

| Field | Type | Required | Default | Constraints | Ref |
|-------|------|----------|---------|-------------|-----|
| `user` | `ObjectId` | Yes | ? | `index: true` | `"User"` |
| `title` | `String` | Yes | ? | `trim`, `maxlength: 100` | ? |
| `targetAmount` | `Number` | Yes | ? | custom validator: `v > 0` | ? |
| `currentAmount` | `Number` | ? | `0` | `min: 0` | ? |
| `deadline` | `Date` | ? | ? | ? | ? |
| `createdAt` | `Date` | ? (auto) | ? | `{ timestamps: true }` | ? |
| `updatedAt` | `Date` | ? (auto) | ? | `{ timestamps: true }` | ? |

---

## 3. API Routes

Base URL prefix: `http://localhost:5000/api` (hardcoded in `frontend/src/api/api.js`).
Auth mechanism: Bearer token in `Authorization` header, verified by `protect` middleware (`backend/middleware/authMiddleware.js`).

### 3.1 Auth Routes ? mounted at `/api/auth` (`backend/routes/authRoutes.js`)

| Method | Full Path | Auth Required | Description | Request Body Fields | Response Shape |
|--------|-----------|:---:|-------------|---------------------|----------------|
| `POST` | `/api/auth/register` | No | Creates a new user, returns token | `name`, `email`, `password` | `{ _id, name, email, token }` |
| `POST` | `/api/auth/login` | No | Validates credentials, returns token | `email`, `password` | `{ _id, name, email, token }` |
| `GET` | `/api/auth/me` | **Yes** | Returns the logged-in user profile | ? | `{ _id, name, email }` |

---

### 3.2 Transaction Routes ? mounted at `/api/transactions` (`backend/routes/transactionRoutes.js`)

All routes require auth (`router.use(protect)`).

| Method | Full Path | Auth Required | Description | Request Body / Query Fields | Response Shape |
|--------|-----------|:---:|-------------|------------------------------|----------------|
| `GET` | `/api/transactions/categories` | **Yes** | Returns income and expense category lists | ? | `{ income: [...], expense: [...] }` |
| `GET` | `/api/transactions` | **Yes** | List all transactions for logged-in user, newest first. Optional filters: `?type=income|expense`, `?category=<string>` | query params: `type`, `category` | `[Transaction, ...]` array |
| `POST` | `/api/transactions` | **Yes** | Create a new transaction | `type`*, `amount`*, `category`*, `description` (opt), `date` (opt) | Created Transaction object (201) |
| `PUT` | `/api/transactions/:id` | **Yes** | Update any field(s) of a transaction belonging to user | `type`, `amount`, `category`, `description`, `date` (all optional) | Updated Transaction object |
| `DELETE` | `/api/transactions/:id` | **Yes** | Delete a transaction belonging to user | ? | `{ message: "Transaction deleted" }` |

* required for create.

---

### 3.3 Dashboard Routes ? mounted at `/api/dashboard` (`backend/routes/dashboardRoutes.js`)

| Method | Full Path | Auth Required | Description | Request Body | Response Shape |
|--------|-----------|:---:|-------------|--------------|----------------|
| `GET` | `/api/dashboard/summary` | **Yes** | Aggregated financial summary via MongoDB `$facet` pipeline | ? | `{ totalIncome, totalExpense, balance, savingsRate, expenseByCategory:[{category,total}], incomeByCategory:[{category,total}], monthlyTrend:[{month,income,expense}] (last 6 months), recentTransactions:[Transaction] (last 5) }` |

---

### 3.4 Goal Routes ? mounted at `/api/goals` (`backend/routes/goalRoutes.js`)

All routes require auth (`router.use(protect)`).

| Method | Full Path | Auth Required | Description | Request Body Fields | Response Shape |
|--------|-----------|:---:|-------------|---------------------|----------------|
| `POST` | `/api/goals` | **Yes** | Create a new goal | `title`*, `targetAmount`*, `currentAmount` (opt, default 0), `deadline` (opt) | Formatted Goal object (201) |
| `GET` | `/api/goals` | **Yes** | List all goals for logged-in user, newest first | ? | `[FormattedGoal, ...]` |
| `GET` | `/api/goals/:id` | **Yes** | Get a single goal by ID | ? | Formatted Goal object |
| `PUT` | `/api/goals/:id` | **Yes** | Update goal fields | `title`, `targetAmount`, `currentAmount`, `deadline` (all optional) | Formatted Goal object |
| `PATCH` | `/api/goals/:id/progress` | **Yes** | Add to or set `currentAmount`. Send `amount` to increment, or `currentAmount` to set directly | `amount` (positive number, adds to current) OR `currentAmount` (non-negative, sets directly) | Formatted Goal object |
| `DELETE` | `/api/goals/:id` | **Yes** | Delete a goal | ? | `{ message: "Goal deleted" }` |

**Formatted Goal** (computed by `formatGoal()` in `goalController.js`):

```
{
  _id, user, title, targetAmount, currentAmount, deadline, createdAt, updatedAt,
  progressPercent,     // Math.min(100, Math.round((currentAmount / targetAmount) * 100))
  remainingAmount,     // Math.max(0, targetAmount - currentAmount)
  isCompleted          // currentAmount >= targetAmount
}
```

---

## 4. Frontend Pages and Route Protection (`frontend/src/App.jsx`)

| Route Path | Component | Protection | Notes |
|------------|-----------|:----------:|-------|
| `/` | `Dashboard` | **Protected** (`ProtectedRoute`) | Redirects to `/login` if no user |
| `/transactions` | `Transactions` | **Protected** (`ProtectedRoute`) | Redirects to `/login` if no user |
| `/goals` | `Goals` | **Protected** (`ProtectedRoute`) | Redirects to `/login` if no user |
| `/login` | `Login` | **Public** (`PublicRoute`) | Redirects to `/` if already logged in |
| `/register` | `Register` | **Public** (`PublicRoute`) | Redirects to `/` if already logged in |

**`ProtectedRoute`** (`frontend/src/components/ProtectedRoute.jsx`): If `!user`, renders `<Navigate to="/login" replace />`.
**`PublicRoute`** (`frontend/src/components/PublicRoute.jsx`): If `user`, renders `<Navigate to="/" replace />`.
Both components render `<p className="page">Loading...</p>` while `loading` is `true`.

---

## 5. Libraries in `package.json`

### Backend ? `backend/package.json`

| Package | Version (spec) | Category |
|---------|---------------|----------|
| `bcryptjs` | `^3.0.3` | Password hashing |
| `cors` | `^2.8.6` | CORS middleware |
| `dotenv` | `^18.0.5` | Environment variables |
| `express` | `^5.2.1` | Web framework |
| `jsonwebtoken` | `^9.0.3` | JWT signing/verification |
| `mongoose` | `^9.10.3` | MongoDB ODM |
| `nodemon` *(dev)* | `^3.1.14` | Auto-restart during development |

### Frontend ? `frontend/package.json`

| Package | Version (spec) | Category |
|---------|---------------|----------|
| `axios` | `^1.20.0` | HTTP client |
| `react` | `^19.2.8` | UI library |
| `react-dom` | `^19.2.8` | React DOM renderer |
| `react-router-dom` | `^7.18.4` | Client-side routing |
| `recharts` | `^3.10.1` | Charts (bar, pie) |
| `@eslint/js` *(dev)* | `^10.0.1` | ESLint core |
| `@types/react` *(dev)* | `^19.2.18` | TypeScript types |
| `@types/react-dom` *(dev)* | `^19.2.7` | TypeScript types |
| `@vitejs/plugin-react` *(dev)* | `^6.1.1` | Vite React plugin |
| `eslint` *(dev)* | `^10.10.0` | Linter |
| `eslint-plugin-react-hooks` *(dev)* | `^7.1.1` | React hooks lint rules |
| `eslint-plugin-react-refresh` *(dev)* | `^0.5.6` | React Refresh lint rules |
| `globals` *(dev)* | `^17.12.0` | ESLint globals |
| `vite` *(dev)* | `^8.3.0` | Build tool / dev server |

---

## 6. Password Hashing, JWT Expiry, and Token Storage

### Password Hashing

- **Library:** `bcryptjs` (not `bcrypt` ? the pure-JS variant, no native bindings).
- **Salt rounds:** `10` (hardcoded in `backend/models/User.js`, line 32: `bcrypt.hash(this.password, 10)`).
- **Where:** `userSchema.pre("save", ...)` ? runs automatically before every `User.save()` if `password` was modified.
- **Comparison:** `bcrypt.compare(enteredPassword, this.password)` in `userSchema.methods.matchPassword`.

### JWT

- **Library:** `jsonwebtoken ^9.0.3`.
- **Payload:** `{ id: user._id }`.
- **Secret:** `process.env.JWT_SECRET` (from `.env`, value not shown).
- **Expiry:** `process.env.JWT_EXPIRES_IN || "7d"` ? defaults to **7 days** if the env var is not set.
  Source: `backend/controllers/authController.js`, line 7.
- **Verification:** `backend/middleware/authMiddleware.js`, line 16 ? `jwt.verify(token, process.env.JWT_SECRET)`.

### Token Storage (Frontend)

- **Where:** Browser `localStorage` under the key `"token"`.
- **Set:** `localStorage.setItem("token", res.data.token)` in both `login()` (line 40) and `register()` (line 34) in `frontend/src/context/AuthContext.jsx`.
- **Read on app start:** `localStorage.getItem("token")` in `AuthContext.jsx` (line 13); calls `GET /api/auth/me` to validate.
- **Read before each request:** `localStorage.getItem("token")` in Axios request interceptor (`frontend/src/api/api.js`, line 10).
- **Cleared:** `localStorage.removeItem("token")` in `logout()` (line 45 of `AuthContext.jsx`) and on `GET /api/auth/me` failure (line 23).
- **Sent to server:** As `Authorization: Bearer <token>` header.

---

## 7. Dashboard Savings-Rate and Balance Formulas (Exact Code)

Source: `backend/controllers/dashboardController.js`, lines 55?59.

```js
const totals = (data.totals && data.totals[0]) || { totalIncome: 0, totalExpense: 0 };
const totalIncome  = totals.totalIncome  || 0;
const totalExpense = totals.totalExpense || 0;
const balance      = totalIncome - totalExpense;
const savingsRate  = totalIncome === 0
  ? 0
  : Math.round(((balance / totalIncome) * 1000)) / 10;
```

**In plain English:**

- `balance = totalIncome - totalExpense`
- `savingsRate = (balance / totalIncome) * 100`, rounded to **one decimal place**, or `0` if `totalIncome === 0`.
  - Implementation detail: `Math.round(x * 1000) / 10` achieves one-decimal rounding without `toFixed`.

**MongoDB aggregation producing `totalIncome` and `totalExpense`** (dashboardController.js lines 17?22):

```js
$group: {
  _id: null,
  totalIncome:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
  totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
}
```

**`monthlyTrend`:** Always exactly the **last 6 calendar months** (including current month), with missing months filled with `{ income: 0, expense: 0 }`. Months grouped by `'%Y-%m'` format in `Asia/Kolkata` timezone (line 39).

**`recentTransactions`:** Last **5** transactions sorted by `{ date: -1, createdAt: -1 }` (lines 47?48).

---

## 8. Feature Checklist ? Exists in Code or Not

| Feature | Status | Evidence |
|---------|--------|---------|
| **Monthly budgets** | NOT FOUND | No model, route, controller, or UI component for a budget limit per month/category exists anywhere in the codebase. |
| **Budget health score** | NOT FOUND | No such calculation or field exists in any controller or frontend component. |
| **Spending alerts** | NOT FOUND | No threshold checking, notification, or alert logic exists in the code. |
| **Category management page** | NOT FOUND | Categories are a hardcoded static array in `backend/constants/categories.js`. There is no CRUD UI or API for categories. |
| **Bill reminders** | NOT FOUND | No reminder, scheduled job, recurring transaction, or notification system exists. |
| **Export reports** | NOT FOUND | No CSV/PDF export endpoint or download button exists anywhere. |
| **Savings goal contributions** | EXISTS | `PATCH /api/goals/:id/progress` in `backend/controllers/goalController.js` (lines 148?177) allows adding to `currentAmount` via `{ amount }` (increment) or setting it directly via `{ currentAmount }`. Goals page includes UI for this. The computed `progressPercent`, `remainingAmount`, and `isCompleted` fields are returned on every goal response. |

---

## 9. Default Expense / Income Categories

Source: `backend/constants/categories.js` (lines 1?13).

### Income Categories

```js
const INCOME_CATEGORIES = ["Salary", "Freelance", "Gift", "Other Income"];
```

1. Salary
2. Freelance
3. Gift
4. Other Income

### Expense Categories

```js
const EXPENSE_CATEGORIES = [
    "Food",
    "Rent",
    "Transport",
    "Bills",
    "Shopping",
    "Entertainment",
    "Health",
    "Education",
    "Other",
];
```

1. Food
2. Rent
3. Transport
4. Bills
5. Shopping
6. Entertainment
7. Health
8. Education
9. Other

These arrays are imported into `backend/models/Transaction.js` (line 2) as the `enum` for the `category` field, and into `backend/controllers/transactionController.js` (line 3) for validation messages. The frontend retrieves them at runtime via `GET /api/transactions/categories`.
