import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) {
        return _jsx("div", { className: "p-8 text-center text-slate-500", children: "Loading..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(Outlet, {});
};
export const AdminRoute = () => {
    const { user, role, loading } = useAuth();
    if (loading) {
        return _jsx("div", { className: "p-8 text-center text-slate-500", children: "Loading..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (role !== 'admin') {
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    return _jsx(Outlet, {});
};
