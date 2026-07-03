import React, { useRef, useEffect, useState } from 'react';

interface CameraPreviewProps {
    audioEnabled?: boolean;
    videoEnabled?: boolean;
    onStreamReady?: (stream: MediaStream) => void;
    onError?: (error: Error) => void;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({
    audioEnabled = true,
    videoEnabled = true,
    onStreamReady,
    onError
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        console.log('🔴 CameraPreview mounted, starting camera...');
        
        // Small delay to ensure video element is rendered
        const timer = setTimeout(() => {
            startCamera();
        }, 300);

        return () => {
            clearTimeout(timer);
            console.log('🔴 CameraPreview unmounting, stopping camera...');
            stopCamera();
        };
    }, [audioEnabled, videoEnabled]);

    const startCamera = async () => {
        console.log('📷 startCamera called');
        setIsLoading(true);
        setError(null);

        try {
            console.log('📷 Requesting getUserMedia...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: videoEnabled,
                audio: audioEnabled
            });

            console.log('📷 Stream obtained:', mediaStream);
            console.log('📷 Video tracks:', mediaStream.getVideoTracks());
            console.log('📷 Audio tracks:', mediaStream.getAudioTracks());

            streamRef.current = mediaStream;
            setStream(mediaStream);

            // Try to set the stream on the video element
            if (videoRef.current) {
                console.log('📷 Setting srcObject on video element');
                videoRef.current.srcObject = mediaStream;
                
                videoRef.current.onloadedmetadata = () => {
                    console.log('📷 Video metadata loaded');
                    videoRef.current?.play().then(() => {
                        console.log('📷 Video playing!');
                        setIsVideoPlaying(true);
                    }).catch(err => {
                        console.error('📷 Error playing video:', err);
                    });
                };
                
                try {
                    await videoRef.current.play();
                    setIsVideoPlaying(true);
                    console.log('📷 Video playing immediately');
                } catch (playErr) {
                    console.error('📷 Immediate play failed:', playErr);
                }
            } else {
                console.warn('📷 videoRef.current is null, stream stored for later');
            }

            if (onStreamReady) {
                console.log('📷 Calling onStreamReady callback');
                onStreamReady(mediaStream);
            }

            setIsLoading(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
            console.error('📷 Camera error:', errorMessage);
            setError(errorMessage);
            setIsLoading(false);
            
            if (onError) {
                onError(err instanceof Error ? err : new Error(errorMessage));
            }
        }
    };

    const stopCamera = () => {
        console.log('📷 stopCamera called');
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                console.log(`📷 Stopping ${track.kind} track`);
                track.stop();
            });
            streamRef.current = null;
        }
        setStream(null);

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsVideoPlaying(false);
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTracks = stream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
                console.log(`📷 Video track enabled: ${track.enabled}`);
            });
        }
    };

    const toggleAudio = () => {
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
                console.log(`📷 Audio track enabled: ${track.enabled}`);
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4">Requesting camera access...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
                <div className="text-white text-center">
                    <span className="text-4xl">📷</span>
                    <p className="mt-4 text-red-400">Camera unavailable</p>
                    <p className="text-sm text-gray-400 mt-2">{error}</p>
                    <button
                        onClick={() => {
                            console.log('📷 Retry button clicked');
                            startCamera();
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                className="w-full h-auto min-h-[200px] bg-gray-900"
                autoPlay
                playsInline
                muted
                style={{ display: 'block' }}
            />
            
            {!isVideoPlaying && !isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="text-white text-center">
                        <span className="text-3xl">⏳</span>
                        <p className="mt-2 text-sm">Starting camera...</p>
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <button
                    onClick={toggleVideo}
                    className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm"
                >
                    {stream?.getVideoTracks()[0]?.enabled !== false ? '📹' : '🚫📹'}
                </button>
                <button
                    onClick={toggleAudio}
                    className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm"
                >
                    {stream?.getAudioTracks()[0]?.enabled !== false ? '🎤' : '🚫🎤'}
                </button>
            </div>

            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                📹 Your Camera {isVideoPlaying ? '🟢' : '⏳'}
            </div>

            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {stream?.getVideoTracks()[0]?.getSettings().width || '?'}x{stream?.getVideoTracks()[0]?.getSettings().height || '?'}
            </div>
        </div>
    );
};

export default CameraPreview;