import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import type { ApiResponse, MeetingResponse } from '../../../types';
import toast from 'react-hot-toast';

const MeetingPage: React.FC = () => {
    const { meetingId } = useParams<{ meetingId: string }>();
    const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!meetingId) {
            navigate('/dashboard');
            return;
        }
        fetchMeeting();
        
        // Set up polling to refresh meeting data every 5 seconds
        const interval = setInterval(() => {
            if (meetingId) {
                fetchMeetingSilent();
            }
        }, 5000);
        
        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [meetingId]);

    const fetchMeeting = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<MeetingResponse>>(
                `/api/meetings/${meetingId}`
            );
            if (response.data.success && response.data.data) {
                setMeeting(response.data.data);
            } else {
                toast.error(response.data.message || 'Meeting not found');
                navigate('/dashboard');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to load meeting';
            toast.error(message);
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    // Silent fetch without loading state (for polling)
    const fetchMeetingSilent = async () => {
        if (!meetingId) return;
        try {
            const response = await api.get<ApiResponse<MeetingResponse>>(
                `/api/meetings/${meetingId}`
            );
            if (response.data.success && response.data.data) {
                setMeeting(response.data.data);
            }
        } catch (error) {
            // Silent fail for polling
        }
    };

    const handleJoinMeeting = async () => {
        if (!meetingId) return;
        setIsJoining(true);
        try {
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/join`);
            if (response.data.success) {
                toast.success(response.data.message);
                // Refresh meeting data immediately after joining
                await fetchMeeting();
            } else {
                toast.error(response.data.message || 'Failed to join meeting');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to join meeting';
            toast.error(message);
        } finally {
            setIsJoining(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/meeting/${meetingId}`;
        navigator.clipboard.writeText(link).then(() => {
            toast.success('Meeting link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const handleEndMeeting = async () => {
        if (!meetingId) return;
        try {
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/end`);
            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/dashboard');
            } else {
                toast.error(response.data.message || 'Failed to end meeting');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to end meeting';
            toast.error(message);
        }
    };

    const handleRefresh = () => {
        fetchMeeting();
        toast.success('Refreshed meeting data');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-600">Loading meeting...</div>
            </div>
        );
    }

    if (!meeting) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <button 
                onClick={() => navigate('/dashboard')}
                className="mb-6 text-blue-600 hover:text-blue-800"
            >
                ← Back to Dashboard
            </button>

            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Meeting</h2>
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                        🔄 Refresh
                    </button>
                </div>
                
                <div className="space-y-3">
                    <p><strong>Meeting ID:</strong> <span className="font-mono text-sm">{meeting.meetingId}</span></p>
                    <p><strong>Title:</strong> {meeting.title}</p>
                    <p><strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-sm ${
                            meeting.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                        }`}>
                            {meeting.status}
                        </span>
                    </p>
                    <p><strong>Participants:</strong> 
                        <span className="ml-2 font-bold text-blue-600">{meeting.participantCount}</span>
                    </p>
                    <p><strong>Created by:</strong> {meeting.createdByName}</p>
                    <p><strong>Created at:</strong> {new Date(meeting.createdAt).toLocaleString()}</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button 
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        📋 Copy Meeting Link
                    </button>
                    <button 
                        onClick={handleJoinMeeting} 
                        disabled={isJoining}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isJoining ? 'Joining...' : '👋 Join Meeting'}
                    </button>
                    {meeting.createdBy === parseInt(localStorage.getItem('userId') || '0') && (
                        <button 
                            onClick={handleEndMeeting}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            ⛔ End Meeting
                        </button>
                    )}
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">📤 Share this link:</h3>
                    <code className="block p-3 bg-white rounded border text-sm break-all">
                        {window.location.origin}/meeting/{meetingId}
                    </code>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800">⏳ Waiting for participants...</h3>
                    <p className="text-yellow-700 mt-1">
                        No video or audio yet. Share the link to invite others.
                    </p>
                    <p className="text-sm text-yellow-600 mt-2">
                        Current participants: <span className="font-bold">{meeting.participantCount}</span>
                    </p>
                    <p className="text-xs text-yellow-500 mt-1">
                        Auto-refreshes every 5 seconds
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;