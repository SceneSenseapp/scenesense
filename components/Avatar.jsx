'use client';

import { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

export default function Avatar({ animationState = 'neutral' }) {
  const group = useRef();
  
  // Ensure 'guide_base.glb' is placed in your public/ folder
  const { scene, animations } = useGLTF('/guide_base.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Safety check: if the LLM hallucinates an animation, default to neutral
    const safeState = actions[animationState] ? animationState : 'neutral';
    const currentAction = actions[safeState];

    if (currentAction) {
      // Reset, fade in over 0.5s, and play
      currentAction.reset().fadeIn(0.5).play();
    }

    // Cleanup: fade out the old animation when the state changes
    return () => {
      if (currentAction) {
        currentAction.fadeOut(0.5);
      }
    };
  }, [animationState, actions]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model so the user doesn't see a pop-in
useGLTF.preload('/guide_base.glb');