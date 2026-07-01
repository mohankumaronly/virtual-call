import React from 'react';
import GetStartedButton from '../components/GetStartedButton';

const LandingPage: React.FC = () => {
    return (
        <div>
            <h1>Welcome to Virtual</h1>
            <p>Connect with people through video calls</p>
            <GetStartedButton />
        </div>
    );
};

export default LandingPage;