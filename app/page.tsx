// app/page.tsx - FULL SOURCE WITH UI TRANSPARENCY FIX
"use client";
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import CustomVisual from '../components/CustomVisual';
import CommentPanel from '../components/CommentPanel';
import { User } from '@supabase/supabase-js';
import Script from 'next/script';

// --- Error Report Modal Component ---
function ErrorReportModal({ post, onClose }: { post: any; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (post) {
      const url = typeof window !== 'undefined' ? `${window.location.origin}/?post=${post.slug}` : '';
      setSubject(`Error Report: ${post.title} - ${url}`);
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: reportData, error } = await supabase
        .from('error_reports')
        .insert({
          post_id: post.id,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          description: description.trim(),
          url: `${window.location.origin}/?post=${post.slug}`,
        })
        .select()
        .single();

      if (error) throw error;

      await fetch('/api/send-error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportData.id }),
      });

      setSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit error report.');
    }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[20001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-white text-2xl font-bold mb-2">Report Submitted!</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[20001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="mb-6">
          <div className="text-4xl mb-3">🐛</div>
          <h3 className="text-white text-2xl font-bold mb-2">Report an Error</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white" placeholder="Name" required />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white" placeholder="Email" required />
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white" placeholder="Subject" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white resize-none" placeholder="Issue details..." required />
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-semibold">{isSubmitting ? 'Submitting...' : 'Submit Report'}</button>
        </form>
      </div>
    </div>
  );
}

// --- Embed Modal Component ---
function EmbedModal({ post, onClose }: { post: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = typeof window !== 'undefined' ? `${window.location.origin}/embed/${post.slug}` : '';
  const embedCode = `<iframe width="800" height="550" src="${embedUrl}" title="${post.title}" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="fixed inset-0 z-[20001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-white text-xl font-bold mb-4">Embed Visualization</h3>
        <textarea readOnly value={embedCode} className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white/80 text-sm font-mono" />
        <button onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md">{copied ? 'Copied!' : 'Copy Code'}</button>
      </div>
    </div>
  );
}

function FeedContent() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(new Set([0]));
  const [user, setUser] = useState<User | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const hasInitialLoadHappened = useRef(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserLikes(session.user.id);
      else setUserLikes(new Set());
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserLikes = async (userId: string) => {
    const { data } = await supabase.from('interactions').select('post_id').eq('user_id', userId).eq('type', 'like');
    if (data) setUserLikes(new Set(data.map(i => i.post_id)));
  };

  const incrementViewCount = async (postId: string) => {
    if (viewedPostsRef.current.has(postId)) return;
    try {
      const { error } = await supabase.rpc('increment_views_count', { post_id: postId });
      if (!error) viewedPostsRef.current.add(postId);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (hasInitialLoadHappened.current) return;
    async function fetchPosts() {
      const { data } = await supabase.from('posts').select('*, categories(*)').in('type', ['custom', 'cesium', 'globe', 'leaflet']).order('created_at', { ascending: false });
      if (data) {
        setPosts(data);
        hasInitialLoadHappened.current = true;
        const slug = searchParams.get('post');
        if (slug) {
          const index = data.findIndex(p => p.slug === slug);
          if (index !== -1) {
            setCurrentIndex(index);
            setLoadedIndexes(new Set([index]));
          }
        }
      }
    }
    fetchPosts();
  }, [searchParams]);

  useEffect(() => {
    if (posts[currentIndex]) {
      incrementViewCount(posts[currentIndex].id);
      const slug = posts[currentIndex].slug;
      if (slug) {
        const newUrl = `/?post=${slug}`;
        window.history.replaceState(null, '', newUrl);
      }
      // CRITICAL DATA SYNC
      // @ts-ignore
      window.currentPostConfig = posts[currentIndex].config;
      // @ts-ignore
      if (window.GlobeVizInit) window.GlobeVizInit();
    }
  }, [currentIndex, posts]);

  const navigateToPost = (index: number) => {
    if (index < 0 || index >= posts.length) return;
    setCurrentIndex(index);
    const newLoaded = new Set(loadedIndexes);
    newLoaded.add(index);
    setLoadedIndexes(newLoaded);
    containerRef.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
  };

  const handleLike = async () => {
    if (!user) { window.location.href = '/home'; return; }
    const post = posts[currentIndex];
    const isLiked = userLikes.has(post.id);
    if (isLiked) {
      await supabase.from('interactions').delete().eq('user_id', user.id).eq('post_id', post.id).eq('type', 'like');
      await supabase.rpc('decrement_likes_count', { post_id: post.id });
      setUserLikes(prev => { const s = new Set(prev); s.delete(post.id); return s; });
    } else {
      await supabase.from('interactions').insert({ user_id: user.id, post_id: post.id, type: 'like' });
      await supabase.rpc('increment_likes_count', { post_id: post.id });
      setUserLikes(prev => new Set(prev).add(post.id));
    }
  };

  const hasGlobePosts = posts.some(p => p.type === 'globe' || p.type === 'custom');
  const hasLeafletPosts = posts.some(p => p.type === 'leaflet');
  const hasCesiumPosts = posts.some(p => p.type === 'cesium');

  if (posts.length === 0) return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <>
      {hasGlobePosts && (
        <>
          <Script src="//cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js" strategy="beforeInteractive" />
          <Script src="//cdn.jsdelivr.net/npm/globe.gl@2.37.0/dist/globe.gl.min.js" strategy="lazyOnload" />
          <Script src="//unpkg.com/d3-scale" strategy="lazyOnload" />
          <Script src="//unpkg.com/d3-interpolate" strategy="lazyOnload" />
          <Script src="//unpkg.com/topojson-client@3" strategy="lazyOnload" />
        </>
      )}

      {hasLeafletPosts && (
        <>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="lazyOnload" />
        </>
      )}

      {hasCesiumPosts && (
        <>
          <link href="https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Widgets/widgets.css" rel="stylesheet" />
          <Script src="https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Cesium.js" strategy="lazyOnload" />
        </>
      )}

      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

      <main ref={containerRef} className="feed-container h-screen w-full bg-black overflow-hidden flex">
        {posts.map((post, index) => (
          <div key={post.id} className="h-screen w-screen flex-shrink-0 relative">
            {loadedIndexes.has(index) && index === currentIndex ? (
              <CustomVisual type={post.type} css={post.custom_css} html={post.custom_html} scriptContent={post.custom_script} isActive={true} />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center text-white/50">Navigate to load</div>
            )}

            {index === currentIndex && (
              <>
                {/* METADATA SECTION - FIXED TRANSPARENCY */}
                <div className="absolute bottom-32 left-0 right-0 z-[1000] pointer-events-none">
                  <div className="px-8 max-w-2xl bg-black/40 backdrop-blur-md rounded-r-xl py-4 pointer-events-auto">
                    {post.categories && (
                      <button onClick={() => router.push(`/home?category=${post.categories.slug}`)} className="inline-block mb-3 px-4 py-1.5 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-500/50 text-purple-200 rounded-full text-sm font-semibold">
                        {post.categories.name}
                      </button>
                    )}
                    <h2 className="text-white text-2xl font-bold mb-1 drop-shadow-lg">{post.title}</h2>
                    <p className="text-white/90 text-sm drop-shadow-lg">{post.description}</p>
                  </div>
                </div>

                {/* INTERACTION BUTTONS */}
                <div className="absolute bottom-10 left-0 right-0 z-[20000] flex justify-center items-center gap-6 pointer-events-auto px-4">
                  <button onClick={handleLike} className="flex flex-col items-center gap-1">
                    <div className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center border ${userLikes.has(post.id) ? 'bg-red-500/30 border-red-500/50' : 'bg-black/50 border-white/10'}`}>
                      <span className="text-2xl">❤️</span>
                    </div>
                    <span className="text-white text-[10px]">{post.likes_count || 0}</span>
                  </button>

                  <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <span className="text-2xl">💬</span>
                    </div>
                    <span className="text-white text-[10px]">{post.comments_count || 0}</span>
                  </button>

                  <button onClick={() => setIsEmbedOpen(true)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <span className="text-2xl">📟</span>
                    </div>
                    <span className="text-white text-[10px]">Embed</span>
                  </button>

                  <button onClick={() => setIsErrorReportOpen(true)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <span className="text-2xl">🐛</span>
                    </div>
                    <span className="text-white text-[10px]">Error</span>
                  </button>
                </div>

                {/* NAVIGATION ARROWS */}
                {index < posts.length - 1 && (
                  <button onClick={() => navigateToPost(index + 1)} className="absolute right-8 top-1/2 -translate-y-1/2 z-[20000] p-4 bg-black/30 backdrop-blur-sm rounded-full">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
                {index > 0 && (
                  <button onClick={() => navigateToPost(index - 1)} className="absolute left-8 top-1/2 -translate-y-1/2 z-[20000] p-4 bg-black/30 backdrop-blur-sm rounded-full">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </main>

      {isCommentsOpen && posts[currentIndex] && (
        <CommentPanel postId={posts[currentIndex].id} onClose={() => setIsCommentsOpen(false)} onCommentAdded={() => { /* logic to update count */ }} />
      )}
      {isEmbedOpen && posts[currentIndex] && <EmbedModal post={posts[currentIndex]} onClose={() => setIsEmbedOpen(false)} />}
      {isErrorReportOpen && posts[currentIndex] && <ErrorReportModal post={posts[currentIndex]} onClose={() => setIsErrorReportOpen(false)} />}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>}>
      <FeedContent />
    </Suspense>
  );
}
