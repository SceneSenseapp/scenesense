// File: components/Avatar.jsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Float, MeshDistortMaterial } from '@react-three/drei';

const MODEL_PATH = '/guide_base.glb';

// Fallback procedural hologram when 3D asset is downloading or missing
function ProceduralHologram({ isSpeaking }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const elapsed = state.clock.elapsedTime;
      const speed = isSpeaking ? 8 : 2;
      const scale = isSpeaking ? 1 + Math.sin(elapsed * 10) * 0.05 : 1 + Math.sin(elapsed * 2) * 0.02;
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.rotation.y = elapsed * 0.5;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.9, 1]} />
        <MeshDistortMaterial
          color="#031626"
          emissive={isSpeaking ? "#22d3ee" : "#0891b2"}
          emissiveIntensity={isSpeaking ? 3.0 : 1.5}
          distort={isSpeaking ? 0.4 : 0.2}
          speed={isSpeaking ? 4 : 1.5}
          roughness={0.2}
          metalness={0.8}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function GLTFModel({ animationState, isSpeaking, ...props }) {
  const group = useRef();
  
  // Safe load GLTF model from public directory
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions, names } = useAnimations(animations, group);

  // Traverse materials once to inject cyan command terminal rim reflections
  useMemo(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        // If material supports emissive, harmonize with cyan palette
        if ('emissive' in child.material && !child.material.emissiveMap) {
          child.material.emissive.set('#06b6d4');
          child.material.emissiveIntensity = isSpeaking ? 0.6 : 0.2;
        }
      }
    });
  }, [scene, isSpeaking]);

  useEffect(() => {
    if (!actions || names.length === 0) return;

    // Resolve safe action or fallback to first available animation or 'neutral'
    const targetState = actions[animationState] 
      ? animationState 
      : actions['neutral'] 
        ? 'neutral' 
        : names[0];

    const currentAction = actions[targetState];

    if (currentAction) {
      // Fade in target animation while cross-fading from other running actions
      currentAction.reset().fadeIn(0.3).play();
    }

    return () => {
      if (currentAction) {
        currentAction.fadeOut(0.3);
      }
    };
  }, [animationState, actions, names]);

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

export default function Avatar({ 
  animationState = 'neutral',
  isSpeaking = false,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) {
  const [hasModelError, setHasModelError] = useState(false);

  // If asset is missing or fails to load, gracefully switch to ProceduralHologram
  if (hasModelError) {
    return <ProceduralHologram isSpeaking={isSpeaking} />;
  }

  return (
    <ErrorBoundary onCatch={() => setHasModelError(true)}>
      <GLTFModel 
        animationState={animationState}
        isSpeaking={isSpeaking}
        scale={scale}
        position={position}
        rotation={rotation}
      />
    </ErrorBoundary>
  );
}

// Simple internal class boundary for three-fiber GLTF load failures
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("Avatar 3D asset notice, switching to procedural core:", error?.message);
    this.props.onCatch?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Preload the model asset
if (typeof window !== 'undefined') {
  try {
    useGLTF.preload(MODEL_PATH);
  } catch {}
}