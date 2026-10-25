import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">Budget Tracker</div>

            <div className="navbar-links">
                <NavLink to="/" end className="navbar-link">
                    Dashboard
                </NavLink>
                <NavLink to="/transactions" className="navbar-link">
                    Transactions
                </NavLink>
                <NavLink to="/goals" className="navbar-link">
                    Savings goals
                </NavLink>
            </div>

            <div className="navbar-user">
                <span className="navbar-username">{user?.name}</span>
                <button className="navbar-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;