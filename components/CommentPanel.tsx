"use client";
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CommentPanelProps {
  postId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

interface Comment {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

export default function CommentPanel({ postId, onClose, onCommentAdded }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
    
    // Get username from localStorage
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !username.trim()) return;

    setIsSubmitting(true);

    // Save username to localStorage
    localStorage.setItem('username', username);

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        username: username.trim(),
        content: newComment.trim(),
      });

    if (!error) {
      // Update comments count
      await supabase.rpc('increment_comments_count', { post_id: postId });
      
      setNewComment('');
      fetchComments();
      onCommentAdded();
    }

    setIsSubmitting(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="fixed inset-0 z-[30000] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-[#0a0e1a] rounded-t-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">💬</p>
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {comment.username[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">
                      {comment.username}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-[#0f1320]">
          {!username && (
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name..."
              className="w-full mb-2 px-4 py-2 bg-[#1a1f2e] text-white rounded-full outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={30}
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 bg-[#1a1f2e] text-white rounded-full outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={500}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || !username.trim() || isSubmitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
