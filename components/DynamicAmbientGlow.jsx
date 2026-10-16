// components/DynamicAmbientGlow.jsx
"use client";

export default function DynamicAmbientGlow({ backdropUrl }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-[#030307]">
      {backdropUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 blur-[120px] scale-150 transition-all duration-1000 ease-out"
          style={{ backgroundImage: `url('${backdropUrl}')` }}
        ></div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030307]/60 via-[#030307]/80 to-[#030307]"></div>
    </div>
  );
}