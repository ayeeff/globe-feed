// app/page.tsx - WITH VIEW TRACKING
"use client";
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import CustomVisual from '../components/CustomVisual';
import CommentPanel from '../components/CommentPanel';

// --- Embed Modal Component ---
function EmbedModal({ post, onClose }: { post: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = typeof window !== 'undefined' ? `${window.location.origin}/embed/${post.slug}` : '';
  
  const embedCode = `<iframe width="800" height="550" src="${embedUrl}" title="${post.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[20001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl relative" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-white text-xl font-bold mb-4">Embed Visualization</h3>
        
        <div className="mb-4">
          <label className="block text-white/60 text-sm mb-2">Embed Code</label>
          <div className="relative">
            <textarea 
              readOnly 
              value={embedCode}
              className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white/80 text-sm font-mono resize-none focus:outline-none focus:border-purple-500 transition"
              onClick={(e) => e.currentTarget.select()}
            />
            <button 
              onClick={handleCopy}
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-purple-600 text-white text-xs rounded-md transition flex items-center gap-1.5 backdrop-blur-md"
            >
              {copied ? (
                <>
                  <span>✓</span> Copied
                </>
              ) : (
                <>
                  <span>📋</span> Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>Fixed Size (800x550)</span>
          <span className="mx-1">•</span>
          <span>Interactive</span>
        </div>
      </div>
    </div>
  );
}

function FeedContent() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(new Set([0]));
  
  // Track which posts have been viewed in this session
  const viewedPostsRef = useRef<Set<string>>(new Set());
  
  // REFS
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const hasInitialLoadHappened = useRef(false);
  
  const searchParams = useSearchParams();

  // Function to increment view count
  const incrementViewCount = async (postId: string) => {
    // Only increment once per session per post
    if (viewedPostsRef.current.has(postId)) return;
    
    try {
      const { error } = await supabase.rpc('increment_views_count', { 
        post_id: postId 
      });

      if (!error) {
        viewedPostsRef.current.add(postId);
        
        // Update local state to reflect new view count
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, views_count: (p.views_count || 0) + 1 } : p
        ));
        
        console.log('📊 View counted for post:', postId);
      } else {
        console.error('Error incrementing view count:', error);
      }
    } catch (error) {
      console.error('Error calling increment_views_count:', error);
    }
  };

  // 1. Fetch Posts & Handle Initial Deep Link
  useEffect(() => {
    if (hasInitialLoadHappened.current) return;

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
        hasInitialLoadHappened.current = true;
        
        // Handle Deep Linking
        const slug = searchParams.get('post');
        if (slug) {
          const index = data.findIndex(p => p.slug === slug);
          if (index !== -1) {
            isProgrammaticScroll.current = true;
            
            setCurrentIndex(index);
            setLoadedIndexes(new Set([index]));
            
            // Track view for deep-linked post
            incrementViewCount(data[index].id);
            
            setTimeout(() => {
              if (containerRef.current?.children[index]) {
                containerRef.current.children[index].scrollIntoView({ behavior: 'auto' });
                
                setTimeout(() => {
                  isProgrammaticScroll.current = false;
                }, 500);
              }
            }, 100);
          }
        } else if (data.length > 0) {
          // Track view for first post if no deep link
          incrementViewCount(data[0].id);
        }
      }
    }
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 2. Track view when currentIndex changes
  useEffect(() => {
    if (posts.length > 0 && posts[currentIndex]) {
      incrementViewCount(posts[currentIndex].id);
    }
  }, [currentIndex, posts]);

  // 3. Update URL when user swipes
  useEffect(() => {
    if (posts.length > 0 && posts[currentIndex]) {
      const slug = posts[currentIndex].slug;
      if (slug) {
        const newUrl = `/?post=${slug}`;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      }
    }
  }, [currentIndex, posts]);

  // 4. Handle Scroll (Swipe Detection)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

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

  // 5. Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommentsOpen || isEmbedOpen) return;
      
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
  }, [currentIndex, posts.length, isCommentsOpen, isEmbedOpen]);

  const navigateToPost = (index: number) => {
    if (index < 0 || index >= posts.length) return;
    
    isProgrammaticScroll.current = true;
    
    containerRef.current?.children[index]?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
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
                {/* Info Overlay */}
                <div className="absolute bottom-32 left-0 right-0 z-[20000] pointer-events-none">
                  <div className="px-8 max-w-2xl">
                    <h2 className="text-white text-2xl font-bold mb-1 drop-shadow-lg pointer-events-auto">
                      {post.title}
                    </h2>
                    {post.description && (
                      <p className="text-white/90 text-sm drop-shadow-lg pointer-events-auto">
                        {post.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Horizontal Button Bar */}
                <div className="absolute bottom-10 left-0 right-0 z-[20000] flex justify-center items-center gap-6 pointer-events-auto px-4">
                  <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">❤️</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      {post.likes_count || 0}
                    </span>
                  </button>

                  <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">💬</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      {post.comments_count || 0}
                    </span>
                  </button>

                  <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">🔗</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      Share
                    </span>
                  </button>

                  <button onClick={() => setIsEmbedOpen(true)} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">📟</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      Embed
                    </span>
                  </button>

                  <a href="/home" className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      Home
                    </span>
                  </a>

                  <a href="/sitemap-tree" className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition border border-white/10">
                      <span className="text-2xl">🗺️</span>
                    </div>
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider drop-shadow-lg">
                      Map
                    </span>
                  </a>
                </div>

                {/* Navigation Arrows */}
                {index < posts.length - 1 && (
                  <button onClick={() => navigateToPost(index + 1)} className="absolute right-8 top-1/2 -translate-y-1/2 z-[20000] pointer-events-auto group">
                    <div className="bg-black/30 backdrop-blur-sm rounded-full p-4 group-hover:bg-black/50 transition-all group-hover:scale-110">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )}
                
                {index > 0 && (
                  <button onClick={() => navigateToPost(index - 1)} className="absolute left-8 top-1/2 -translate-y-1/2 z-[20000] pointer-events-auto group">
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

      {/* MODALS */}
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

      {isEmbedOpen && posts[currentIndex] && (
        <EmbedModal 
          post={posts[currentIndex]} 
          onClose={() => setIsEmbedOpen(false)} 
        />
      )}
      
      {/* Scroll indicator dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[20000] flex gap-2 pointer-events-none">
        {posts.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex 
                ? 'w-6 bg-white' 
                : 'w-1.5 bg-white/20'
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
