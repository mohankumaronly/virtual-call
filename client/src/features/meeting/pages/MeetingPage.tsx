import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { ApiResponse, MeetingResponse } from '../../../types';
import toast from 'react-hot-toast';

interface Participant {
    userId: number;
    username: string;
    name: string;
    joinedAt: string;
}

const MeetingPage: React.FC = () => {
    const { meetingId } = useParams<{ meetingId: string }>();
    const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const { user } = useAuth();
    const { isConnected, joinMeeting, leaveMeeting, subscribeToMeeting, unsubscribeFromMeeting } = useWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (!meetingId) {
            navigate('/dashboard');
            return;
        }
        fetchMeeting();
        fetchParticipants();
        
        // Subscribe to WebSocket updates
        if (isConnected) {
            subscribeToMeeting(meetingId, handleWebSocketMessage);
        }
        
        return () => {
            if (meetingId) {
                unsubscribeFromMeeting(meetingId);
                leaveMeeting(meetingId);
            }
        };
    }, [meetingId, isConnected]);

    const handleWebSocketMessage = (message: any) => {
        console.log('WebSocket message:', message);
        
        if (message.type === 'USER_JOINED') {
            toast.success(`${message.name || message.username} joined the meeting`);
            // Refresh participants
            fetchParticipants();
        } else if (message.type === 'USER_LEFT') {
            toast(`${message.username} left the meeting`, {
                icon: '👋',
            });
            // Refresh participants
            fetchParticipants();
        }
    };

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

    const fetchParticipants = async () => {
        if (!meetingId) return;
        try {
            const response = await api.get<ApiResponse<any[]>>(
                `/api/meetings/${meetingId}/participants`
            );
            if (response.data.success && response.data.data) {
                const participantList = response.data.data.map((p: any) => ({
                    userId: p.userId,
                    username: p.userUsername,
                    name: p.userName,
                    joinedAt: p.joinedAt
                }));
                setParticipants(participantList);
            }
        } catch (error) {
            console.error('Failed to fetch participants:', error);
        }
    };

    const handleJoinMeeting = async () => {
        if (!meetingId) return;
        setIsJoining(true);
        try {
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/join`);
            if (response.data.success) {
                toast.success(response.data.message);
                await fetchMeeting();
                await fetchParticipants();
                // Notify via WebSocket
                if (isConnected && user) {
                    joinMeeting(meetingId);
                }
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
                    <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm text-gray-500">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
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
                        <span className="ml-2 font-bold text-blue-600">{participants.length}</span>
                    </p>
                    <p><strong>Created by:</strong> {meeting.createdByName}</p>
                    <p><strong>Created at:</strong> {new Date(meeting.createdAt).toLocaleString()}</p>
                </div>

                {/* Participants List */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-3">Participants</h3>
                    {participants.length === 0 ? (
                        <p className="text-gray-500 text-sm">No participants yet</p>
                    ) : (
                        <ul className="space-y-2">
                            {participants.map((p) => (
                                <li key={p.userId} className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-gray-500 text-sm">(@{p.username})</span>
                                    {p.userId === user?.id && (
                                        <span className="text-xs text-blue-600 font-medium">(You)</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
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
                    {meeting.createdBy === user?.id && (
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
                        Connected: <span className="font-bold">{isConnected ? '✅' : '❌'}</span>
                    </p>
                    <p className="text-sm text-yellow-600">
                        Participants: <span className="font-bold">{participants.length}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;