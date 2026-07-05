import Peer from 'simple-peer';

export class SimplePeerService {
    private peer: Peer.Instance | null = null;
    private remoteStream: MediaStream | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onConnectionStateChangeCallback: ((state: string) => void) | null = null;
    private onSignalCallback: ((signal: any) => void) | null = null;

    constructor(isInitiator: boolean) {
        console.log('🎥 Creating SimplePeerService, isInitiator:', isInitiator);
        
        const config = {
            initiator: isInitiator,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    {
                        urls: [
                            'turn:openrelay.metered.ca:80',
                            'turn:openrelay.metered.ca:443',
                            'turn:openrelay.metered.ca:3478',
                        ],
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        };

        this.peer = new Peer(config);

        // Handle signals (offer/answer/ICE candidates)
        this.peer.on('signal', (data) => {
            console.log('📤 Signal generated:', data.type);
            if (this.onSignalCallback) {
                this.onSignalCallback(data);
            }
        });

        // Handle remote stream
        this.peer.on('stream', (stream) => {
            console.log('🎥 Remote stream received!');
            this.remoteStream = stream;
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(stream);
            }
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        });

        // Handle connection state
        this.peer.on('connect', () => {
            console.log('✅ Peer connected!');
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        });

        this.peer.on('close', () => {
            console.log('🔌 Peer disconnected');
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('disconnected');
            }
        });

        this.peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('error');
            }
        });

        this.peer.on('iceStateChange', (state) => {
            console.log('🧊 ICE state:', state);
        });
    }

    public setLocalStream(stream: MediaStream): void {
        console.log('📷 Setting local stream');
        if (this.peer) {
            this.peer.addStream(stream);
        }
    }

    public onSignal(callback: (signal: any) => void): void {
        this.onSignalCallback = callback;
    }

    public onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    public onConnectionStateChange(callback: (state: string) => void): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public signal(data: any): void {
        console.log('📩 Received signal:', data.type);
        if (this.peer) {
            this.peer.signal(data);
        }
    }

    public getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    public destroy(): void {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.remoteStream = null;
        console.log('🔌 Peer destroyed');
    }
}