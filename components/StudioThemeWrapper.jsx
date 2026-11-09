// File: components/StudioThemeWrapper.jsx
"use client";

import { useStudioSession } from "@/components/StudioSessionProvider";
import MovieModal from "@/components/MovieModal";

export default function StudioThemeWrapper({ children }) {
  const session = useStudioSession();
  const activeTheme = session?.activeLut || "default";
  const globalMediaModal = session?.globalMediaModal || null;
  const closeMediaModal = session?.closeMediaModal;

  const getThemeGlow = () => {
    switch (activeTheme) {
      case "theme_matrix_emerald":
        return "bg-gradient-to-tr from-emerald-950/60 via-emerald-500/20 to-teal-400/15";
      case "theme_noir_crimson":
        return "bg-gradient-to-tr from-rose-950/60 via-red-600/20 to-orange-500/12";
      case "theme_cyber_violet":
        return "bg-gradient-to-tr from-violet-950/60 via-fuchsia-600/20 to-cyan-500/15";
      case "theme_imax_gold":
        return "bg-gradient-to-tr from-amber-950/60 via-yellow-500/20 to-orange-400/15";
      case "theme_blade_runner_teal":
        return "bg-gradient-to-tr from-teal-950/60 via-cyan-500/20 to-amber-500/15";
      default:
        return "bg-gradient-to-tr from-cyan-950/50 via-sky-600/15 to-indigo-500/15";
    }
  };

  return (
    <div
      data-studio-lut={activeTheme}
      className="min-h-screen flex flex-col relative transition-colors duration-700 bg-[#04060d]"
    >
      {/* Subtle Architectural Studio Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-start justify-center overflow-hidden opacity-45">
        <div
          className={`w-[1100px] h-[540px] blur-[150px] rounded-full -translate-y-44 transition-all duration-700 ${getThemeGlow()}`}
        />
      </div>

      {children}

      {/* Global Media Dossier Modal (triggered from Command Palette or global actions) */}
      {globalMediaModal?.id && (
        <MovieModal
          movieId={globalMediaModal.id}
          mediaType={globalMediaModal.type}
          onClose={closeMediaModal}
        />
      )}
    </div>
  );
}
