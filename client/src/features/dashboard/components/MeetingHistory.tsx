import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import type { ApiResponse, MeetingResponse } from '../../../types';
import toast from 'react-hot-toast';

const MeetingHistory: React.FC = () => {
    const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMeetingHistory();
    }, []);

    const fetchMeetingHistory = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<MeetingResponse[]>>('/api/meetings/history');
            if (response.data.success && response.data.data) {
                setMeetings(response.data.data);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to fetch meeting history';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeetingClick = (meetingId: string) => {
        navigate(`/meeting/${meetingId}`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading meetings...</div>
            </div>
        );
    }

    if (meetings.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">No meetings yet.</p>
                <p className="text-sm text-gray-400 mt-1">Create your first meeting to get started!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {meetings.map((meeting) => (
                <div
                    key={meeting.id}
                    onClick={() => handleMeetingClick(meeting.meetingId)}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">📹</span>
                            <div>
                                <p className="font-medium text-gray-800">{meeting.title}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(meeting.createdAt).toLocaleDateString()} at{' '}
                                    {new Date(meeting.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                            meeting.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {meeting.status}
                        </span>
                        <span className="text-sm text-gray-600">
                            👤 {meeting.participantCount}
                        </span>
                        <span className="text-gray-400">→</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MeetingHistory;