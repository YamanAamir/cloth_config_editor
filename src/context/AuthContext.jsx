import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// All localStorage keys that belong to a user session
const USER_STORAGE_KEYS = [
    'user',
    'token',
    'studentCustomizations',
    'studentCustomizationsOrderId',
    'orderHoldDeadline',
];

const clearUserStorage = () => {
    USER_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // api/index.js ka 401 interceptor token/user localStorage se hata deta hai,
    // lekin uske paas React state tak access nahi — is event se yahan `user`
    // state ko bhi null kar dete hain, taake route guard sync rahe aur
    // full page reload (jo console clear kar deta hai, debug mushkil bana deta hai)
    // ki zaroorat na pade.
    useEffect(() => {
        const handleUnauthorized = () => setUser(null);
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const login = (userData, token) => {
        // Clear any previous user's data before setting new user
        // This ensures a freshly registered user doesn't see old account's data
        clearUserStorage();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
    };

    const logout = () => {
        setUser(null);
        // Remove ALL user-related data from localStorage on logout
        clearUserStorage();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
