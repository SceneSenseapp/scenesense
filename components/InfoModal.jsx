// components/InfoModal.jsx
'use client';

import React from 'react';
import Image from 'next/image';

export default function InfoModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {data.image && (
            <div className="relative w-36 h-52 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
              <Image
                src={data.image}
                alt={data.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              {data.type === 'actor' ? 'Cast Member' : 'Film'}
            </span>
            <h2 className="text-2xl font-bold mt-1 mb-2">{data.title}</h2>
            
            {data.birthDate && (
              <p className="text-sm text-gray-400 mb-2">Born: {data.birthDate}</p>
            )}
            {data.releaseDate && (
              <p className="text-sm text-gray-400 mb-2">Release Date: {data.releaseDate}</p>
            )}

            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {data.biography || data.overview || 'No additional information available.'}
            </p>

            {data.knownFor && data.knownFor.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-2">Known For / Filmography</h4>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {data.knownFor.map((item) => (
                    <div key={item.id} className="text-center flex-shrink-0 w-20">
                      <div className="relative w-20 h-28 bg-gray-800 rounded mb-1 overflow-hidden">
                        {item.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-500">No Image</div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-300 block truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}