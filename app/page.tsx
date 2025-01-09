'use client';
import { useState, useEffect } from 'react';
import Orb from '@/components/orb';
import Button from '@/components/button';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showRune, setShowRune] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [showAura, setShowAura] = useState(true);
  const [showPulse, setShowPulse] = useState(true);
  const [showSpikes, setShowSpikes] = useState(true);
  const [showInactiveRune, setShowInactiveRune] = useState(true);
  const [showControls, setShowControls] = useState(true);
  /* useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    if (!isMobile) {
      window.location.href = '/desk';
    }
  }, []); */
  useEffect(() => {
    const hideControls = () => {
      setShowControls(false);
      setTimeout(() => setShowControls(true), 5000);
    };

    const interval = setInterval(hideControls, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 transition-all duration-500">
      <div className={`transition-transform duration-500 ease-in-out ${showControls ? 'translate-y-0' : 'translate-y-14'}`}>
        <Orb
          isActive={isActive}
          isSpeaking={isSpeaking}
          showRune={showRune}
          showBorder={showBorder}
          showAura={showAura}
          showPulse={showPulse}
          showSpikes={showSpikes}
          showInactiveRune={showInactiveRune}
        />
      </div>

      <div className="h-40 w-[270.75px] overflow-hidden p-1 pt-4">
      <p>Task 1 : Core: Iniciando descarga, testeo.</p>
        <div className={`
    grid grid-cols-2 gap-4 box-border rounded-xl 
    transition-all duration-500 ease-in-out
    ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
  `}>
    
          <Button onClick={() => setShowRune(!showRune)} active={showRune}>
            {showRune ? 'Deactivate Rune' : 'Activate Rune'}
          </Button>
          <Button onClick={() => setIsSpeaking(!isSpeaking)} active={isSpeaking}>
            {isSpeaking ? 'Stop Border' : 'Start Border'}
          </Button>
          <Button onClick={() => setShowAura(!showAura)} active={showAura}>
            {showAura ? 'Hide Aura' : 'Show Aura'}
          </Button>
          <Button onClick={() => setShowPulse(!showPulse)} active={showPulse}>
            {showPulse ? 'Stop Pulse' : 'Start Pulse'}
          </Button>
          <Button onClick={() => setShowSpikes(!showSpikes)} active={showSpikes}>
            {showSpikes ? 'Disable Spikes' : 'Enable Spikes'}
          </Button>
          <Button onClick={() => setShowInactiveRune(!showInactiveRune)} active={showInactiveRune}>
            {showInactiveRune ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
        </div>
      </div>
    </div>
  );
}