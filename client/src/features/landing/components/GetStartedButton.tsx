import React from 'react';
import { useNavigate } from 'react-router-dom';

const GetStartedButton: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/login');
    };

    return (
        <button onClick={handleClick}>
            Get Started
        </button>
    );
};

export default GetStartedButton;