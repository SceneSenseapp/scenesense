"use client";

import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, MeshDistortMaterial } from '@react-three/drei';

// The 3D Mesh for the AI Avatar
function AICore({ isSpeaking }) {
  const coreRef = useRef();
  
  // Pulse the AI core when speaking
  useFrame((state) => {
    if (coreRef.current && isSpeaking) {
      coreRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
      coreRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
      coreRef.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
    } else if (coreRef.current) {
      // Idle breathing animation
      coreRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
    }
  });

  return (
    <Float speed={4} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={coreRef} castShadow>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial 
          color={isSpeaking ? "#ef4444" : "#000000"} 
          emissive={isSpeaking ? "#b91c1c" : "#3b82f6"}
          emissiveIntensity={2}
          distort={0.4} 
          speed={isSpeaking ? 5 : 2} 
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Orbital Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 16, 100]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
      </mesh>
    </Float>
  );
}

export default function AIGuide({ currentRoute = 'Dashboard' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Dynamic dialogue based on the app state
  const getDialogue = () => {
    if (!isExpanded) return "Guide Offline.";
    switch (currentRoute) {
      case 'Profile': return "Commander, your loadout is looking highly tactical today. Shall we review your watchlist radar?";
      case 'Radar': return "Scanning for new releases matching your Cyberpunk and Sci-Fi parameters...";
      default: return "Awaiting your command. I am monitoring all sector frequencies.";
    }
  };

  const handleInteract = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000); // Simulate talking duration
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      
      {/* Holographic Dialogue Box */}
      {isExpanded && (
        <div className="pointer-events-auto w-72 bg-black/80 backdrop-blur-md border border-blue-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.2)] transform transition-all animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2 border-b border-blue-500/20 pb-2">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">System Recon Guide</span>
          </div>
          <p className="text-xs text-gray-200 font-medium leading-relaxed">
            {getDialogue()}
          </p>
          <div className="mt-3 flex gap-2">
             <button className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[9px] font-bold text-blue-300 uppercase rounded-md transition-colors">Analyze Data</button>
             <button className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[9px] font-bold text-red-300 uppercase rounded-md transition-colors" onClick={() => setIsExpanded(false)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <div 
        className="pointer-events-auto w-32 h-32 cursor-pointer transition-transform hover:scale-110"
        onClick={handleInteract}
      >
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Environment preset="city" />
          <AICore isSpeaking={isSpeaking} />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={2} />
        </Canvas>
      </div>
    </div>
  );
}