import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import SearchUsers from '../components/SearchUsers';
import CreateMeetingButton from '../components/CreateMeetingButton';
import MeetingHistory from '../components/MeetingHistory';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [, setSelectedUserId] = useState<number | null>(null);

    return (
        <div className="max-w-7xl mx-auto p-4">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Welcome back, {user?.name}! 👋
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Search for users to connect with or create a new meeting.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            ● Online
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Meeting Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                        <div className="flex items-center mb-4">
                            <span className="text-2xl mr-2">📹</span>
                            <h3 className="text-lg font-semibold text-gray-800">Create a Meeting</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">
                            Start a new meeting instantly and invite others.
                        </p>
                        <CreateMeetingButton />
                    </div>
                </div>

                {/* Search Users Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center mb-4">
                            <span className="text-2xl mr-2">🔍</span>
                            <h3 className="text-lg font-semibold text-gray-800">Search Users</h3>
                        </div>
                        <SearchUsers onSelectUser={setSelectedUserId} />
                    </div>
                </div>
            </div>

            {/* Meeting History Section */}
            <div className="mt-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center mb-4">
                        <span className="text-2xl mr-2">📋</span>
                        <h3 className="text-lg font-semibold text-gray-800">Your Recent Meetings</h3>
                    </div>
                    <MeetingHistory />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;