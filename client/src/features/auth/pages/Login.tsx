import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { sendOtp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setIsLoading(true);
        try {
            await sendOtp(email);
            navigate('/verify-otp', { state: { email } });
        } catch (error) {
            // Error already handled in context
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2>Welcome to Virtual</h2>
            <p>Enter your email to receive an OTP</p>
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;