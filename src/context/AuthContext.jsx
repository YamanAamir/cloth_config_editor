import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// All localStorage keys that belong to a user session
const USER_STORAGE_KEYS = [
    'user',
    'token',
    'studentCustomizations',
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
