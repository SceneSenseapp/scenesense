// app/movie/[id]/page.jsx
"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MovieModal from '@/components/MovieModal';

export default function MovieDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id;
  const mediaType = searchParams?.get('type') || 'movie';

  if (!id) return null;

  return (
    <div className="min-h-screen bg-[#030307] py-6 px-4 flex items-center justify-center">
      <MovieModal
        movieId={id}
        mediaType={mediaType}
        onClose={() => router.push('/where')}
      />
    </div>
  );
}