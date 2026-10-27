// File: components/AIGuide.jsx
"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, MeshDistortMaterial } from '@react-three/drei';
import { playTerminalClick, playDeploySweep } from '@/components/utils/sfx';

// 3D Neural Crystalline Mesh for SceneSense CineGuide
function AICore({ isSpeaking }) {
  const coreRef = useRef();
  const ringRef = useRef();
  const secondaryRingRef = useRef();

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;

    if (coreRef.current) {
      if (isSpeaking) {
        // High-frequency harmonic pulse when transmitting dialogue
        const pulse = 1 + Math.sin(elapsed * 12) * 0.08;
        coreRef.current.scale.set(pulse, pulse, pulse);
        coreRef.current.rotation.y = elapsed * 1.5;
      } else {
        // Idle gentle breathing rhythm
        const idlePulse = 1 + Math.sin(elapsed * 2.2) * 0.03;
        coreRef.current.scale.set(idlePulse, idlePulse, idlePulse);
        coreRef.current.rotation.y = elapsed * 0.4;
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.8) * 0.2;
      ringRef.current.rotation.y = elapsed * 0.9;
    }

    if (secondaryRingRef.current) {
      secondaryRingRef.current.rotation.x = Math.PI / 3 + Math.cos(elapsed * 0.6) * 0.3;
      secondaryRingRef.current.rotation.z = elapsed * -0.7;
    }
  });

  return (
    <Float speed={3.5} rotationIntensity={1.2} floatIntensity={1.8}>
      {/* Central Neural Icosahedron */}
      <mesh ref={coreRef} castShadow>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial 
          color={isSpeaking ? "#06b6d4" : "#02121e"} 
          emissive={isSpeaking ? "#38bdf8" : "#0891b2"}
          emissiveIntensity={isSpeaking ? 3.5 : 2.0}
          distort={isSpeaking ? 0.45 : 0.25} 
          speed={isSpeaking ? 5.5 : 2.0} 
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Primary Cyan Orbital Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.022, 16, 80]} />
        <meshStandardMaterial 
          color="#22d3ee" 
          emissive="#06b6d4" 
          emissiveIntensity={isSpeaking ? 4.0 : 2.2} 
        />
      </mesh>

      {/* Secondary Counter-Rotating Ring */}
      <mesh ref={secondaryRingRef}>
        <torusGeometry args={[1.75, 0.015, 16, 80]} />
        <meshStandardMaterial 
          color="#38bdf8" 
          emissive="#0284c7" 
          emissiveIntensity={1.8} 
        />
      </mesh>
    </Float>
  );
}

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AIGuide({ currentRoute = 'Dashboard' }) {
  const router = useRouter();
  const isMounted = useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  // Context-aware holographic dialogue tree
  const getDialogue = () => {
    switch (currentRoute) {
      case 'Profile':
        return "Director, your loadout and studio telemetry are synchronized. Review your call sheets to claim active coin bounties.";
      case 'Radar':
      case 'WhereToWatch':
        return "Surveillance radar active across satellite catalogs. Filter by territory to cross-examine streaming and theater availability.";
      case 'Armoury':
        return "Studio commissary online. 35mm film borders, screen credits, and phosphor LUT color grades are ready for requisition.";
      case 'Chat':
        return "Sector communication relays calibrated. Script Doctor and DirectorBot stand by for dialogue and screen diagnostic runs.";
      case 'Reviews':
        return "Critique archives accessible. Logging verified dispatches awards 50 XP and 10 Studio Credits directly to your ledger.";
      case 'Watchlist':
        return "Active watchlist radar monitoring targets. Confirmed viewings automatically advance your Projectionist Call Sheet.";
      case 'Mood':
        return "AI Oracle Nexus tuned to psychometric resonance. Select your core vibe and era window to isolate target cinema.";
      default:
        return "CineGuide neural core online. All satellite telemetry feeds and community archives operating at peak capacity.";
    }
  };

  const handleInteract = () => {
    playTerminalClick();
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState) {
      playDeploySweep();
      setIsSpeaking(true);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, 3500);
    } else {
      setIsSpeaking(false);
    }
  };

  const handleQuickAction = () => {
    playTerminalClick();
    setIsExpanded(false);
    switch (currentRoute) {
      case 'WhereToWatch':
      case 'Radar':
        router.push('/watchlist');
        break;
      case 'Armoury':
        router.push('/profile');
        break;
      case 'Reviews':
        router.push('/where-to-watch');
        break;
      default:
        router.push('/mood');
        break;
    }
  };

  if (!isMounted) return null;

  return (
    <aside aria-label="CineGuide AI Assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none font-sans select-none">
      
      {/* Holographic Dialogue Terminal */}
      {isExpanded && (
        <div className="pointer-events-auto w-80 bg-[#080d1a]/95 backdrop-blur-2xl border border-cyan-500/40 p-5 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.25)] transition-all animate-fade-in font-mono space-y-3.5">
          
          {/* Header Status HUD */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                CineGuide // Telemetry
              </span>
            </div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">
              V2.6 UPLINK
            </span>
          </div>

          {/* Dialogue Text */}
          <p className="text-xs text-slate-200 font-light leading-relaxed font-sans">
            {getDialogue()}
          </p>

          {/* Action Deck */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickAction}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95 text-center truncate"
            >
              {currentRoute === 'WhereToWatch' ? 'View Radar →' : currentRoute === 'Armoury' ? 'Dossier →' : 'Consult Oracle ⚡'}
            </button>

            <button
              type="button"
              onClick={() => {
                playTerminalClick();
                setIsExpanded(false);
              }}
              className="px-3.5 py-2 bg-[#050811] hover:bg-white/5 border border-cyan-500/30 hover:border-cyan-400 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Interactive Container */}
      <div 
        className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 group"
        onClick={handleInteract}
        title="Toggle CineGuide AI Assistant"
      >
        {/* Ambient Glow Backdrop Behind 3D Mesh */}
        <div className={`absolute inset-2 rounded-full blur-xl transition-all duration-500 pointer-events-none ${
          isSpeaking 
            ? 'bg-cyan-400/35 scale-110' 
            : 'bg-cyan-500/15 group-hover:bg-cyan-500/25'
        }`} />

        <Canvas 
          camera={{ position: [0, 0, 4.2], fov: 48 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="#06b6d4" />
          <AICore isSpeaking={isSpeaking} />
          <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={4.5} blur={2.2} />
        </Canvas>
      </div>

    </aside>
  );
}