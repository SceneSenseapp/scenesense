"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/firebase'; // Ensure this path matches your config file

export default function LoginButton() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Keep your existing login logic here if it differs from this standard Google popup
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">Logged in as {user.email || 'User'}</span>
        <button 
          onClick={handleLogout} 
          className="px-4 py-2 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin} 
      className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
    >
      Log In
    </button>
  );
}