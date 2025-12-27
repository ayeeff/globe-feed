"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

// --- Types ---
interface Post { 
  id: string; 
  slug: string; 
  title: string; 
  description: string; 
  thumbnail_url: string; 
  created_at: string; 
  likes_count: number; 
  comments_count: number; 
  shares_count: number; 
  views_count: number; 
  custom_html: string; 
  category_id: string | null; 
  externalurl: string | null; 
  categories?: { id: string; name: string; slug: string } | null 
}

interface Profile { 
  id: string; 
  username: string | null; 
  avatar_url: string | null 
}

type AuthMode = 'signin' | 'signup' | 'reset';

// --- Contact Us Modal Component ---
function ContactUsModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState(''); 
  const [subject, setSubject] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setIsSubmitting(true); 
    
    try { 
      // 1. Save to Supabase
      const { data: msgData, error } = await supabase
        .from('contact_messages')
        .insert({ 
          name: name.trim(), 
          email: email.trim(), 
          subject: subject.trim(), 
          description: description.trim() 
        })
        .select()
        .single(); 
      
      if (error) { 
        console.error(error);
        alert('Failed to save message.'); 
        setIsSubmitting(false); 
        return; 
      } 
      
      // 2. Trigger Email via API
      await fetch('/api/send-contact-message', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ messageId: msgData.id }) 
      }); 
      
      setSubmitted(true); 
      setTimeout(() => onClose(), 2000); 
    } catch (err) { 
      console.error(err);
      alert('Error occurred while sending.'); 
    } 
    setIsSubmitting(false); 
  };

  if (submitted) return (
    <div className="fixed inset-0 z-[60000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-white text-2xl font-bold mb-2">Message Sent!</h3>
        <p className="text-gray-400">We'll get back to you soon.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-6">
          <div className="text-4xl mb-3">📧</div>
          <h3 className="text-white text-2xl font-bold mb-2">Contact Us</h3>
          <p className="text-gray-400 text-sm">Send us a message</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" placeholder="Your name" required />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" placeholder="What's this about?" required />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Message</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition resize-none" placeholder="Your message..." required />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition disabled:opacity-50">
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function GridHomePage() {
  const [posts, setPosts] = useState<Post[]>([]); 
  const [allPosts, setAllPosts] = useState<Post[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); 
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'likes' | 'category'>('date'); 
  const [user, setUser] = useState<User | null>(null); 
  const [profile, setProfile] = useState<Profile | null>(null); 
  
  // Modal States
  const [showAuthModal, setShowAuthModal] = useState(false); 
  const [showContactModal, setShowContactModal] = useState(false); 
  const [showUserMenu, setShowUserMenu] = useState(false); 
  
  // Auth Form States
  const [authMode, setAuthMode] = useState<AuthMode>('signin'); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [username, setUsername] = useState(''); 
  const [authError, setAuthError] = useState(''); 
  const [authLoading, setAuthLoading] = useState(false); 
  const [resetSent, setResetSent] = useState(false); 
  
  const router = useRouter();

  // Initial Load
  useEffect(() => { 
    const params = new URLSearchParams(window.location.search); 
    setSelectedCategory(params.get('category')); 
  }, []);

  // Auth Listener
  useEffect(() => { 
    checkUser(); 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
      setUser(session?.user ?? null); 
      if (session?.user) fetchUserProfile(session.user.id); 
      else setProfile(null); 
    }); 
    return () => subscription.unsubscribe(); 
  }, []);

  const checkUser = async () => { 
    const { data: { user } } = await supabase.auth.getUser(); 
    setUser(user); 
    if (user) await fetchUserProfile(user.id); 
  };

  const fetchUserProfile = async (userId: string) => { 
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single(); 
    if (data) setProfile(data); 
  };

  // Fetch Posts
  useEffect(() => { 
    async function fetchPosts() { 
      const { data, error } = await supabase
        .from('posts')
        .select(`*, categories (id, name, slug)`)
        .eq('type', 'custom')
        .order('created_at', { ascending: false }); 
      
      if (!error && data) { 
        setAllPosts(data); 
        setPosts(data); 
      } 
      setLoading(false); 
    } 
    fetchPosts(); 
  }, []);

  // Filter & Sort Logic
  useEffect(() => { 
    let filtered = [...allPosts]; 
    if (selectedCategory) filtered = filtered.filter(p => p.categories?.slug === selectedCategory); 
    
    if (searchQuery.trim()) { 
      const q = searchQuery.toLowerCase(); 
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) || 
        p.custom_html?.toLowerCase().includes(q) || 
        p.categories?.name?.toLowerCase().includes(q)
      ); 
    } 
    
    filtered.sort((a, b) => { 
      if (sortBy === 'views') return (b.views_count || 0) - (a.views_count || 0); 
      if (sortBy === 'likes') return (b.likes_count || 0) - (a.likes_count || 0); 
      if (sortBy === 'category') { 
        const catA = a.categories?.name || ''; 
        const catB = b.categories?.name || ''; 
        return catA.localeCompare(catB); 
      } 
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); 
    }); 
    setPosts(filtered); 
  }, [searchQuery, selectedCategory, allPosts, sortBy]);

  // Handlers
  const handleCardClick = (e: React.MouseEvent, post: Post) => { 
    if (post.externalurl) { 
      window.open(post.externalurl, '_blank'); 
      return; 
    } 
    (e.ctrlKey || e.metaKey || e.button === 1) 
      ? window.open(`/?post=${post.slug}`, '_blank') 
      : router.push(`/?post=${post.slug}`); 
  };

  const handleLike = async (e: React.MouseEvent, postId: string) => { 
    e.stopPropagation(); 
    if (!user) { setShowAuthModal(true); return; } 
    
    try { 
      const { data: like } = await supabase.from('interactions').select('id').eq('user_id', user.id).eq('post_id', postId).eq('type', 'like').single(); 
      
      if (like) { 
        await supabase.from('interactions').delete().eq('id', like.id); 
        await supabase.rpc('decrement_likes_count', { post_id: postId }); 
        const updater = (p: Post[]) => p.map(x => x.id === postId ? { ...x, likes_count: Math.max(0, (x.likes_count || 0) - 1) } : x);
        setPosts(updater); setAllPosts(updater); 
      } else { 
        await supabase.from('interactions').insert({ user_id: user.id, post_id: postId, type: 'like' }); 
        await supabase.rpc('increment_likes_count', { post_id: postId }); 
        const updater = (p: Post[]) => p.map(x => x.id === postId ? { ...x, likes_count: (x.likes_count || 0) + 1 } : x);
        setPosts(updater); setAllPosts(updater); 
      } 
    } catch {} 
  };

  const handleSignIn = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(''); 
    setAuthLoading(true); 
    const { error } = await supabase.auth.signInWithPassword({ email, password }); 
    if (error) setAuthError(error.message); 
    else { setShowAuthModal(false); setEmail(''); setPassword(''); } 
    setAuthLoading(false); 
  };

  const handleSignUp = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(''); 
    setAuthLoading(true); 
    if (username) { 
      const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).single(); 
      if (existing) { setAuthError('Username taken'); setAuthLoading(false); return; } 
    } 
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } }); 
    if (error) setAuthError(error.message); 
    else if (data.user) { 
      await supabase.from('profiles').insert({ id: data.user.id, username }); 
      alert('Check email!'); 
      setAuthMode('signin'); setEmail(''); setPassword(''); setUsername(''); 
    } 
    setAuthLoading(false); 
  };

  const handlePasswordReset = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(''); 
    setAuthLoading(true); 
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); 
    if (error) setAuthError(error.message); 
    else setResetSent(true); 
    setAuthLoading(false); 
  };

  const handleGoogleSignIn = async () => { 
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: `${window.location.origin}/home` } 
    }); 
    if (error) setAuthError(error.message); 
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌍</div>
              <div>
                <h1 className="text-2xl font-bold text-white">Globe.GL Gallery</h1>
                <p className="text-sm text-gray-400">Interactive 3D Data Visualizations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/sitemap-tree" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-2">🗺️ Sitemap</a>
              <button onClick={() => router.push('/')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center gap-2">🎬 Feed</button>
              {user && profile ? (
                <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">{profile.username?.[0]?.toUpperCase() || '?'}</div>}
                    <span className="font-semibold">{profile.username || 'User'}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-2">
                      <button onClick={async () => { await supabase.auth.signOut(); setShowUserMenu(false); }} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition">Sign Out</button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition">Sign In</button>
              )}
            </div>
          </div>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌐</div>
              <div><div className="text-2xl font-bold text-white">{posts.length}</div><div className="text-sm text-gray-400">Visualizations</div></div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">❤️</div>
              <div><div className="text-2xl font-bold text-white">{posts.reduce((s, p) => s + (p.likes_count || 0), 0)}</div><div className="text-sm text-gray-400">Total Likes</div></div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💬</div>
              <div><div className="text-2xl font-bold text-white">{posts.reduce((s, p) => s + (p.comments_count || 0), 0)}</div><div className="text-sm text-gray-400">Comments</div></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10 w-fit">
          <span className="text-gray-400 text-sm font-medium px-2">Sort:</span>
          <button onClick={() => setSortBy('date')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'date' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>🕒 Newest</button>
          <button onClick={() => setSortBy('views')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'views' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>👁️ Views</button>
          <button onClick={() => setSortBy('likes')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'likes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>❤️ Liked</button>
          <button onClick={() => setSortBy('category')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'category' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>📂 Category</button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <div key={post.id} onClick={(e) => handleCardClick(e, post)} className="group cursor-pointer">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 overflow-hidden">
                  {post.thumbnail_url ? <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><div className="text-6xl">🌍</div></div>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">{post.externalurl ? '🔗' : '▶️'}</div>
                      <div className="text-sm font-semibold">{post.externalurl ? 'Visit' : 'View'}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {post.categories && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedCategory(post.categories!.slug); 
                        window.history.pushState({}, '', `/home?category=${post.categories!.slug}`); 
                      }} 
                      className="inline-block mb-2 px-3 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-full text-xs font-semibold"
                    >
                      {post.categories.name}
                    </button>
                  )}
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => handleLike(e, post.id)} className="flex items-center gap-1 hover:text-red-400">❤️ {post.likes_count || 0}</button>
                      <span>💬 {post.comments_count || 0}</span>
                      <span>👁️ {post.views_count || 0}</span>
                    </div>
                    <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">Powered by <a href="https://globe.gl" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Globe.GL</a> • Built with Next.js & Supabase</p>
            <p className="mb-4">Interactive 3D Data Visualizations © 2025</p>
            <button onClick={() => setShowContactModal(true)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition">Contact Us</button>
          </div>
        </div>
      </footer>

      {/* Contact Modal Trigger */}
      {showContactModal && <ContactUsModal onClose={() => setShowContactModal(false)} />}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthModal(false)}>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🌍</div>
              <h2 className="text-2xl font-bold text-white mb-2">{authMode === 'signin' ? 'Welcome' : authMode === 'signup' ? 'Create Account' : 'Reset'}</h2>
            </div>
            {authError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{authError}</div>}
            {resetSent && authMode === 'reset' && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">Email sent!</div>}
            
            <form onSubmit={authMode === 'signin' ? handleSignIn : authMode === 'signup' ? handleSignUp : handlePasswordReset} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Username" required />
                </div>
              )}
              <div>
                <label className="block text-white text-sm font-medium mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="email" required />
              </div>
              {authMode !== 'reset' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="••••" required minLength={6} />
                </div>
              )}
              <button type="submit" disabled={authLoading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold disabled:opacity-50">
                {authLoading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Sign Up' : 'Send Reset'}
              </button>
            </form>

            {authMode !== 'reset' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-gray-900 text-gray-400">Or</span></div>
                </div>
                <button onClick={handleGoogleSignIn} className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Google
                </button>
              </>
            )}

            <div className="mt-6 text-center text-sm">
              {authMode === 'signin' && (
                <>
                  <button onClick={() => { setAuthMode('reset'); setAuthError(''); setResetSent(false); }} className="text-purple-400 hover:text-purple-300">Forgot password?</button>
                  <p className="text-gray-400 mt-2">Don't have an account? <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className="text-purple-400 hover:text-purple-300 font-semibold">Sign up</button></p>
                </>
              )}
              {authMode === 'signup' && (
                <p className="text-gray-400">Already have an account? <button onClick={() => { setAuthMode('signin'); setAuthError(''); }} className="text-purple-400 hover:text-purple-300 font-semibold">Sign in</button></p>
              )}
              {authMode === 'reset' && (
                <button onClick={() => { setAuthMode('signin'); setAuthError(''); }} className="text-purple-400 hover:text-purple-300 font-semibold">Back to Sign In</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
