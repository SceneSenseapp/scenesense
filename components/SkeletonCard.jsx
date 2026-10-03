// components/SkeletonCard.jsx
export default function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 w-full animate-pulse">
      <div className="w-full aspect-[2/3] bg-[#2a2a2a] rounded-lg"></div>
      <div className="h-4 bg-[#2a2a2a] rounded w-3/4 mt-2"></div>
      <div className="h-3 bg-[#2a2a2a] rounded w-1/2"></div>
    </div>
  );
}