import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On app start: if a token is saved, check it with the backend
    useEffect(() => {
        const checkSavedToken = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get("/auth/me");
                setUser(res.data);
            } catch (error) {
                // Token invalid or expired: clean up
                localStorage.removeItem("token");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkSavedToken();
    }, []);

    const register = async (name, email, password) => {
        const res = await api.post("/auth/register", { name, email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data);
    };

    const login = async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// A small shortcut so components can write: const { user } = useAuth();
export function useAuth() {
    return useContext(AuthContext);
}