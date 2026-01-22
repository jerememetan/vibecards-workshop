'use client';

import { useEffect, useRef } from 'react';

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Try to play video when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        // Video might not be available, that's okay
        console.log('Video play failed:', error);
      });
    }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Fallback gradient
      }}
    >
      <video
        ref={videoRef}
        src="/background_video.mp4"
        loop
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.4, // Make it subtle so it doesn't interfere with content
        }}
        onError={() => {
          // If video fails to load, just show the gradient background
          if (videoRef.current) {
            videoRef.current.style.display = 'none';
          }
        }}
      />
      
      {/* Overlay to ensure content is readable and maintain theme */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
