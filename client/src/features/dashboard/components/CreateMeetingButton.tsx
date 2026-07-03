import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import type { ApiResponse, MeetingResponse } from '../../../types';
import toast from 'react-hot-toast';

const CreateMeetingButton: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreateMeeting = async () => {
        setIsLoading(true);
        try {
            const response = await api.post<ApiResponse<MeetingResponse>>('/api/meetings');
            if (response.data.success && response.data.data) {
                const meetingId = response.data.data.meetingId;
                toast.success(response.data.message);
                navigate(`/meeting/${meetingId}`);
            } else {
                toast.error(response.data.message || 'Failed to create meeting');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to create meeting';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleCreateMeeting}
            disabled={isLoading}
        >
            {isLoading ? 'Creating...' : 'Create Meeting'}
        </button>
    );
};

export default CreateMeetingButton;