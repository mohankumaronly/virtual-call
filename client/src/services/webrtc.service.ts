export interface WebRTCConfig {
    iceServers?: RTCIceServer[];
}

export class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private remoteStream: MediaStream | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
    private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;

    constructor() {
        const defaultConfig: RTCConfiguration = {
            iceServers: [
                {
                    urls: [
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                    ]
                }
            ],
            iceCandidatePoolSize: 10,
        };

        console.log('🎥 Creating WebRTCService');
        this.peerConnection = new RTCPeerConnection(defaultConfig);
        this.setupPeerConnectionListeners();
    }

    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        this.peerConnection.ontrack = (event) => {
            console.log('🎥 Remote track received:', event);
            this.remoteStream = event.streams[0];
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(event.streams[0]);
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState || 'disconnected';
            console.log('🎥 Connection state changed:', state);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback(state);
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.onIceCandidateCallback) {
                console.log('🎥 ICE candidate generated:', event.candidate);
                this.onIceCandidateCallback(event.candidate);
            } else {
                console.log('🎥 ICE gathering complete');
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState || 'disconnected';
            console.log('🎥 ICE connection state changed:', state);
        };

        // Add negotiation needed handler
        this.peerConnection.onnegotiationneeded = () => {
            console.log('🎥 Negotiation needed');
        };
    }

    public setLocalStream(stream: MediaStream): void {
        console.log('🎥 setLocalStream called');
        if (!this.peerConnection) {
            console.error('🎥 Peer connection is null');
            return;
        }

        // Remove existing senders first to avoid "track already set" error
        const senders = this.peerConnection.getSenders();
        console.log('🎥 Existing senders:', senders.length);
        
        // Remove all existing senders
        senders.forEach(sender => {
            try {
                this.peerConnection?.removeTrack(sender);
                console.log('🎥 Removed existing sender:', sender.track?.kind);
            } catch (e) {
                console.warn('🎥 Could not remove sender:', e);
            }
        });

        // Add all tracks from the local stream
        stream.getTracks().forEach(track => {
            try {
                console.log('🎥 Adding track to peer connection:', track.kind);
                this.peerConnection?.addTrack(track, stream);
            } catch (e) {
                console.error('🎥 Error adding track:', e);
            }
        });
    }

    public onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    public onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
        this.onIceCandidateCallback = callback;
    }

    public async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(offer);
            console.log('🎥 Offer created:', offer);
            return offer;
        } catch (error) {
            console.error('🎥 Failed to create offer:', error);
            throw error;
        }
    }

    public async createAnswer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(answer);
            console.log('🎥 Answer created:', answer);
            return answer;
        } catch (error) {
            console.error('🎥 Failed to create answer:', error);
            throw error;
        }
    }

    public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            await this.peerConnection.setRemoteDescription(description);
            console.log('🎥 Remote description set');
        } catch (error) {
            console.error('🎥 Failed to set remote description:', error);
            throw error;
        }
    }

    public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('🎥 ICE candidate added');
        } catch (error) {
            console.error('🎥 Failed to add ICE candidate:', error);
            throw error;
        }
    }

    public getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    public getConnectionState(): RTCPeerConnectionState {
        return this.peerConnection?.connectionState || 'disconnected';
    }

    public close(): void {
        console.log('🎥 Closing WebRTC connection');
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
    }

    public isConnected(): boolean {
        return this.peerConnection?.connectionState === 'connected';
    }

    public isConnecting(): boolean {
        return this.peerConnection?.connectionState === 'connecting';
    }
}