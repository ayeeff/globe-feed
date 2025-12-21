// app/page.tsx - Updated with better visualization cleanup
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
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(new Set([0]));
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
        
        const slug = searchParams.get('post');
        if (slug) {
          const index = data.findIndex(p => p.slug === slug);
          if (index !== -1) {
            setCurrentIndex(index);
            setLoadedIndexes(new Set([index]));
            setTimeout(() => {
              containerRef.current?.children[index]?.scrollIntoView({ behavior: 'auto' });
            }, 100);
          }
        }
      }
    }
    fetchPosts();
  }, [searchParams]);

  useEffect(() => {
    if (posts.length > 0 && posts[currentIndex]) {
      const slug = posts[currentIndex].slug;
      if (slug) {
        router.replace(`/?post=${slug}`, { scroll: false });
      }
    }
  }, [currentIndex, posts, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / windowHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
        setCurrentIndex(newIndex);
        
        const indexesToLoad = new Set(loadedIndexes);
        indexesToLoad.add(newIndex);
        if (newIndex > 0) indexesToLoad.add(newIndex - 1);
        if (newIndex < posts.length - 1) indexesToLoad.add(newIndex + 1);
        setLoadedIndexes(indexesToLoad);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, posts.length, loadedIndexes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommentsOpen) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToPost(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPost(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, posts.length, isCommentsOpen]);

  const navigateToPost = (index: number) => {
    if (index < 0 || index >= posts.length) return;
    
    containerRef.current?.children[index]?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

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
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleLike = async () => {
    const post = posts[currentIndex];
    const { error } = await supabase
      .from('posts')
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq('id', post.id);

    if (!error) {
      setPosts(prev => prev.map((p, i) => 
        i === currentIndex ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
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
            {loadedIndexes.has(index) && index === currentIndex ? (
              <CustomVisual 
                key={post.id}
                css={post.custom_css} 
                html={post.custom_html} 
                scriptContent={post.custom_script}
                isActive={true}
              />
            ) : loadedIndexes.has(index) ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                <div className="text-center text-white/50">
                  <div className="text-4xl mb-2">🌍</div>
                  <p className="text-sm">Swipe to load</p>
                </div>
              </div>
            )}

            {index === currentIndex && (
              <>
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

                  {/* NEW: Sitemap */}
                  <a 
                    href="/sitemap-tree"
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition">
                      <span className="text-2xl">🗺️</span>
                    </div>
                    <span className="text-white text-xs font-semibold drop-shadow-lg">
                      Map
                    </span>
                  </a>
                </div>

                {/* Navigation arrows */}
                {index < posts.length - 1 && (
                  <button
                    onClick={() => navigateToPost(index + 1)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 z-[20000] pointer-events-auto group"
                  >
                    <div className="bg-black/30 backdrop-blur-sm rounded-full p-4 group-hover:bg-black/50 transition-all group-hover:scale-110">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )}
                
                {index > 0 && (
                  <button
                    onClick={() => navigateToPost(index - 1)}
                    className="absolute left-8 top-1/2 -translate-y-1/2 z-[20000] pointer-events-auto group"
                  >
                    <div className="bg-black/30 backdrop-blur-sm rounded-full p-4 group-hover:bg-black/50 transition-all group-hover:scale-110">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </main>

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
      
      {/* Pagination Dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[20000] flex gap-2 pointer-events-none">
        {posts.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'w-8 bg-white' 
                : 'w-2 bg-white/30'
            }`}
          />
        ))}
      </div>
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
