import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import SearchUsers from '../components/SearchUsers';
import CreateMeetingButton from '../components/CreateMeetingButton';
import MeetingHistory from '../components/MeetingHistory';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    return (
        <div>
            <div>
                <h2>Welcome, {user?.name}!</h2>
                <p>Search for other users to connect with or create a meeting.</p>

                {/* Create Meeting Section */}
                <div>
                    <h3>Create a Meeting</h3>
                    <CreateMeetingButton />
                </div>

                {/* Search Users Section */}
                <div>
                    <h3>Search Users</h3>
                    <SearchUsers onSelectUser={setSelectedUserId} />
                </div>

                {/* Meeting History Section */}
                <div>
                    <h3>Your Recent Meetings</h3>
                    <MeetingHistory />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;