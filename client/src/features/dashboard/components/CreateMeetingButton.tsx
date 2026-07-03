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
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {isLoading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                </span>
            ) : (
                '➕ Create Meeting'
            )}
        </button>
    );
};

export default CreateMeetingButton;