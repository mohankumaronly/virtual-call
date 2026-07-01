import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './router';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <div>
                    <AppRoutes />
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;