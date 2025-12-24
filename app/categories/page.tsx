// app/categories/page.tsx - Category Analytics Dashboard
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface CategoryStats {
  id: string;
  name: string;
  slug: string;
  description: string;
  post_count: number;
  total_views: number;
  avg_views_per_post: number;
  last_post_date: string;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPosts, setCategoryPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryPosts(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      // Fetch from the category_stats view
      const { data, error } = await supabase
        .from('category_stats')
        .select('*')
        .order('total_views', { ascending: false });

      if (error) throw error;

      if (data) {
        setCategories(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  const fetchCategoryPosts = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, slug, title, views_count, likes_count, comments_count, created_at')
        .eq('category_id', categoryId)
        .eq('type', 'custom')
        .order('views_count', { ascending: false });

      if (error) throw error;

      if (data) {
        setCategoryPosts(data);
      }
    } catch (error) {
      console.error('Error fetching category posts:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const totalViews = categories.reduce((sum, cat) => sum + cat.total_views, 0);
  const totalPosts = categories.reduce((sum, cat) => sum + cat.post_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Category Analytics</h1>
                <p className="text-sm text-gray-400">View statistics by category</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/home')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-2"
              >
                🏠 Home
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                🎬 Feed View
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🗂️</div>
              <div>
                <div className="text-3xl font-bold">{categories.length}</div>
                <div className="text-sm text-gray-400">Categories</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-4xl">👁️</div>
              <div>
                <div className="text-3xl font-bold">{formatNumber(totalViews)}</div>
                <div className="text-sm text-gray-400">Total Views</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌍</div>
              <div>
                <div className="text-3xl font-bold">{totalPosts}</div>
                <div className="text-sm text-gray-400">Total Posts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`cursor-pointer bg-white/5 backdrop-blur-sm rounded-xl p-6 border transition-all hover:scale-105 ${
                selectedCategory === category.id 
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                  : 'border-white/10 hover:border-purple-500/50'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                <p className="text-sm text-gray-400">{category.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Posts</span>
                  <span className="text-lg font-semibold">{category.post_count}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Views</span>
                  <span className="text-lg font-semibold text-purple-400">
                    {formatNumber(category.total_views)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Avg Views/Post</span>
                  <span className="text-sm font-medium">
                    {Math.round(category.avg_views_per_post)}
                  </span>
                </div>
              </div>

              {/* View Share Bar */}
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all"
                    style={{ 
                      width: `${totalViews > 0 ? (category.total_views / totalViews * 100) : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {totalViews > 0 ? ((category.total_views / totalViews * 100).toFixed(1)) : 0}% of total views
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Category Posts Detail */}
        {selectedCategory && categoryPosts.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">
              Posts in {categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            
            <div className="space-y-4">
              {categoryPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/?post=${post.slug}`)}
                  className="cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all border border-white/10 hover:border-purple-500/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold flex-1">{post.title}</h3>
                    <button className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
                      View →
                    </button>
                  </div>
                  
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">👁️</span>
                      <span className="font-semibold text-purple-400">
                        {formatNumber(post.views_count || 0)} views
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>❤️</span>
                      <span>{post.likes_count || 0}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <span>{post.comments_count || 0}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>📅</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2">No Categories Yet</h2>
            <p className="text-gray-400">Categories will appear here once posts are categorized</p>
          </div>
        )}
      </main>
    </div>
  );
}
