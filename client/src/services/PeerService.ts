import Peer from 'peerjs';

export class PeerService {
    private peer: Peer | null = null;
    private currentCall: any = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onConnectionStateChangeCallback: ((state: string) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onPeerReadyCallback: ((peerId: string) => void) | null = null;
    private peerId: string | null = null;
    private isReady: boolean = false;

    constructor() {
        console.log('🎥 Creating PeerService');
        
        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                ]
            },
            debug: 2
        });

        this.peer.on('open', (id) => {
            this.peerId = id;
            this.isReady = true;
            console.log('✅ PeerJS connected! Peer ID:', id);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
            if (this.onPeerReadyCallback) {
                this.onPeerReadyCallback(id);
            }
        });

        this.peer.on('call', (call) => {
            console.log('📞 Incoming call from:', call.peer);
            this.currentCall = call;
            
            if (this.localStream) {
                call.answer(this.localStream);
                call.on('stream', (remoteStream) => {
                    console.log('✅ Remote stream received via PeerJS!');
                    this.remoteStream = remoteStream;
                    if (this.onRemoteStreamCallback) {
                        this.onRemoteStreamCallback(remoteStream);
                    }
                    if (this.onConnectionStateChangeCallback) {
                        this.onConnectionStateChangeCallback('connected');
                    }
                });
                call.on('close', () => {
                    console.log('📞 Call closed');
                    this.remoteStream = null;
                    if (this.onConnectionStateChangeCallback) {
                        this.onConnectionStateChangeCallback('disconnected');
                    }
                });
            } else {
                console.warn('⚠️ No local stream available to answer call');
                if (this.onErrorCallback) {
                    this.onErrorCallback(new Error('No local stream available'));
                }
            }
        });

        this.peer.on('error', (err) => {
            console.error('❌ PeerJS error:', err);
            if (this.onErrorCallback) {
                this.onErrorCallback(err);
            }
        });

        this.peer.on('disconnected', () => {
            console.log('❌ PeerJS disconnected');
            this.isReady = false;
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('disconnected');
            }
        });
    }

    public setLocalStream(stream: MediaStream): void {
        console.log('📷 Setting local stream');
        this.localStream = stream;
    }

    public getPeerId(): string | null {
        return this.peerId;
    }

    public isPeerReady(): boolean {
        return this.isReady;
    }

    public onPeerReady(callback: (peerId: string) => void): void {
        this.onPeerReadyCallback = callback;
    }

    public onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    public onConnectionStateChange(callback: (state: string) => void): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public onError(callback: (error: Error) => void): void {
        this.onErrorCallback = callback;
    }

    public async call(peerId: string): Promise<void> {
        if (!this.peer) {
            throw new Error('Peer not initialized');
        }
        if (!this.localStream) {
            throw new Error('Local stream not available');
        }
        if (!this.isReady) {
            throw new Error('Peer not ready yet');
        }
        
        console.log('📞 Calling peer:', peerId);
        
        const call = this.peer.call(peerId, this.localStream);
        this.currentCall = call;
        
        call.on('stream', (remoteStream) => {
            console.log('✅ Remote stream received via PeerJS!');
            this.remoteStream = remoteStream;
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(remoteStream);
            }
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        });
        
        call.on('close', () => {
            console.log('📞 Call closed');
            this.remoteStream = null;
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('disconnected');
            }
        });

        call.on('error', (err) => {
            console.error('❌ Call error:', err);
            if (this.onErrorCallback) {
                this.onErrorCallback(err);
            }
        });
    }

    public getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    public isConnected(): boolean {
        return this.peer?.open || false;
    }

    public disconnect(): void {
        console.log('🔌 Disconnecting PeerJS');
        if (this.currentCall) {
            this.currentCall.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.remoteStream = null;
        this.localStream = null;
        this.isReady = false;
    }
}