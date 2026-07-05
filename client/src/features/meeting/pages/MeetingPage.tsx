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
    const [showCamera, setShowCamera] = useState(false);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [isCallActive, setIsCallActive] = useState(false);
    const [isInitiator, setIsInitiator] = useState(false);
    const [isWebSocketStable, setIsWebSocketStable] = useState(false);

    const { user } = useAuth();
    const { isConnected, joinMeeting, leaveMeeting, subscribeToMeeting, unsubscribeFromMeeting, sendSignal } = useWebSocket();
    const navigate = useNavigate();

    // Refs
    const webRTCServiceRef = useRef<WebRTCService | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const hasJoinedRef = useRef<boolean>(false);
    const localStreamRef = useRef<MediaStream | null>(null);
    const isCreatorRef = useRef<boolean>(false);
    const callInitiatedRef = useRef<boolean>(false);
    const isProcessingOfferRef = useRef<boolean>(false);
    const answerSentRef = useRef<boolean>(false);
    const subscriptionStableRef = useRef<boolean>(false);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const autoStartAttemptedRef = useRef<boolean>(false);

    useEffect(() => {
        console.log('🔵 [LIFECYCLE] MeetingPage mounted, meetingId:', meetingId);
        if (!meetingId) {
            navigate('/dashboard');
            return;
        }
        
        fetchMeeting();
        fetchParticipants();

        return () => {
            console.log('🔴 [LIFECYCLE] MeetingPage unmounting, cleaning up');
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
            if (meetingId && isWebSocketStable) {
                unsubscribeFromMeeting(meetingId);
                setIsWebSocketStable(false);
                if (hasJoinedRef.current) {
                    leaveMeeting(meetingId);
                }
            }
            if (localStreamRef.current) {
                console.log('🔴 [STREAM] Stopping local stream tracks');
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (webRTCServiceRef.current) {
                console.log('🔴 [WEBRTC] Closing WebRTC connection');
                webRTCServiceRef.current.close();
            }
        };
    }, [meetingId]);

    // ✅ Effect to handle WebSocket connection
    useEffect(() => {
        if (isConnected && meetingId && !isWebSocketStable) {
            console.log('🔵 [WEBSOCKET] Subscribing to meeting:', meetingId);
            subscribeToMeeting(meetingId, handleWebSocketMessage);
            
            // Check for stability
            let attempts = 0;
            const maxAttempts = 20;
            
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
            }
            
            retryIntervalRef.current = setInterval(() => {
                attempts++;
                console.log(`⏳ [WEBSOCKET] Checking stability... attempt ${attempts}/${maxAttempts}`);
                
                // Check if we're receiving messages
                if (isWebSocketStable) {
                    console.log('✅ [WEBSOCKET] Subscription stable confirmed');
                    if (retryIntervalRef.current) {
                        clearInterval(retryIntervalRef.current);
                        retryIntervalRef.current = null;
                    }
                    subscriptionStableRef.current = true;
                    
                    // If auto-start was waiting, trigger it now
                    if (autoStartAttemptedRef.current && !callInitiatedRef.current) {
                        console.log('📞 [WEBSOCKET] Auto-start triggered after stability');
                        autoStartAttemptedRef.current = false;
                        callInitiatedRef.current = true;
                        setTimeout(() => {
                            startCallAsInitiator();
                        }, 1000);
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ [WEBSOCKET] Max attempts reached, forcing stable state');
                    setIsWebSocketStable(true);
                    subscriptionStableRef.current = true;
                    if (retryIntervalRef.current) {
                        clearInterval(retryIntervalRef.current);
                        retryIntervalRef.current = null;
                    }
                }
            }, 500);
        }
    }, [isConnected, meetingId]);

    // ✅ Effect to handle remoteStream changes
    useEffect(() => {
        console.log('🟢 [REMOTE_STREAM] remoteStream changed:', remoteStream ? 'Has stream' : 'No stream');
        if (remoteStream && remoteVideoRef.current) {
            console.log('🎥 [REMOTE_STREAM] Setting remote stream to video element');
            console.log('🎥 [REMOTE_STREAM] Stream tracks:', remoteStream.getTracks().length);
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.onloadedmetadata = () => {
                console.log('🎥 [REMOTE_STREAM] Remote video metadata loaded');
                remoteVideoRef.current?.play().catch(error => {
                    console.error('❌ [REMOTE_STREAM] Error playing remote video:', error);
                });
            };
            remoteVideoRef.current.play().catch(error => {
                console.error('❌ [REMOTE_STREAM] Error playing remote video:', error);
            });
        }
    }, [remoteStream]);

    const handleWebSocketMessage = (message: any) => {
        console.log('📩 [WEBSOCKET] Message received:', {
            type: message.type,
            from: message.username,
            userId: message.userId,
            hasPayload: !!message.payload,
            payloadType: message.payload?.type
        });

        // ✅ Mark as stable when we receive any message
        if (!isWebSocketStable) {
            console.log('✅ [WEBSOCKET] Received message, marking as stable');
            setIsWebSocketStable(true);
            subscriptionStableRef.current = true;
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
        }

        if (message.type === 'USER_JOINED') {
            console.log('👤 [WEBSOCKET] User joined:', message.username, 'userId:', message.userId);
            toast.success(`${message.name || message.username} joined the meeting`);
            fetchParticipants();

            const isJoiningUserCreator = message.userId === user?.id;
            console.log('🔍 [AUTO_START] Checking auto-start conditions:', {
                isCreator: isCreatorRef.current,
                hasJoined: hasJoinedRef.current,
                isCallActive,
                isJoiningUserCreator,
                callInitiated: callInitiatedRef.current,
                isWebSocketStable
            });

            // ✅ Only auto-start if WebSocket is stable
            if (isCreatorRef.current && hasJoinedRef.current && !isCallActive && !isJoiningUserCreator && !callInitiatedRef.current && isWebSocketStable) {
                console.log('📞 [AUTO_START] Creator starting call (WebSocket stable)');
                callInitiatedRef.current = true;
                autoStartAttemptedRef.current = true;
                setTimeout(() => {
                    if (subscriptionStableRef.current) {
                        startCallAsInitiator();
                    } else {
                        console.warn('⚠️ [AUTO_START] Subscription not stable, retrying in 2s');
                        setTimeout(() => {
                            startCallAsInitiator();
                        }, 2000);
                    }
                }, 2000);
            } else if (isCreatorRef.current && hasJoinedRef.current && !isCallActive && !isJoiningUserCreator && !callInitiatedRef.current && !isWebSocketStable) {
                console.log('⏳ [AUTO_START] WebSocket not stable, scheduling retry...');
                autoStartAttemptedRef.current = true;
                // Schedule multiple retries
                let retryCount = 0;
                const maxRetries = 10;
                
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current);
                }
                
                const scheduleRetry = () => {
                    if (retryCount >= maxRetries) {
                        console.warn('⚠️ [AUTO_START] Max retries reached, giving up');
                        autoStartAttemptedRef.current = false;
                        return;
                    }
                    
                    retryCount++;
                    console.log(`🔄 [AUTO_START] Retry ${retryCount}/${maxRetries} in ${retryCount * 1000}ms`);
                    
                    retryTimeoutRef.current = setTimeout(() => {
                        if (isWebSocketStable && !callInitiatedRef.current) {
                            console.log('📞 [AUTO_START] Retry starting call (WebSocket now stable)');
                            autoStartAttemptedRef.current = false;
                            callInitiatedRef.current = true;
                            startCallAsInitiator();
                        } else if (!isWebSocketStable && !callInitiatedRef.current) {
                            scheduleRetry();
                        } else {
                            console.log('⏳ [AUTO_START] Call already in progress or condition not met');
                            autoStartAttemptedRef.current = false;
                        }
                    }, retryCount * 1000);
                };
                
                scheduleRetry();
            }
        } else if (message.type === 'USER_LEFT') {
            console.log('👤 [WEBSOCKET] User left:', message.username);
            toast(`${message.username} left the meeting`, { icon: '👋' });
            fetchParticipants();
            setIsCallActive(false);
            setConnectionState('disconnected');
            setRemoteStream(null);
            callInitiatedRef.current = false;
            autoStartAttemptedRef.current = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
            if (webRTCServiceRef.current) {
                webRTCServiceRef.current.close();
                webRTCServiceRef.current = null;
            }
        } else if (message.type === 'OFFER') {
            console.log('📩 [WEBSOCKET] Received OFFER directly');
            handleOffer(message.payload);
        } else if (message.type === 'ANSWER') {
            console.log('📩 [WEBSOCKET] Received ANSWER directly');
            handleAnswer(message.payload);
        } else if (message.type === 'ICE_CANDIDATE') {
            console.log('📩 [WEBSOCKET] Received ICE_CANDIDATE directly');
            handleIceCandidate(message.payload);
        } else if (message.type === 'SIGNAL') {
            const payload = message.payload;
            console.log('📩 [WEBSOCKET] Received SIGNAL wrapper, payload type:', payload?.type);
            if (payload) {
                if (payload.type === 'OFFER') {
                    console.log('📩 [WEBSOCKET] Extracted OFFER from SIGNAL');
                    handleOffer(payload.payload || payload);
                } else if (payload.type === 'ANSWER') {
                    console.log('📩 [WEBSOCKET] Extracted ANSWER from SIGNAL');
                    handleAnswer(payload.payload || payload);
                } else if (payload.type === 'ICE_CANDIDATE') {
                    console.log('📩 [WEBSOCKET] Extracted ICE_CANDIDATE from SIGNAL');
                    handleIceCandidate(payload.payload || payload);
                } else {
                    console.log('📩 [WEBSOCKET] Unknown payload type:', payload.type);
                }
            }
        }
    };

    // ✅ Handle incoming OFFER
    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
        console.log('📞 [OFFER] handleOffer called');
        console.log('📞 [OFFER] Offer type:', offer.type);
        console.log('📞 [OFFER] isProcessingOffer:', isProcessingOfferRef.current);

        if (isProcessingOfferRef.current) {
            console.log('⏳ [OFFER] Already processing an offer, ignoring');
            return;
        }

        console.log('📩 [OFFER] Processing offer');
        isProcessingOfferRef.current = true;
        answerSentRef.current = false;

        try {
            if (webRTCServiceRef.current) {
                console.log('🔴 [OFFER] Closing existing WebRTC connection');
                webRTCServiceRef.current.close();
                webRTCServiceRef.current = null;
            }

            console.log('🎥 [OFFER] Creating new WebRTCService as non-initiator');
            webRTCServiceRef.current = new WebRTCService();
            setupWebRTCListeners();

            if (localStreamRef.current) {
                console.log('📷 [OFFER] Adding local stream to WebRTC service');
                webRTCServiceRef.current.setLocalStream(localStreamRef.current);
            } else {
                console.warn('⚠️ [OFFER] No local stream available');
            }

            console.log('📡 [OFFER] Setting remote description...');
            await webRTCServiceRef.current.setRemoteDescription(offer);
            console.log('✅ [OFFER] Remote description set successfully');

            console.log('📞 [OFFER] Creating answer...');
            const answer = await webRTCServiceRef.current.createAnswer();
            console.log('✅ [OFFER] Answer created successfully');
            console.log('📞 [OFFER] Answer type:', answer.type);

            console.log('📤 [OFFER] Sending answer via WebSocket...');
            sendSignal(meetingId!, {
                type: 'ANSWER',
                payload: answer
            });
            answerSentRef.current = true;
            console.log('✅ [OFFER] Answer sent successfully!');

            toast.success('Connected to peer!');
        } catch (error) {
            console.error('❌ [OFFER] Error handling offer:', error);
            toast.error('Failed to connect: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            isProcessingOfferRef.current = false;
            console.log('🔓 [OFFER] Offer processing complete');
        }
    };

    // ✅ Handle incoming ANSWER
    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
        console.log('📞 [ANSWER] handleAnswer called');
        console.log('📞 [ANSWER] Answer type:', answer.type);
        console.log('📞 [ANSWER] WebRTC service exists:', !!webRTCServiceRef.current);

        if (!webRTCServiceRef.current) {
            console.warn('⚠️ [ANSWER] No WebRTC service for answer');
            return;
        }

        try {
            console.log('📡 [ANSWER] Setting remote answer...');
            await webRTCServiceRef.current.setRemoteDescription(answer);
            console.log('✅ [ANSWER] Remote answer set successfully');
            toast.success('Call connected!');
        } catch (error) {
            console.error('❌ [ANSWER] Error handling answer:', error);
            toast.error('Failed to set answer');
        }
    };

    // ✅ Handle incoming ICE CANDIDATE
    const handleIceCandidate = async (candidate: RTCIceCandidate) => {
        console.log('🧊 [ICE] handleIceCandidate called');
        console.log('🧊 [ICE] Candidate exists:', !!candidate);
        console.log('🧊 [ICE] WebRTC service exists:', !!webRTCServiceRef.current);

        if (!webRTCServiceRef.current) {
            console.warn('⚠️ [ICE] No WebRTC service for ICE candidate');
            return;
        }

        try {
            console.log('🧊 [ICE] Adding ICE candidate...');
            await webRTCServiceRef.current.addIceCandidate(candidate);
            console.log('✅ [ICE] ICE candidate added successfully');
        } catch (error) {
            console.error('❌ [ICE] Error adding ICE candidate:', error);
        }
    };

    // ✅ Start call as initiator (creator)
    const startCallAsInitiator = async () => {
        console.log('📞 [INITIATOR] startCallAsInitiator called');
        console.log('📞 [INITIATOR] Local stream exists:', !!localStreamRef.current);
        console.log('📞 [INITIATOR] Subscription stable:', subscriptionStableRef.current);

        if (!localStreamRef.current) {
            console.error('❌ [INITIATOR] No local stream');
            toast.error('Camera not ready');
            return;
        }

        if (!subscriptionStableRef.current) {
            console.warn('⚠️ [INITIATOR] Subscription not stable, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!subscriptionStableRef.current) {
                console.error('❌ [INITIATOR] Subscription still not stable');
                toast.error('Connection not stable, please try again');
                return;
            }
        }

        console.log('📞 [INITIATOR] Starting call as initiator');
        setIsInitiator(true);

        if (webRTCServiceRef.current) {
            console.log('🔴 [INITIATOR] Closing existing WebRTC connection');
            webRTCServiceRef.current.close();
            webRTCServiceRef.current = null;
        }

        console.log('🎥 [INITIATOR] Creating new WebRTCService as initiator');
        webRTCServiceRef.current = new WebRTCService();
        setupWebRTCListeners();

        console.log('📷 [INITIATOR] Adding local stream');
        webRTCServiceRef.current.setLocalStream(localStreamRef.current);

        try {
            console.log('📞 [INITIATOR] Creating offer...');
            const offer = await webRTCServiceRef.current.createOffer();
            console.log('✅ [INITIATOR] Offer created successfully');
            console.log('📞 [INITIATOR] Offer type:', offer.type);

            console.log('📤 [INITIATOR] Sending offer via WebSocket...');
            sendSignal(meetingId!, {
                type: 'OFFER',
                payload: offer
            });
            console.log('✅ [INITIATOR] Offer sent successfully!');

            toast('Calling participant...', { icon: '📞' });
        } catch (error) {
            console.error('❌ [INITIATOR] Error creating offer:', error);
            toast.error('Failed to start call');
            callInitiatedRef.current = false;
        }
    };

    // ✅ Setup WebRTC listeners
    const setupWebRTCListeners = () => {
        console.log('🎥 [LISTENERS] Setting up WebRTC listeners');
        if (!webRTCServiceRef.current) {
            console.warn('⚠️ [LISTENERS] No WebRTC service to setup listeners');
            return;
        }

        webRTCServiceRef.current.onRemoteStream((stream) => {
            console.log('🎥 [LISTENERS] Remote stream received!');
            console.log('🎥 [LISTENERS] Remote stream tracks:', stream.getTracks().length);
            setRemoteStream(stream);
            setIsCallActive(true);
            setConnectionState('connected');
        });

        webRTCServiceRef.current.onConnectionStateChange((state) => {
            console.log('🔗 [LISTENERS] Connection state changed:', state);
            setConnectionState(state);
            if (state === 'connected') {
                console.log('✅ [LISTENERS] Call connected!');
                setIsCallActive(true);
                toast.success('Call established!');
            } else if (state === 'disconnected' || state === 'failed') {
                console.log('❌ [LISTENERS] Call disconnected or failed');
                setIsCallActive(false);
                setRemoteStream(null);
                callInitiatedRef.current = false;
                toast.error('Call disconnected');
            }
        });

        webRTCServiceRef.current.onIceCandidate((candidate) => {
            if (candidate) {
                console.log('🧊 [LISTENERS] Sending ICE candidate');
                sendSignal(meetingId!, {
                    type: 'ICE_CANDIDATE',
                    payload: candidate
                });
            } else {
                console.log('🧊 [LISTENERS] ICE gathering complete');
            }
        });
    };

    const fetchMeeting = async () => {
        console.log('📡 [FETCH] Fetching meeting:', meetingId);
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<MeetingResponse>>(`/api/meetings/${meetingId}`);
            console.log('📡 [FETCH] Meeting response:', response.data);
            if (response.data.success && response.data.data) {
                setMeeting(response.data.data);
                isCreatorRef.current = response.data.data.createdBy === user?.id;
                console.log('👑 [FETCH] isCreatorRef:', isCreatorRef.current);
                console.log('👑 [FETCH] Meeting created by:', response.data.data.createdBy);
                console.log('👑 [FETCH] Current user:', user?.id);
            } else {
                toast.error(response.data.message || 'Meeting not found');
                navigate('/dashboard');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to load meeting';
            console.error('❌ [FETCH] Error fetching meeting:', error);
            toast.error(message);
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchParticipants = async () => {
        console.log('📡 [FETCH] Fetching participants for meeting:', meetingId);
        if (!meetingId) return;
        try {
            const response = await api.get<ApiResponse<any[]>>(`/api/meetings/${meetingId}/participants`);
            console.log('📡 [FETCH] Participants response:', response.data);
            if (response.data.success && response.data.data) {
                const participantList = response.data.data.map((p: any) => ({
                    userId: p.userId,
                    username: p.userUsername,
                    name: p.userName,
                    joinedAt: p.joinedAt
                }));
                setParticipants(participantList);
                console.log('👥 [FETCH] Participants:', participantList.length);
            }
        } catch (error) {
            console.error('❌ [FETCH] Error fetching participants:', error);
        }
    };

    const handleJoinMeeting = async () => {
        console.log('📞 [JOIN] handleJoinMeeting called');
        if (!meetingId) return;
        setIsJoining(true);
        try {
            console.log('📞 [JOIN] Joining meeting via API:', meetingId);
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/join`);
            console.log('📞 [JOIN] Join response:', response.data);
            if (response.data.success) {
                toast.success(response.data.message);
                hasJoinedRef.current = true;
                console.log('✅ [JOIN] Joined meeting successfully');
                await fetchMeeting();
                await fetchParticipants();

                if (isConnected && user) {
                    console.log('📤 [JOIN] Notifying via WebSocket');
                    joinMeeting(meetingId);
                }
                console.log('📷 [JOIN] Setting showCamera to true');
                setShowCamera(true);
            } else {
                toast.error(response.data.message || 'Failed to join meeting');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to join meeting';
            console.error('❌ [JOIN] Error joining meeting:', error);
            toast.error(message);
        } finally {
            setIsJoining(false);
        }
    };

    const handleStreamReady = (stream: MediaStream) => {
        console.log('📷 [CAMERA] Camera ready!');
        console.log('📷 [CAMERA] Stream tracks:', stream.getTracks().length);
        localStreamRef.current = stream;
        toast.success('Camera is ready!');
    };

    const handleStreamError = (error: Error) => {
        console.error('❌ [CAMERA] Camera error:', error);
        toast.error('Failed to access camera. Please check permissions.');
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/meeting/${meetingId}`;
        console.log('📋 [LINK] Copying link:', link);
        navigator.clipboard.writeText(link).then(() => {
            toast.success('Meeting link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const handleEndMeeting = async () => {
        console.log('⛔ [END] handleEndMeeting called');
        if (!meetingId) return;
        try {
            const response = await api.post<ApiResponse>(`/api/meetings/${meetingId}/end`);
            console.log('⛔ [END] End meeting response:', response.data);
            if (response.data.success) {
                toast.success(response.data.message);
                if (webRTCServiceRef.current) {
                    console.log('🔴 [END] Closing WebRTC connection');
                    webRTCServiceRef.current.close();
                    webRTCServiceRef.current = null;
                }
                setIsCallActive(false);
                setRemoteStream(null);
                navigate('/dashboard');
            } else {
                toast.error(response.data.message || 'Failed to end meeting');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to end meeting';
            console.error('❌ [END] Error ending meeting:', error);
            toast.error(message);
        }
    };

    const handleStartCall = async () => {
        console.log('🟢 [START] handleStartCall called');
        console.log('🟢 [START] Participants:', participants.length);
        console.log('🟢 [START] isCreatorRef:', isCreatorRef.current);
        console.log('🟢 [START] isCallActive:', isCallActive);
        console.log('🟢 [START] callInitiatedRef:', callInitiatedRef.current);
        console.log('🟢 [START] Subscription stable:', subscriptionStableRef.current);

        if (participants.length < 2) {
            toast.error('Need at least 2 participants to start a call');
            return;
        }

        if (!isCreatorRef.current) {
            toast('Only the meeting creator can start the call', { icon: 'ℹ️' });
            return;
        }

        if (isCallActive) {
            toast('Call already active', { icon: 'ℹ️' });
            return;
        }

        if (callInitiatedRef.current) {
            toast('Call already in progress', { icon: 'ℹ️' });
            return;
        }

        if (!subscriptionStableRef.current) {
            toast('Waiting for connection to stabilize...', { icon: '⏳' });
            setTimeout(() => {
                if (subscriptionStableRef.current) {
                    callInitiatedRef.current = true;
                    startCallAsInitiator();
                } else {
                    toast.error('Connection not stable, please try again');
                }
            }, 2000);
            return;
        }

        callInitiatedRef.current = true;
        await startCallAsInitiator();
    };

    const handleRetryCall = () => {
        console.log('🔄 [RETRY] Retrying call');
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
        }
        callInitiatedRef.current = false;
        autoStartAttemptedRef.current = false;
        setIsCallActive(false);
        setRemoteStream(null);
        setConnectionState('disconnected');
        if (webRTCServiceRef.current) {
            webRTCServiceRef.current.close();
            webRTCServiceRef.current = null;
        }
        setTimeout(() => {
            if (subscriptionStableRef.current) {
                callInitiatedRef.current = true;
                startCallAsInitiator();
            } else {
                toast.error('Connection not stable, please wait');
            }
        }, 1000);
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
                                            {!hasJoinedRef.current && (
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
                                                {isCallActive ? '📞 Connected' : '⏳ Waiting for connection...'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                State: {connectionState}
                                            </p>
                                            {isInitiator && (
                                                <p className="text-xs text-green-400 mt-1">🔵 Caller</p>
                                            )}
                                            {!remoteStream && (
                                                <p className="text-xs text-yellow-400 mt-1">⏳ Remote stream not yet received</p>
                                            )}
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
                            {hasJoinedRef.current && !isCallActive && isCreatorRef.current && !callInitiatedRef.current && (
                                <button
                                    onClick={handleStartCall}
                                    disabled={participants.length < 2}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    📞 Start Call
                                </button>
                            )}
                            {isCreatorRef.current && callInitiatedRef.current && !isCallActive && (
                                <button
                                    onClick={handleRetryCall}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                >
                                    🔄 Retry Call
                                </button>
                            )}
                            {isCallActive && (
                                <span className="px-3 py-2 bg-green-100 text-green-700 rounded">
                                    🟢 Call Active
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
                        <h4 className="font-semibold text-yellow-800 text-sm">⏳ Debug Status</h4>
                        <div className="mt-2 text-xs text-yellow-600 space-y-1">
                            <p>WebSocket: <span className="font-bold">{isConnected ? '✅' : '❌'}</span></p>
                            <p>Subscription Stable: <span className="font-bold">{subscriptionStableRef.current ? '✅' : '❌'}</span></p>
                            <p>Participants: <span className="font-bold">{participants.length}</span></p>
                            <p>Call: <span className="font-bold">{isCallActive ? '📞 Active' : '⏸️ Inactive'}</span></p>
                            <p>Connection: <span className="font-bold">{connectionState}</span></p>
                            <p>Role: <span className="font-bold">{isCreatorRef.current ? '👑 Creator' : '👤 Participant'}</span></p>
                            <p>Initiator: <span className="font-bold">{isInitiator ? '🔵 Yes' : '🔴 No'}</span></p>
                            <p>Remote Stream: <span className="font-bold">{remoteStream ? '✅' : '❌'}</span></p>
                            <p>Answer Sent: <span className="font-bold">{answerSentRef.current ? '✅' : '❌'}</span></p>
                            <p>Auto-start Attempted: <span className="font-bold">{autoStartAttemptedRef.current ? '✅' : '❌'}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;