// app/sitemap-tree/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function SitemapTreePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading sitemap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            🌍 Globe.GL Sitemap
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            Interactive 3D Globe Visualizations Directory
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href={`${baseUrl}/sitemap.xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition flex items-center gap-2"
            >
              📄 View XML Sitemap
            </a>
            <a 
              href="/"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition flex items-center gap-2"
            >
              🏠 Back to Home
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-2">🌐</div>
            <div className="text-3xl font-bold mb-1">{posts.length}</div>
            <div className="text-gray-300 text-sm">Total Visualizations</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-2">❤️</div>
            <div className="text-3xl font-bold mb-1">
              {posts.reduce((sum, p) => sum + (p.likes_count || 0), 0)}
            </div>
            <div className="text-gray-300 text-sm">Total Likes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-3xl font-bold mb-1">
              {posts.reduce((sum, p) => sum + (p.comments_count || 0), 0)}
            </div>
            <div className="text-gray-300 text-sm">Total Comments</div>
          </div>
        </div>

        {/* URL Tree Structure */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span>🗂️</span>
            <span>URL Structure</span>
          </h2>

          <div className="space-y-2 font-mono text-sm">
            {/* Root */}
            <div className="flex items-start gap-2">
              <span className="text-purple-400">📁</span>
              <div className="flex-1">
                <a 
                  href={baseUrl}
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {baseUrl}/
                </a>
                <span className="text-gray-500 ml-3">- Homepage Feed</span>
              </div>
            </div>

            {/* Posts */}
            {posts.map((post, index) => (
              <div key={post.id} className="ml-6 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500">
                    {index === posts.length - 1 ? '└─' : '├─'}
                  </span>
                  <span className="text-green-400">🌍</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a 
                        href={`${baseUrl}/?post=${post.slug}`}
                        target="_blank"
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        ?post={post.slug}
                      </a>
                      <button
                        onClick={() => copyToClipboard(`${baseUrl}/?post=${post.slug}`)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition"
                        title="Copy URL"
                      >
                        📋
                      </button>
                    </div>
                    <div className="text-gray-400 mt-1 text-xs">
                      {post.title}
                    </div>
                    {post.description && (
                      <div className="text-gray-500 mt-1 text-xs italic">
                        {post.description}
                      </div>
                    )}
                    
                    {/* Embed URL */}
                    <div className="ml-4 mt-2 flex items-start gap-2">
                      <span className="text-gray-600">└─</span>
                      <span className="text-yellow-400">📺</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a 
                            href={`${baseUrl}/embed/${post.slug}`}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            /embed/{post.slug}
                          </a>
                          <button
                            onClick={() => copyToClipboard(`${baseUrl}/embed/${post.slug}`)}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition"
                            title="Copy Embed URL"
                          >
                            📋
                          </button>
                        </div>
                        <div className="text-gray-500 mt-1 text-xs">
                          Embeddable version
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>❤️ {post.likes_count || 0}</span>
                      <span>💬 {post.comments_count || 0}</span>
                      <span>📅 {new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Sitemap XML */}
            <div className="flex items-start gap-2 mt-4">
              <span className="text-purple-400">📄</span>
              <div className="flex-1">
                <a 
                  href={`${baseUrl}/sitemap.xml`}
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  /sitemap.xml
                </a>
                <span className="text-gray-500 ml-3">- Search Engine Sitemap</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p className="mb-2">
            All visualizations are powered by{' '}
            <a 
              href="https://globe.gl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Globe.GL
            </a>
          </p>
          <p>
            Built with Next.js, Supabase, and Three.js
          </p>
        </div>
      </div>
    </div>
  );
}
