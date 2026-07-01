import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from '../features/landing/pages/LandingPage';
import Login from '../features/auth/pages/Login';
import VerifyOtp from '../features/auth/pages/VerifyOtp';
import Dashboard from '../features/dashboard/pages/Dashboard';
import UserProfile from '../features/dashboard/components/UserProfile';
import ProtectedRoute from '../components/common/ProtectedRoute';

const AppRoutes: React.FC = () => {
    return (
        <>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile/:id"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                }}
            />
        </>
    );
};

export default AppRoutes;