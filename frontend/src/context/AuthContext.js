import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
const AuthContext = createContext({
    user: null,
    session: null,
    role: null,
    emailVerifiedAt: null,
    deactivatedAt: null,
    loading: true,
    logout: async () => { },
});
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null);
    const [emailVerifiedAt, setEmailVerifiedAt] = useState(null);
    const [deactivatedAt, setDeactivatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Get initial session
        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                void fetchProfile(session.user.id);
            }
            else {
                setLoading(false);
            }
        })
            .catch((err) => {
            console.error('getSession failed:', err);
            setLoading(false);
        });
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            else {
                setRole(null);
                setEmailVerifiedAt(null);
                setDeactivatedAt(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role, email_verified_at, deactivated_at')
                .eq('id', userId)
                .single();
            if (!error && data) {
                setRole(data.role);
                setEmailVerifiedAt(data.email_verified_at);
                setDeactivatedAt(data.deactivated_at);
            }
        }
        catch (e) {
            console.error('Error fetching profile:', e);
        }
        finally {
            setLoading(false);
        }
    };
    const logout = async () => {
        await supabase.auth.signOut();
    };
    return (_jsx(AuthContext.Provider, { value: { user, session, role, emailVerifiedAt, deactivatedAt, loading, logout }, children: children }));
};
export const useAuth = () => useContext(AuthContext);
