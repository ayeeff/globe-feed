"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Make sure this path matches where you put the client
import CustomVisual from '../components/CustomVisual';

export default function Home() {
  // We use <any[]> here to tell TypeScript "Don't worry about the data shape"
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      // 1. Fetch the data from Supabase
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error("Error fetching posts:", error);
      if (data) setPosts(data);
    }
    fetchPosts();
  }, []);

  return (
    <main className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory">
      {posts.map((post: any) => (
        <div key={post.id} className="h-screen w-full snap-start relative border-b border-gray-800">
          
          {/* RENDER CUSTOM VISUAL IF TYPE IS 'CUSTOM' */}
          {post.type === 'custom' ? (
             <CustomVisual 
               css={post.custom_css} 
               html={post.custom_html} 
               scriptContent={post.custom_script} 
             />
          ) : (
            // Fallback for other types
            <div className="flex items-center justify-center h-full text-white">
                <h1 className="text-2xl font-bold">{post.title}</h1>
            </div>
          )}
          
        </div>
      ))}
    </main>
  );
}