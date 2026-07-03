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

    useEffect(() => {
        startCamera();

        return () => {
            stopCamera();
        };
    }, [audioEnabled, videoEnabled]);

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: videoEnabled,
                audio: audioEnabled
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            if (onStreamReady) {
                onStreamReady(mediaStream);
            }

            setIsLoading(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
            setError(errorMessage);
            setIsLoading(false);
            
            if (onError) {
                onError(err instanceof Error ? err : new Error(errorMessage));
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTracks = stream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    const toggleAudio = () => {
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
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
                        onClick={startCamera}
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
                className="w-full h-auto"
                autoPlay
                playsInline
                muted
            />
            
            {/* Controls overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <button
                    onClick={toggleVideo}
                    className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm"
                >
                    {stream?.getVideoTracks()[0]?.enabled ? '📹' : '🚫📹'}
                </button>
                <button
                    onClick={toggleAudio}
                    className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm"
                >
                    {stream?.getAudioTracks()[0]?.enabled ? '🎤' : '🚫🎤'}
                </button>
            </div>

            {/* Status label */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                📹 Your Camera
            </div>
        </div>
    );
};

export default CameraPreview;