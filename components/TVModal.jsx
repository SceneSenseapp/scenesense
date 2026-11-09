// File: components/TVModal.jsx
"use client";

import MovieModal from "@/components/MovieModal";

export default function TVModal({ tvId, showId, onClose }) {
  const resolvedId = tvId || showId;
  if (!resolvedId) return null;
  return (
    <MovieModal movieId={resolvedId} mediaType="tv" onClose={onClose} />
  );
}
