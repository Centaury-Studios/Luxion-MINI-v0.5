'use client';
import { useState, useEffect } from 'react';

const Orb = ({
  isActive = true,
  isSpeaking = false,
  showRune = false,
  showBorder = true,
  showAura = true,
  showPulse = true,
  showSpikes = true,
  showInactiveRune = true,
}) => {
  const [borderPath, setBorderPath] = useState('');

  const generatePath = () => {
    if (!showSpikes) return;

    const radius = 150;
    const points = 100;
    let path = [];
    const baseVariance = 12;

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const variance = Math.random() > 0.9 ? Math.random() * baseVariance : 0;
      const x = Math.cos(angle) * (radius + variance);
      const y = Math.sin(angle) * (radius + variance);
      path.push(`${x},${y}`);
    }

    setBorderPath(`M ${path.join(' L ')} Z`);
  };

  useEffect(() => {
    const interval = setInterval(generatePath, 2000);
    generatePath();
    return () => clearInterval(interval);
  }, [showSpikes]);

  if (!isActive) return null;

  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72">
      {/* Main circle */}
      <div className={`absolute inset-0 bg-gradient-to-tr from-white/10 to-white/20 rounded-full ${showPulse ? 'animate-pulse' : ''}`} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-md" />

      {/* Inactive Rune */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
          showInactiveRune && !showRune ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-black/50 blur-md rounded-lg" />
          <svg className="w-32 h-32 relative" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="inactiveRuneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="50%" stopColor="#333333" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
            </defs>
            <path
              d="M50 10 L70 30 L50 50 L30 30 Z M50 50 L70 70 L50 90 L30 70 Z"
              fill="none"
              strokeWidth="4"
              stroke="url(#inactiveRuneGradient)"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            />
          </svg>
        </div>
      </div>

      {/* Active Rune */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
        showRune ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}>
        <div className="relative">
          {showAura && (
            <div className="absolute inset-0 -m-4 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-xl animate-pulse" />
          )}
          <svg className="w-32 h-32 relative z-10" viewBox="0 0 100 100">
            <path
              d="M50 10 L70 30 L50 50 L30 30 Z M50 50 L70 70 L50 90 L30 70 Z"
              fill="none"
              strokeWidth="4"
              className={showPulse ? 'animate-pulse' : ''}
              style={{
                stroke: 'url(#runeGradient)',
                filter: 'drop-shadow(0 0 8px rgba(196, 58, 255, 0.6))'
              }}
            />
            <defs>
              <linearGradient id="runeGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#c026d3">
                  <animate
                    attributeName="stop-color"
                    values="#c026d3;#e879f9;#7e22ce;#a855f7;#c026d3"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="#7e22ce">
                  <animate
                    attributeName="stop-color"
                    values="#7e22ce;#a855f7;#c026d3;#e879f9;#7e22ce"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Animated borders */}
      {showBorder && (
        <>
          {/* Smooth border */}
          <div
            className={`absolute -inset-4 transition-all duration-300 ${
              isSpeaking && !showSpikes ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{
              animation: 'spin 8s linear infinite'
            }}
          >
            <svg className="w-full h-full" viewBox="-200 -200 400 400">
              <path
                d="M 150,0 A 150,150 0 1,1 -150,0 A 150,150 0 1,1 150,0"
                fill="none"
                strokeWidth="4"
                style={{
                  stroke: 'url(#borderGradient)',
                  filter: 'drop-shadow(0 0 4px rgba(196, 58, 255, 0.4))',
                }}
              />
              <defs>
                <linearGradient id="borderGradient" gradientTransform="rotate(90)">
                  <stop offset="0%" stopColor="#c026d3">
                    <animate
                      attributeName="stop-color"
                      values="#c026d3;#e879f9;#7e22ce;#a855f7;#c026d3"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="50%" stopColor="#7e22ce">
                    <animate
                      attributeName="stop-color"
                      values="#7e22ce;#a855f7;#c026d3;#e879f9;#7e22ce"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="100%" stopColor="#e879f9">
                    <animate
                      attributeName="stop-color"
                      values="#e879f9;#7e22ce;#a855f7;#c026d3;#e879f9"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Spiky border */}
          <div
            className={`absolute -inset-4 transition-all duration-300 ${
              isSpeaking && showSpikes ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{
              animation: 'spin 8s linear infinite'
            }}
          >
            <svg className="w-full h-full" viewBox="-200 -200 400 400">
              <path
                d={borderPath}
                fill="none"
                strokeWidth="4"
                className="transition-all duration-300"
                style={{
                  stroke: 'url(#spikyBorderGradient)',
                  filter: 'drop-shadow(0 0 4px rgba(196, 58, 255, 0.4))',
                }}
              />
              <defs>
                <linearGradient id="spikyBorderGradient" gradientTransform="rotate(90)">
                  <stop offset="0%" stopColor="#c026d3">
                    <animate
                      attributeName="stop-color"
                      values="#c026d3;#e879f9;#7e22ce;#a855f7;#c026d3"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="50%" stopColor="#7e22ce">
                    <animate
                      attributeName="stop-color"
                      values="#7e22ce;#a855f7;#c026d3;#e879f9;#7e22ce"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="100%" stopColor="#e879f9">
                    <animate
                      attributeName="stop-color"
                      values="#e879f9;#7e22ce;#a855f7;#c026d3;#e879f9"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Orb;