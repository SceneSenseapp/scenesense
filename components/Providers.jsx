// File: components/Providers.jsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";

// Global Theme Context for Prop Department Color Grades / LUTs
const StudioThemeContext = createContext({
  theme: "theme_default",
  setTheme: () => {},
  isSupporter: false
});

export const useStudioTheme = () => useContext(StudioThemeContext);

// Global Operative Auth Context
const OperativeAuthContext = createContext({
  user: null,
  profile: null,
  loading: true
});

export const useOperativeAuth = () => useContext(OperativeAuthContext);

function StudioThemeProvider({ children }) {
  const [theme, setTheme] = useState("theme_default");
  const [isSupporter, setIsSupporter] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Firebase auth & Firestore live document
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubDoc();

      if (currentUser && db) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubDoc = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setProfile(data);
              setIsSupporter(Boolean(data?.hasFuelSupporterBadge));

              // Auto-apply equipped theme LUT from Firestore
              if (data?.equippedTheme) {
                setTheme(data.equippedTheme);
              }
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.warn("Theme provider telemetry notice:", err);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubDoc();
    };
  }, []);

  // Inject active LUT tokens into document body dataset
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return (
    <OperativeAuthContext.Provider value={{ user, profile, loading }}>
      <StudioThemeContext.Provider value={{ theme, setTheme, isSupporter }}>
        <div 
          className={`min-h-screen transition-colors duration-500 ${
            theme === "theme_matrix_emerald"
              ? "selection:bg-emerald-500 selection:text-black"
              : theme === "theme_solar_gold"
                ? "selection:bg-amber-400 selection:text-black"
                : "selection:bg-cyan-500 selection:text-black"
          }`}
        >
          {children}
        </div>
      </StudioThemeContext.Provider>
    </OperativeAuthContext.Provider>
  );
}

export default function Providers({ children }) {
  return (
    <StudioThemeProvider>
      {children}
    </StudioThemeProvider>
  );
}