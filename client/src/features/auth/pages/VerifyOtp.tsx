import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const VerifyOtp: React.FC = () => {
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }

        setIsLoading(true);
        try {
            await login(email, otp);
            navigate('/dashboard');
        } catch (error) {
            // Error already handled in context
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 6) {
            setOtp(value);
        }
    };

    return (
        <div>
            <h2>Verify OTP</h2>
            <p>Enter the 6-digit OTP sent to {email}</p>
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="otp">OTP</label>
                    <input
                        id="otp"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        required
                        value={otp}
                        onChange={handleOtpChange}
                        placeholder="• • • • • •"
                        maxLength={6}
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isLoading || otp.length !== 6}
                    >
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                    >
                        Back to login
                    </button>
                </div>
            </form>
        </div>
    );
};

export default VerifyOtp;