// app/feed/page.tsx - Redirect to home
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  );
}
