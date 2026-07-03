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
        return <div>Loading meetings...</div>;
    }

    if (meetings.length === 0) {
        return <p>No meetings yet. Create your first meeting!</p>;
    }

    return (
        <div>
            <h3>Recent Meetings</h3>
            <div>
                {meetings.map((meeting) => (
                    <div
                        key={meeting.id}
                        onClick={() => handleMeetingClick(meeting.meetingId)}
                    >
                        <div>
                            <p>{meeting.title}</p>
                            <p>Status: {meeting.status}</p>
                            <p>Participants: {meeting.participantCount}</p>
                            <p>Created: {new Date(meeting.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MeetingHistory;