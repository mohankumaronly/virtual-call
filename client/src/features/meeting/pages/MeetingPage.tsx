import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { ApiResponse, MeetingResponse } from '../../../types';
import toast from 'react-hot-toast';
import CameraPreview from '../components/CameraPreview';
import { WebRTCService } from '../../../services/webrtc.service';

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
    const [hasJoined, setHasJoined] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [peerConnectionState, setPeerConnectionState] = useState<string>('disconnected');
    const [isCallActive, setIsCallActive] = useState(false);
    const [isCallInProgress, setIsCallInProgress] = useState(false);

    const { user } = useAuth();
    const { isConnected, joinMeeting, leaveMeeting, subscribeToMeeting, unsubscribeFromMeeting, sendSignal } = useWebSocket();
    const navigate = useNavigate();

    const webRTCServiceRef = useRef<WebRTCService | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const isProcessingOfferRef = useRef<boolean>(false);
    const pendingIceCandidatesRef = useRef<any[]>([]);
    const isCallInitiatedRef = useRef<boolean>(false);
    const isCreatorRef = useRef<boolean>(false);

    useEffect(() => {
        if (!meetingId) {
            navigate('/dashboard');
            return;
        }
        fetchMeeting();
        fetchParticipants();

        if (isConnected) {
            subscribeToMeeting(meetingId, handleWebSocketMessage);
        }

        return () => {
            if (meetingId) {
                unsubscribeFromMeeting(meetingId);
                if (hasJoined) {
                    leaveMeeting(meetingId);
                }
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (webRTCServiceRef.current) {
                webRTCServiceRef.current.close();
            }
        };
    }, [meetingId, isConnected]);

    const handleWebSocketMessage = (message: any) => {
        console.log('📩 WebSocket message received:', message.type, 'from:', message.username);

        if (message.type === 'USER_JOINED') {
            toast.success(`${message.name || message.username} joined the meeting`);
            fetchParticipants();
            
            // ✅ ONLY the creator initiates the call - check isCreatorRef
            if (isCreatorRef.current && hasJoined && !isCallInProgress && !isCallInitiatedRef.current) {
                console.log('📞 Creator initiating call with new participant');
                isCallInitiatedRef.current = true;
                setTimeout(() => {
                    initiateCallWithParticipant(message.userId);
                }, 1500);
            } else {
                console.log('⏳ Not initiating call:', {
                    isCreator: isCreatorRef.current,
                    hasJoined,
                    isCallInProgress,
                    isCallInitiated: isCallInitiatedRef.current
                });
            }
        } else if (message.type === 'USER_LEFT') {
            toast(`${message.username} left the meeting`, { icon: '👋' });
            fetchParticipants();
            setIsCallInProgress(false);
            isCallInitiatedRef.current = false;
        } else if (message.type === 'OFFER') {
            console.log('📩 Received OFFER from:', message.username);
            handleOffer(message);
        } else if (message.type === 'ANSWER') {
            console.log('📩 Received ANSWER from:', message.username);
            handleAnswer(message);
        } else if (message.type === 'ICE_CANDIDATE') {
            console.log('📩 Received ICE_CANDIDATE from:', message.username);
            handleIceCandidate(message);
        } else if (message.type === 'SIGNAL') {
            const payload = message.payload;
            console.log('📩 Received SIGNAL, payload type:', payload?.type);

            if (payload && payload.type) {
                if (payload.type === 'OFFER') {
                    handleOffer({ ...message, payload: payload.payload || payload });
                } else if (payload.type === 'ANSWER') {
                    handleAnswer({ ...message, payload: payload.payload || payload });
                } else if (payload.type === 'ICE_CANDIDATE') {
                    handleIceCandidate({ ...message, payload: payload.payload || payload });
                }
            }
        }
    };

    const handleOffer = async (message: any) => {
        if (isProcessingOfferRef.current) {
            console.log('Already processing an offer, ignoring...');
            return;
        }

        console.log('Received offer from:', message.username);
        isProcessingOfferRef.current = true;

        try {
            // ✅ Close existing peer connection before creating a new one
            if (webRTCServiceRef.current) {
                webRTCServiceRef.current.close();
                webRTCServiceRef.current = null;
            }

            webRTCServiceRef.current = new WebRTCService();
            setupWebRTCListeners();

            if (localStream) {
                webRTCServiceRef.current.setLocalStream(localStream);
            }

            console.log('Setting remote description...');
            await webRTCServiceRef.current.setRemoteDescription(message.payload);
            console.log('Remote description set successfully');

            const answer = await webRTCServiceRef.current.createAnswer();
            console.log('Answer created, sending...');

            sendSignal(meetingId!, {
                type: 'ANSWER',
                payload: answer,
                targetUserId: message.userId
            });

            if (pendingIceCandidatesRef.current.length > 0) {
                console.log('Processing pending ICE candidates:', pendingIceCandidatesRef.current.length);
                for (const candidate of pendingIceCandidatesRef.current) {
                    try {
                        await webRTCServiceRef.current.addIceCandidate(candidate);
                        console.log('✅ Pending ICE candidate added');
                    } catch (e) {
                        console.error('Error adding pending ICE candidate:', e);
                    }
                }
                pendingIceCandidatesRef.current = [];
            }

            toast.success('Connected to peer!');
        } catch (error) {
            console.error('Error handling offer:', error);
            toast.error('Failed to connect to peer');
        } finally {
            isProcessingOfferRef.current = false;
        }
    };

    const handleAnswer = async (message: any) => {
        console.log('Received answer from:', message.username);
        if (!webRTCServiceRef.current) {
            console.warn('No WebRTC service for answer');
            return;
        }

        try {
            // ✅ Check if we're in the right state to set remote description
            const pc = webRTCServiceRef.current.getPeerConnection();
            if (pc && pc.signalingState === 'stable') {
                console.log('❌ Cannot set remote answer in stable state - ignoring');
                return;
            }
            
            await webRTCServiceRef.current.setRemoteDescription(message.payload);
            console.log('Remote description set for answer');
            toast.success('Call connected!');

            if (pendingIceCandidatesRef.current.length > 0) {
                console.log('Processing pending ICE candidates:', pendingIceCandidatesRef.current.length);
                for (const candidate of pendingIceCandidatesRef.current) {
                    try {
                        await webRTCServiceRef.current.addIceCandidate(candidate);
                        console.log('✅ Pending ICE candidate added');
                    } catch (e) {
                        console.error('Error adding pending ICE candidate:', e);
                    }
                }
                pendingIceCandidatesRef.current = [];
            }
        } catch (error) {
            console.error('Error handling answer:', error);
            toast.error('Failed to connect call');
        }
    };

    const handleIceCandidate = async (message: any) => {
        console.log('Received ICE candidate from:', message.username);
        if (!webRTCServiceRef.current) {
            console.warn('No WebRTC service for ICE candidate');
            return;
        }

        try {
            const pc = webRTCServiceRef.current.getPeerConnection();
            if (pc && pc.remoteDescription) {
                await webRTCServiceRef.current.addIceCandidate(message.payload);
                console.log('✅ ICE candidate added successfully');
            } else {
                console.log('⏳ Remote description not yet set, queuing ICE candidate');
                pendingIceCandidatesRef.current.push(message.payload);
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    };

    const setupWebRTCListeners = () => {
        if (!webRTCServiceRef.current) return;

        webRTCServiceRef.current.onRemoteStream((stream) => {
            console.log('Remote stream received!');
            setRemoteStream(stream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(error => {
                    console.error('Error playing remote video:', error);
                });
            }
        });

        webRTCServiceRef.current.onConnectionStateChange((state) => {
            setPeerConnectionState(state);
            console.log('Connection state:', state);
            if (state === 'connected') {
                setIsCallActive(true);
                setIsCallInProgress(true);
                toast.success('Call established!');
            } else if (state === 'disconnected' || state === 'failed') {
                setIsCallActive(false);
                setIsCallInProgress(false);
                isCallInitiatedRef.current = false;
                toast.error('Call disconnected');
            }
        });

        webRTCServiceRef.current.onIceCandidate((candidate) => {
            console.log('🧊 Sending ICE candidate');
            sendSignal(meetingId!, {
                type: 'ICE_CANDIDATE',
                payload: candidate,
            });
        });
    };

    const initiateCallWithParticipant = async (targetUserId: number) => {
        // ✅ Prevent multiple calls
        if (isCallInProgress || isCallInitiatedRef.current) {
            console.log('Call already in progress');
            return;
        }

        // ✅ Only creator can initiate
        if (!isCreatorRef.current) {
            console.log('❌ Only creator can initiate call - aborting');
            return;
        }

        console.log('📞 Initiating call with participant:', targetUserId);
        isCallInitiatedRef.current = true;
        setIsCallInProgress(true);

        if (!webRTCServiceRef.current) {
            webRTCServiceRef.current = new WebRTCService();
            setupWebRTCListeners();
        }

        try {
            if (localStream) {
                webRTCServiceRef.current.setLocalStream(localStream);
            }

            const offer = await webRTCServiceRef.current.createOffer();
            console.log('📤 Sending OFFER to:', targetUserId);
            
            sendSignal(meetingId!, {
                type: 'OFFER',
                payload: offer,
                targetUserId: targetUserId
            });

            toast('Calling participant...', { icon: '📞' });
        } catch (error) {
            console.error('Error initiating call:', error);
            toast.error('Failed to initiate call');
            setIsCallInProgress(false);
            isCallInitiatedRef.current = false;
        }
    };

    const fetchMeeting = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<MeetingResponse>>(`/api/meetings/${meetingId}`);
            if (response.data.success && response.data.data) {
                setMeeting(response.data.data);
                // ✅ Set creator flag
                isCreatorRef.current = response.data.data.createdBy === user?.id;
                console.log('👤 Meeting fetched - isCreatorRef:', isCreatorRef.current);
                console.log('👤 Meeting created by:', response.data.data.createdBy);
                console.log('👤 Current user:', user?.id);
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
                setHasJoined(true);
                await fetchMeeting();
                await fetchParticipants();

                if (isConnected && user) {
                    joinMeeting(meetingId);
                }
                setShowCamera(true);
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

    const handleStreamReady = (stream: MediaStream) => {
        console.log('📷 handleStreamReady called');
        setLocalStream(stream);
        toast.success('Camera is ready!');

        if (!webRTCServiceRef.current) {
            webRTCServiceRef.current = new WebRTCService();
            setupWebRTCListeners();
            webRTCServiceRef.current.setLocalStream(stream);
        }
    };

    const handleStreamError = (error: Error) => {
        console.error('Camera error:', error);
        toast.error('Failed to access camera. Please check permissions.');
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

    const handleStartCall = async () => {
        console.log('🔵 Start Call button clicked');
        console.log('👤 isCreatorRef.current:', isCreatorRef.current);
        console.log('📊 participants.length:', participants.length);
        
        if (participants.length < 2) {
            toast.error('Need at least 2 participants to start a call');
            return;
        }

        if (!isCreatorRef.current) {
            toast('Only the meeting creator can start the call', { icon: 'ℹ️' });
            console.log('❌ User is not the creator - aborting');
            return;
        }

        if (isCallInProgress || isCallInitiatedRef.current) {
            toast('Call already in progress', { icon: 'ℹ️' });
            return;
        }

        const otherParticipant = participants.find(p => p.userId !== user?.id);
        if (otherParticipant) {
            console.log('📞 Starting call with:', otherParticipant.name);
            await initiateCallWithParticipant(otherParticipant.userId);
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
        <div className="max-w-6xl mx-auto p-4">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-6 text-blue-600 hover:text-blue-800"
            >
                ← Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Meeting</h2>
                            <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="text-sm text-gray-500">
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                {showCamera ? (
                                    <CameraPreview
                                        onStreamReady={handleStreamReady}
                                        onError={handleStreamError}
                                    />
                                ) : (
                                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <span className="text-4xl">📹</span>
                                            <p className="text-gray-500 mt-2">Camera off</p>
                                            {!hasJoined && (
                                                <button
                                                    onClick={handleJoinMeeting}
                                                    disabled={isJoining}
                                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isJoining ? 'Joining...' : 'Join to start camera'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                                    {remoteStream ? (
                                        <video
                                            ref={remoteVideoRef}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            playsInline
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <span className="text-4xl">🖥️</span>
                                            <p className="text-white text-sm mt-2">Remote video</p>
                                            <p className="text-gray-400 text-xs">
                                                {isCallActive ? 'Connected' : 'Waiting for connection...'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                State: {peerConnectionState}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
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
                            <p><strong>Created at:</strong> {new Date(meeting.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                📋 Copy Link
                            </button>
                            {/* ✅ Only show Start Call for creator */}
                            {hasJoined && !isCallInProgress && !isCallInitiatedRef.current && isCreatorRef.current && (
                                <button
                                    onClick={handleStartCall}
                                    disabled={participants.length < 2}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    📞 Start Call
                                </button>
                            )}
                            {isCallInProgress && (
                                <span className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded">
                                    ⏳ Connecting...
                                </span>
                            )}
                            {isCreatorRef.current && (
                                <button
                                    onClick={handleEndMeeting}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    ⛔ End Meeting
                                </button>
                            )}
                            {isCallActive && (
                                <span className="px-3 py-2 bg-green-100 text-green-700 rounded">
                                    🟢 Call Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="font-semibold text-gray-700 mb-4">Participants</h3>
                        {participants.length === 0 ? (
                            <p className="text-gray-500 text-sm">No participants yet</p>
                        ) : (
                            <ul className="space-y-3">
                                {participants.map((p) => (
                                    <li key={p.userId} className="flex items-center space-x-3">
                                        <div className="relative">
                                            <span className={`w-2 h-2 rounded-full absolute -top-1 -right-1 ${p.userId === user?.id ? 'bg-green-500' : 'bg-blue-500'
                                                }`}></span>
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{p.name}</p>
                                            <p className="text-xs text-gray-500">@{p.username}</p>
                                        </div>
                                        {p.userId === user?.id && (
                                            <span className="ml-auto text-xs text-blue-600 font-medium">(You)</span>
                                        )}
                                        {p.userId === meeting.createdBy && (
                                            <span className="text-xs text-green-600 font-medium">👑 Creator</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="mt-4 bg-white rounded-lg shadow-lg p-6">
                        <h3 className="font-semibold text-gray-700 mb-2">📤 Share Link</h3>
                        <code className="block p-2 bg-gray-50 rounded border text-xs break-all">
                            {window.location.origin}/meeting/{meetingId}
                        </code>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 text-sm">⏳ Status</h4>
                        <div className="mt-2 text-xs text-yellow-600 space-y-1">
                            <p>WebSocket: <span className="font-bold">{isConnected ? '✅' : '❌'}</span></p>
                            <p>Participants: <span className="font-bold">{participants.length}</span></p>
                            <p>Call: <span className="font-bold">{isCallActive ? '📞 Active' : '⏸️ Inactive'}</span></p>
                            <p>Connection: <span className="font-bold">{peerConnectionState}</span></p>
                            <p>Role: <span className="font-bold">{isCreatorRef.current ? '👑 Creator' : '👤 Participant'}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;