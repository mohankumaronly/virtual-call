import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import SearchUsers from '../components/SearchUsers';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    return (
        <div>
            <div>
                <h2>Welcome, {user?.name}!</h2>
                <p>Search for other users to connect with.</p>

                <SearchUsers onSelectUser={setSelectedUserId} />
            </div>
        </div>
    );
};

export default Dashboard;