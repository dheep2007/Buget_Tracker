import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <p className="page">Loading...</p>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default PublicRoute;