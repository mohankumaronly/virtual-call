import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

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

        // Use native WebSocket directly without SockJS
        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws',
            debug: (str) => {
                console.log('WebSocket debug:', str);
            },
            onConnect: () => {
                setIsConnected(true);
                toast.success('Connected to real-time server');
                console.log('WebSocket connected');
            },
            onDisconnect: () => {
                setIsConnected(false);
                toast.error('Disconnected from real-time server');
                console.log('WebSocket disconnected');
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
                setIsConnected(false);
            },
            // Reconnect settings
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
        if (!clientRef.current || !isConnected) return;
        
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
        if (!clientRef.current || !isConnected) return;
        
        const message = {
            type: 'SIGNAL',
            meetingId: meetingId,
            userId: user?.id,
            username: user?.username,
            payload: payload,
            timestamp: Date.now()
        };
        
        clientRef.current.publish({
            destination: `/app/meeting/${meetingId}/signal`,
            body: JSON.stringify(message)
        });
    };

    const subscribeToMeeting = (meetingId: string, callback: (message: any) => void) => {
        if (!clientRef.current || !isConnected) return;
        
        // Unsubscribe from existing subscription for this meeting
        if (subscriptionsRef.current.has(meetingId)) {
            subscriptionsRef.current.get(meetingId).unsubscribe();
        }
        
        const subscription = clientRef.current.subscribe(
            `/topic/meeting/${meetingId}`,
            (message) => {
                try {
                    const data = JSON.parse(message.body);
                    callback(data);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            }
        );
        
        subscriptionsRef.current.set(meetingId, subscription);
    };

    const unsubscribeFromMeeting = (meetingId: string) => {
        if (subscriptionsRef.current.has(meetingId)) {
            subscriptionsRef.current.get(meetingId).unsubscribe();
            subscriptionsRef.current.delete(meetingId);
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