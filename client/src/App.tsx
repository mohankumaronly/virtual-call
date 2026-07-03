import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import AppRoutes from './router';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <WebSocketProvider>
                <Router>
                    <div>
                        <AppRoutes />
                    </div>
                </Router>
            </WebSocketProvider>
        </AuthProvider>
    );
};

export default App;