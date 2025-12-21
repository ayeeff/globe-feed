"use client";
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import CustomVisual from '../components/CustomVisual';
import CommentPanel from '../components/CommentPanel';

function FeedContent() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'custom')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }
      
      if (data) {
        setPosts(data);
        
        // Check if there's a slug in URL
        const slug = searchParams.get('post');
        if (slug) {
          const index = data.findIndex(p => p.slug === slug);
          if (index !== -1) {
            setCurrentIndex(index);
            setTimeout(() => {
              containerRef.current?.children[index]?.scrollIntoView({ behavior: 'auto' });
            }, 100);
          }
        }
      }
    }
    fetchPosts();
  }, [searchParams]);

  // Update URL when scrolling to new post
  useEffect(() => {
    if (posts.length > 0 && posts[currentIndex]) {
      const slug = posts[currentIndex].slug;
      if (slug) {
        router.replace(`/?post=${slug}`, { scroll: false });
      }
    }
  }, [currentIndex, posts, router]);

  // Scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / windowHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, posts.length]);

  const handleShare = async () => {
    const url = `${window.location.origin}/?post=${posts[currentIndex].slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: posts[currentIndex].title,
          url: url,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleLike = async () => {
    const post = posts[currentIndex];
    const { error } = await supabase
      .from('posts')
      .update({ likes_count: post.likes_count + 1 })
      .eq('id', post.id);

    if (!error) {
      setPosts(prev => prev.map((p, i) => 
        i === currentIndex ? { ...p, likes_count: p.likes_count + 1 } : p
      ));
    }
  };

  if (posts.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main 
        ref={containerRef}
        className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {posts.map((post, index) => (
          <div 
            key={post.id} 
            className="h-screen w-full snap-start snap-always relative"
          >
            <CustomVisual 
              css={post.custom_css} 
              html={post.custom_html} 
              scriptContent={post.custom_script} 
            />

            {/* Overlay UI */}
            <div className="absolute bottom-0 left-0 right-0 z-[20000] pointer-events-none">
              <div className="p-6 pb-8">
                <h2 className="text-white text-xl font-bold mb-2 drop-shadow-lg pointer-events-auto">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-white/90 text-sm mb-4 drop-shadow-lg pointer-events-auto">
                    {post.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right side action buttons */}
            <div className="absolute right-4 bottom-24 z-[20000] flex flex-col gap-6 pointer-events-auto">
              {/* Like */}
              <button 
                onClick={handleLike}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition">
                  <span className="text-2xl">❤️</span>
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-lg">
                  {post.likes_count || 0}
                </span>
              </button>

              {/* Comments */}
              <button 
                onClick={() => setIsCommentsOpen(true)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition">
                  <span className="text-2xl">💬</span>
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-lg">
                  {post.comments_count || 0}
                </span>
              </button>

              {/* Share */}
              <button 
                onClick={handleShare}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition">
                  <span className="text-2xl">🔗</span>
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-lg">
                  Share
                </span>
              </button>
            </div>

            {/* Scroll indicator */}
            {index < posts.length - 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[20000] pointer-events-none">
                <div className="animate-bounce">
                  <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Comment Panel */}
      {isCommentsOpen && posts[currentIndex] && (
        <CommentPanel
          postId={posts[currentIndex].id}
          onClose={() => setIsCommentsOpen(false)}
          onCommentAdded={() => {
            setPosts(prev => prev.map((p, i) => 
              i === currentIndex ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
            ));
          }}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
