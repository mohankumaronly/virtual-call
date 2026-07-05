import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
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
    const [isInCall, setIsInCall] = useState(false);

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!meetingId) {
            navigate('/dashboard');
            return;
        }
        fetchMeeting();
        fetchParticipants();
    }, [meetingId]);

    const fetchMeeting = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<MeetingResponse>>(`/api/meetings/${meetingId}`);
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
            const response = await api.get<ApiResponse<any[]>>(`/api/meetings/${meetingId}/participants`);
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
                setIsInCall(true);
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
                setIsInCall(false);
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

    // ✅ Jitsi Meet room URL - completely free, no account needed!
    const jitsiRoomUrl = `https://meet.jit.si/${meetingId}`;

    return (
        <div className="max-w-6xl mx-auto p-4">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-6 text-blue-600 hover:text-blue-800"
            >
                ← Back to Dashboard
            </button>

            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Meeting</h2>
                    <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isInCall ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span className="text-sm text-gray-500">
                            {isInCall ? 'In Call' : 'Waiting to join'}
                        </span>
                    </div>
                </div>

                {/* ✅ Jitsi Meet Video Container */}
                {isInCall ? (
                    <div className="w-full h-[500px] rounded-lg overflow-hidden">
                        <iframe
                            src={`${jitsiRoomUrl}?config.startWithAudioMuted=true&config.startWithVideoMuted=false`}
                            allow="camera; microphone; fullscreen; display-capture"
                            className="w-full h-full border-0"
                            title="Jitsi Meet"
                        />
                    </div>
                ) : (
                    <div className="w-full h-[500px] bg-gray-900 rounded-lg flex flex-col items-center justify-center text-white">
                        <span className="text-6xl">📹</span>
                        <p className="mt-4 text-lg">Click "Join Video Call" to start</p>
                        <p className="text-sm text-gray-400 mt-2">
                            {participants.length} participant{participants.length !== 1 ? 's' : ''} in meeting
                        </p>
                        <p className="text-xs text-gray-500 mt-4">
                            Powered by Jitsi Meet - Free & Open Source
                        </p>
                    </div>
                )}

                {/* Meeting Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                        <p><strong>Meeting ID:</strong> <span className="font-mono text-sm">{meeting.meetingId}</span></p>
                        <p><strong>Title:</strong> {meeting.title}</p>
                        <p><strong>Status:</strong>
                            <span className={`ml-2 px-2 py-1 rounded text-sm ${meeting.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {meeting.status}
                            </span>
                        </p>
                        <p><strong>Created by:</strong> {meeting.createdByName}</p>
                    </div>

                    {/* Participants */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Participants ({participants.length})</h3>
                        <ul className="space-y-1">
                            {participants.map((p) => (
                                <li key={p.userId} className="flex items-center space-x-2 text-sm">
                                    <span className={`w-2 h-2 rounded-full ${p.userId === user?.id ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                    <span>{p.name}</span>
                                    {p.userId === user?.id && <span className="text-xs text-gray-500">(You)</span>}
                                    {p.userId === meeting.createdBy && <span className="text-xs text-green-600">👑</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                    {!isInCall ? (
                        <button
                            onClick={handleJoinMeeting}
                            disabled={isJoining}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {isJoining ? 'Joining...' : '📹 Join Video Call'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsInCall(false)}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            📹 Leave Call
                        </button>
                    )}
                    <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        📋 Copy Link
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

                {/* Share Link */}
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 text-sm">📤 Share this link</h4>
                    <code className="block mt-2 p-2 bg-white rounded border text-sm break-all">
                        {window.location.origin}/meeting/{meetingId}
                    </code>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;