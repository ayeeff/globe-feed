"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import CustomVisual from '../../../components/CustomVisual';

export default function EmbedPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('type', 'custom')
        .single();

      if (error) {
        console.error("Error fetching post:", error);
        setLoading(false);
        return;
      }
      
      if (data) {
        setPost(data);
        setLoading(false);
      }
    }
    fetchPost();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-2xl font-bold mb-2">Visualization Not Found</h1>
          <p className="text-gray-400">The visualization you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      <CustomVisual 
        css={post.custom_css} 
        html={post.custom_html} 
        scriptContent={post.custom_script}
        isActive={true}
      />
      
      {/* Watermark / Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-[20000] pointer-events-none">
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h2 className="text-white text-lg font-bold drop-shadow-lg">
            {post.title}
          </h2>
          {post.description && (
            <p className="text-white/80 text-sm drop-shadow-lg">
              {post.description}
            </p>
          )}
        </div>
      </div>

      {/* Branding Link */}
      <a
        href={`${window.location.origin}/?post=${post.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 z-[20000] px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-semibold hover:bg-black/70 transition flex items-center gap-2"
      >
        <span>🌍</span>
        <span>View Full Site</span>
      </a>
    </div>
  );
}
