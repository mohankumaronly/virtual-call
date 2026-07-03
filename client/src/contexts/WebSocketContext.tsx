import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// ============================================
// ✅ Use environment variable for WebSocket URL
// ============================================
const getWebSocketUrl = () => {
    // Use VITE_WS_URL if set
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    // Fallback: use VITE_API_URL and replace http with ws
    if (import.meta.env.VITE_API_URL) {
        const apiUrl = import.meta.env.VITE_API_URL;
        // Replace http:// with ws:// and https:// with wss://
        return apiUrl.replace(/^http/, 'ws') + '/ws';
    }
    // Default: localhost
    return 'ws://localhost:8080/ws';
};

const WS_URL = getWebSocketUrl();

interface WebSocketContextType {
    isConnected: boolean;
    joinMeeting: (meetingId: string) => void;
    leaveMeeting: (meetingId: string) => void;
    sendSignal: (meetingId: string, payload: any) => void;
    subscribeToMeeting: (meetingId: string, callback: (message: any) => void) => void;
    unsubscribeFromMeeting: (meetingId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

interface WebSocketProviderProps {
    children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();
    const clientRef = useRef<Client | null>(null);
    const subscriptionsRef = useRef<Map<string, any>>(new Map());

    useEffect(() => {
        if (!user) return;

        console.log('🔌 Connecting to WebSocket:', WS_URL);

        // Use native WebSocket
        const client = new Client({
            brokerURL: WS_URL,
            debug: (str) => {
                console.log('WebSocket debug:', str);
            },
            onConnect: () => {
                setIsConnected(true);
                toast.success('Connected to real-time server');
                console.log('✅ WebSocket connected to:', WS_URL);
            },
            onDisconnect: () => {
                setIsConnected(false);
                toast.error('Disconnected from real-time server');
                console.log('❌ WebSocket disconnected');
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
                setIsConnected(false);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                setIsConnected(false);
            }
        };
    }, [user]);

    const joinMeeting = (meetingId: string) => {
        if (!clientRef.current || !isConnected) {
            console.warn('Cannot join meeting: WebSocket not connected');
            return;
        }

        const message = {
            type: 'USER_JOINED',
            meetingId: meetingId,
            userId: user?.id,
            username: user?.username,
            name: user?.name,
            timestamp: Date.now()
        };

        clientRef.current.publish({
            destination: `/app/meeting/${meetingId}/join`,
            body: JSON.stringify(message)
        });
        console.log('📤 Sent JOIN message:', message);
    };

    const leaveMeeting = (meetingId: string) => {
        if (!clientRef.current || !isConnected) return;

        const message = {
            type: 'USER_LEFT',
            meetingId: meetingId,
            userId: user?.id,
            username: user?.username,
            timestamp: Date.now()
        };

        clientRef.current.publish({
            destination: `/app/meeting/${meetingId}/leave`,
            body: JSON.stringify(message)
        });
    };

    const sendSignal = (meetingId: string, payload: any) => {
        if (!clientRef.current || !isConnected) {
            console.warn('Cannot send signal: WebSocket not connected');
            return;
        }

        // ✅ The payload already contains the type (OFFER, ANSWER, ICE_CANDIDATE)
        const message = {
            type: 'SIGNAL',  // This is the wrapper type
            meetingId: meetingId,
            userId: user?.id,
            username: user?.username,
            name: user?.name,
            payload: payload,  // This contains { type: 'OFFER', payload: ... }
            timestamp: Date.now()
        };

        console.log('📤 Sending SIGNAL:', payload.type);

        clientRef.current.publish({
            destination: `/app/meeting/${meetingId}/signal`,
            body: JSON.stringify(message)
        });
    };

    const subscribeToMeeting = (meetingId: string, callback: (message: any) => void) => {
        if (!clientRef.current || !isConnected) {
            console.warn('Cannot subscribe: WebSocket not connected');
            return;
        }

        if (subscriptionsRef.current.has(meetingId)) {
            subscriptionsRef.current.get(meetingId).unsubscribe();
        }

        const destination = `/topic/meeting/${meetingId}`;
        console.log('📡 Subscribing to:', destination);

        const subscription = clientRef.current.subscribe(
            destination,
            (message) => {
                try {
                    const data = JSON.parse(message.body);
                    console.log('📩 Received message on', destination, ':', data.type, 'from', data.username);
                    callback(data);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            }
        );

        subscriptionsRef.current.set(meetingId, subscription);
        console.log('📡 Subscribed to meeting:', meetingId);
    };

    const unsubscribeFromMeeting = (meetingId: string) => {
        if (subscriptionsRef.current.has(meetingId)) {
            subscriptionsRef.current.get(meetingId).unsubscribe();
            subscriptionsRef.current.delete(meetingId);
            console.log('📡 Unsubscribed from meeting:', meetingId);
        }
    };

    const value: WebSocketContextType = {
        isConnected,
        joinMeeting,
        leaveMeeting,
        sendSignal,
        subscribeToMeeting,
        unsubscribeFromMeeting,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};