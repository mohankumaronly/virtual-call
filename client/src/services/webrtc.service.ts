export interface WebRTCConfig {
    iceServers?: RTCIceServer[];
}

export class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private remoteStream: MediaStream | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
    private onIceCandidateCallback: ((candidate: RTCIceCandidate | null) => void) | null = null;
    private onIceConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;
    private onTrackCallback: ((track: MediaStreamTrack, stream: MediaStream) => void) | null = null;

    constructor() {
        const defaultConfig: RTCConfiguration = {
            iceServers: [
                {
                    urls: [
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                        'stun:stun2.l.google.com:19302',
                        'stun:stun3.l.google.com:19302',
                        'stun:stun4.l.google.com:19302',
                    ]
                },
                // TURN servers for NAT traversal
                {
                    urls: [
                        'turn:openrelay.metered.ca:80',
                        'turn:openrelay.metered.ca:443',
                        'turn:openrelay.metered.ca:3478',
                    ],
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
        };

        console.log('🎥 Creating WebRTCService with TURN servers');
        this.peerConnection = new RTCPeerConnection(defaultConfig);
        this.setupPeerConnectionListeners();
    }

    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        // ✅ Handle remote tracks (video/audio)
        this.peerConnection.ontrack = (event) => {
            console.log('🎥 Remote track received:', event.track.kind);
            console.log('🎥 Remote track ID:', event.track.id);
            console.log('🎥 Remote streams:', event.streams.length);

            if (event.streams.length > 0) {
                this.remoteStream = event.streams[0];
                console.log('🎥 Remote stream ID:', this.remoteStream.id);
                console.log('🎥 Remote stream tracks:', this.remoteStream.getTracks().length);

                if (this.onRemoteStreamCallback) {
                    this.onRemoteStreamCallback(event.streams[0]);
                }
                if (this.onTrackCallback) {
                    this.onTrackCallback(event.track, event.streams[0]);
                }
            } else {
                console.warn('⚠️ No streams in ontrack event');
            }
        };

        // ✅ Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState || 'disconnected';
            console.log('🎥 Connection state changed:', state);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback(state);
            }
        };

        // ✅ Handle ICE candidates - send ALL candidates including null
        this.peerConnection.onicecandidate = (event) => {
            if (this.onIceCandidateCallback) {
                console.log('🎥 ICE candidate event:', event.candidate ? 'candidate' : 'gathering complete');
                this.onIceCandidateCallback(event.candidate);
            }
        };

        // ✅ Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState || 'disconnected';
            console.log('🎥 ICE connection state changed:', state);
            if (this.onIceConnectionStateChangeCallback) {
                this.onIceConnectionStateChangeCallback(state);
            }
        };

        // ✅ Handle negotiation needed
        this.peerConnection.onnegotiationneeded = () => {
            console.log('🎥 Negotiation needed');
        };

        // ✅ Handle signaling state changes
        this.peerConnection.onsignalingstatechange = () => {
            const state = this.peerConnection?.signalingState || 'stable';
            console.log('🎥 Signaling state changed:', state);
        };
    }

    public setLocalStream(stream: MediaStream): void {
        console.log('🎥 setLocalStream called');
        console.log('🎥 Stream tracks:', stream.getTracks().length);

        if (!this.peerConnection) {
            console.error('🎥 Peer connection is null');
            return;
        }

        // Remove existing senders first to avoid "track already set" error
        const senders = this.peerConnection.getSenders();
        console.log('🎥 Existing senders:', senders.length);

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

        console.log('🎥 Local stream set successfully');
    }

    public onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    public onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public onIceCandidate(callback: (candidate: RTCIceCandidate | null) => void): void {
        this.onIceCandidateCallback = callback;
    }

    public onIceConnectionStateChange(callback: (state: RTCIceConnectionState) => void): void {
        this.onIceConnectionStateChangeCallback = callback;
    }

    public onTrack(callback: (track: MediaStreamTrack, stream: MediaStream) => void): void {
        this.onTrackCallback = callback;
    }

    public async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            console.log('📞 Creating offer...');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(offer);
            console.log('🎥 Offer created and set as local description');
            return offer;
        } catch (error) {
            console.error('🎥 Failed to create offer:', error);
            throw error;
        }
    }

    // Add this to the createAnswer method in WebRTCService.ts
    public async createAnswer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            console.log('📞 [ANSWER] Creating answer...');
            console.log('📞 [ANSWER] Current signaling state:', this.peerConnection.signalingState);
            console.log('📞 [ANSWER] Remote description:', this.peerConnection.remoteDescription?.type);
            console.log('📞 [ANSWER] Local description:', this.peerConnection.localDescription?.type);

            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            console.log('📞 [ANSWER] Answer created:', answer.type);

            await this.peerConnection.setLocalDescription(answer);
            console.log('✅ [ANSWER] Answer set as local description');
            console.log('📞 [ANSWER] New signaling state:', this.peerConnection.signalingState);
            return answer;
        } catch (error) {
            console.error('❌ [ANSWER] Failed to create answer:', error);
            throw error;
        }
    }

    public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        try {
            console.log('📡 Setting remote description, type:', description.type);
            await this.peerConnection.setRemoteDescription(description);
            console.log('🎥 Remote description set successfully');
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
            console.log('🎥 ICE candidate added successfully');
        } catch (error) {
            console.error('🎥 Failed to add ICE candidate:', error);
            throw error;
        }
    }

    public getPeerConnection(): RTCPeerConnection | null {
        return this.peerConnection;
    }

    public getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    public getConnectionState(): RTCPeerConnectionState {
        return this.peerConnection?.connectionState || 'disconnected';
    }

    public getIceConnectionState(): RTCIceConnectionState {
        return this.peerConnection?.iceConnectionState || 'disconnected';
    }

    public getSignalingState(): RTCSignalingState {
        return this.peerConnection?.signalingState || 'stable';
    }

    public close(): void {
        console.log('🎥 Closing WebRTC connection');
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
        console.log('🎥 WebRTC connection closed');
    }

    public isConnected(): boolean {
        return this.peerConnection?.connectionState === 'connected';
    }

    public isConnecting(): boolean {
        return this.peerConnection?.connectionState === 'connecting';
    }
}