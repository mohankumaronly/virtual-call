import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';
import type { User, AuthContextType, ApiResponse } from '../types';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const sendOtp = async (email: string) => {
        try {
            const response = await api.post<ApiResponse>('/api/auth/send-otp', { email });
            if (response.data.success) {
                toast.success(response.data.message);
            } else {
                toast.error(response.data.message);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to send OTP';
            toast.error(message);
            throw error;
        }
    };

    const login = async (email: string, otp: string) => {
        try {
            const response = await api.post<ApiResponse<any>>('/api/auth/verify-otp', { email, otp });
            if (response.data.success && response.data.data) {
                const { user, token } = response.data.data;
                
                if (token) {
                    localStorage.setItem('jwt', token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
                
                setUser(user);
                toast.success(response.data.message);
            } else {
                toast.error(response.data.message);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const response = await api.post<ApiResponse>('/api/auth/logout');
            if (response.data.success) {
                setUser(null);
                localStorage.removeItem('jwt');
                delete api.defaults.headers.common['Authorization'];
                toast.success(response.data.message);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Logout failed';
            toast.error(message);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('jwt');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } else {
                setUser(null);
                setIsLoading(false);
                return;
            }
            
            const response = await api.get<ApiResponse<User>>('/api/auth/me');
            if (response.data.success && response.data.data) {
                setUser(response.data.data);
                console.log('User authenticated:', response.data.data);
            } else {
                setUser(null);
                localStorage.removeItem('jwt');
                delete api.defaults.headers.common['Authorization'];
            }
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            setUser(null);
            localStorage.removeItem('jwt');
            delete api.defaults.headers.common['Authorization'];
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        logout,
        sendOtp,
        fetchCurrentUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext };