// app/home/page.tsx - Grid view
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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
}

export default function GridHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'custom')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
        return;
      }
      
      if (data) {
        setPosts(data);
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const handleCardClick = (slug: string) => {
    router.push(`/?post=${slug}`);
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
          <div className="flex items-center justify-between">
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
            </div>
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
                <div className="text-sm text-gray-400">Visualizations</div>
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
                      <span className="flex items-center gap-1">
                        ❤️ {post.likes_count || 0}
                      </span>
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
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Visualizations Yet</h2>
            <p className="text-gray-400">Check back soon for interactive globe visualizations!</p>
          </div>
        )}
      </main>

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
