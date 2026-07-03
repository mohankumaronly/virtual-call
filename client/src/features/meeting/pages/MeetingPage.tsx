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

    const handleJoinMeeting = async () => {
        if (!meetingId) return;
        setIsJoining(true);
        try {
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/join`);
            if (response.data.success) {
                toast.success(response.data.message);
                // Refresh meeting data to update participant count
                fetchMeeting();
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
            <div>
                <div>Loading meeting...</div>
            </div>
        );
    }

    if (!meeting) {
        return null;
    }

    return (
        <div>
            <button onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </button>

            <div>
                <h2>Meeting</h2>
                <p>Meeting ID: {meeting.meetingId}</p>
                <p>Title: {meeting.title}</p>
                <p>Status: {meeting.status}</p>
                <p>Participants: {meeting.participantCount}</p>
                <p>Created by: {meeting.createdByName}</p>
                <p>Created at: {new Date(meeting.createdAt).toLocaleString()}</p>

                <div>
                    <button onClick={handleCopyLink}>
                        Copy Meeting Link
                    </button>
                    <button onClick={handleJoinMeeting} disabled={isJoining}>
                        {isJoining ? 'Joining...' : 'Join Meeting'}
                    </button>
                    {meeting.createdBy === parseInt(localStorage.getItem('userId') || '0') && (
                        <button onClick={handleEndMeeting}>
                            End Meeting
                        </button>
                    )}
                </div>

                <div>
                    <h3>Share this link:</h3>
                    <code>
                        {window.location.origin}/meeting/{meetingId}
                    </code>
                </div>

                <div>
                    <h3>Waiting for participants...</h3>
                    <p>No video or audio yet. Share the link to invite others.</p>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;