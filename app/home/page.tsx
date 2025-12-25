// app/home/page.tsx - Grid view with Search and Authentication
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

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
  custom_html: string;
  category_id: string | null;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export default function GridHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const router = useRouter();

  // Get category from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categorySlug = params.get('category');
    setSelectedCategory(categorySlug);
  }, []);

  // Check for authenticated user on mount
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .eq('type', 'custom')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
        return;
      }
      
      if (data) {
        setAllPosts(data);
        setPosts(data);
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Search and filter functionality
  useEffect(() => {
    let filtered = allPosts;

    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(post => post.categories?.slug === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        return (
          post.title?.toLowerCase().includes(query) ||
          post.description?.toLowerCase().includes(query) ||
          post.custom_html?.toLowerCase().includes(query) ||
          post.categories?.name?.toLowerCase().includes(query)
        );
      });
    }

    setPosts(filtered);
  }, [searchQuery, selectedCategory, allPosts]);

  const handleCardClick = (slug: string) => {
    router.push(`/?post=${slug}`);
  };

  const handleCategoryClick = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    window.history.pushState({}, '', `/home?category=${categorySlug}`);
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    window.history.pushState({}, '', '/home');
  };

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Check if user already liked this post
      const { data: existingLike } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .eq('type', 'like')
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('interactions')
          .delete()
          .eq('id', existingLike.id);

        // Decrement likes count
        await supabase.rpc('decrement_likes_count', { post_id: postId });

        // Update local state
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p
        ));
        setAllPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p
        ));
      } else {
        // Like
        await supabase
          .from('interactions')
          .insert({
            user_id: user.id,
            post_id: postId,
            type: 'like'
          });

        // Increment likes count
        await supabase.rpc('increment_likes_count', { post_id: postId });

        // Update local state
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
        ));
        setAllPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Auth handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    }
    setAuthLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    // Check if username is taken
    if (username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        setAuthError('Username is already taken');
        setAuthLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      // Create profile
      await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username,
        });
      
      setAuthError('');
      alert('Account created! Please check your email to verify your account.');
      setAuthMode('signin');
      setEmail('');
      setPassword('');
      setUsername('');
    }
    setAuthLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setResetSent(true);
    }
    setAuthLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`,
      }
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading visualizations...</p>
        </div>
      </div>
    );
  }

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
              <a
                href="/sitemap-tree"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-2"
              >
                🗺️ Sitemap
              </a>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                🎬 Feed View
              </button>
              
              {/* User Menu */}
              {user && profile ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                        {profile.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="font-semibold">{profile.username || 'User'}</span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visualizations by title, description, or content..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌐</div>
              <div>
                <div className="text-2xl font-bold text-white">{posts.length}</div>
                <div className="text-sm text-gray-400">
                  {searchQuery ? 'Results' : 'Visualizations'}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">❤️</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {posts.reduce((sum, p) => sum + (p.likes_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Total Likes</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💬</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {posts.reduce((sum, p) => sum + (p.comments_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Total Comments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {(searchQuery || selectedCategory) && posts.length > 0 && (
          <div className="mb-6 text-center">
            <p className="text-gray-400 text-sm">
              {selectedCategory && (
                <>
                  Showing <span className="text-white font-semibold">{posts.length}</span> visualization{posts.length !== 1 ? 's' : ''} in{' '}
                  <span className="text-purple-400 font-semibold">
                    {allPosts.find(p => p.categories?.slug === selectedCategory)?.categories?.name || selectedCategory}
                  </span>
                  {searchQuery && (
                    <> matching "{searchQuery}"</>
                  )}
                  {' '}
                  <button
                    onClick={clearCategoryFilter}
                    className="text-purple-400 hover:text-purple-300 underline ml-2"
                  >
                    Clear filter
                  </button>
                </>
              )}
              {searchQuery && !selectedCategory && (
                <>
                  Found <span className="text-white font-semibold">{posts.length}</span> result{posts.length !== 1 ? 's' : ''} for "{searchQuery}"
                </>
              )}
            </p>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => handleCardClick(post.slug)}
              className="group cursor-pointer"
            >
              {/* Card */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 overflow-hidden">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl">🌍</div>
                    </div>
                  )}
                  
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">▶️</div>
                      <div className="text-sm font-semibold">View Visualization</div>
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs font-semibold">
                    Interactive
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Category Tag */}
                  {post.categories && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(post.categories!.slug);
                      }}
                      className="inline-block mb-2 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-full text-xs font-semibold transition"
                    >
                      {post.categories.name}
                    </button>
                  )}

                  {/* Title */}
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                    {post.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {post.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleLike(e, post.id)}
                        className="flex items-center gap-1 hover:text-red-400 transition"
                      >
                        ❤️ {post.likes_count || 0}
                      </button>
                      <span className="flex items-center gap-1">
                        💬 {post.comments_count || 0}
                      </span>
                    </div>
                    <span>
                      {new Date(post.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {searchQuery ? '🔍' : '🌍'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {searchQuery ? 'No Results Found' : selectedCategory ? 'No Visualizations in This Category' : 'No Visualizations Yet'}
            </h2>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? `No visualizations match "${searchQuery}". Try different keywords.`
                : selectedCategory
                ? `No visualizations found in this category yet.`
                : 'Check back soon for interactive globe visualizations!'
              }
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clearCategoryFilter();
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 z-[60000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🌍</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
              </h2>
              <p className="text-gray-400 text-sm">
                {authMode === 'signin' ? 'Sign in to continue' : authMode === 'signup' ? 'Join our community' : 'Enter your email to reset password'}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {authError}
              </div>
            )}

            {resetSent && authMode === 'reset' && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                Password reset email sent! Check your inbox.
              </div>
            )}

            <form onSubmit={authMode === 'signin' ? handleSignIn : authMode === 'signup' ? handleSignUp : handlePasswordReset} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-white text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="your@email.com"
                  required
                />
              </div>

              {authMode !== 'reset' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>

            {authMode !== 'reset' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-900 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </>
            )}

            <div className="mt-6 text-center text-sm">
              {authMode === 'signin' && (
                <>
                  <button
                    onClick={() => {
                      setAuthMode('reset');
                      setAuthError('');
                      setResetSent(false);
                    }}
                    className="text-purple-400 hover:text-purple-300 transition"
                  >
                    Forgot password?
                  </button>
                  <p className="text-gray-400 mt-2">
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError('');
                      }}
                      className="text-purple-400 hover:text-purple-300 font-semibold transition"
                    >
                      Sign up
                    </button>
                  </p>
                </>
              )}
              {authMode === 'signup' && (
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError('');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {authMode === 'reset' && (
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError('');
                    setResetSent(false);
                  }}
                  className="text-purple-400 hover:text-purple-300 transition"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">
              Powered by{' '}
              <a 
                href="https://globe.gl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Globe.GL
              </a>
              {' '}• Built with Next.js & Supabase
            </p>
            <p>Interactive 3D Data Visualizations © 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
