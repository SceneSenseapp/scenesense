// app/person/[id]/page.jsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import ActorModal from '@/components/ActorModal';

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  if (!id) return null;

  return (
    <div className="min-h-screen bg-[#030307] py-6 px-4 flex items-center justify-center">
      <ActorModal
        personId={id}
        onClose={() => router.push('/where')}
        onSelectMovie={(movieId, mediaType = 'movie') => {
          router.push(`/movie/${movieId}?type=${mediaType}`);
        }}
        canGoBack={false}
        canGoForward={false}
        onGoBack={() => router.back()}
        onGoForward={() => router.forward()}
      />
    </div>
  );
}