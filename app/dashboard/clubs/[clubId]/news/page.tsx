"use client";

import { use, useState } from "react";
import { useNews } from "@/hooks/use-club-data";
import { useAuth } from "@/hooks/use-auth";
import { createNewsPost, deleteNewsPost, updateNewsPost } from "@/lib/firestore/news";
import { formatDate, initials } from "@/lib/utils";
import { Plus, Pin, Trash2, Edit3, X, Heart, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

function CreatePostModal({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const { user }      = useAuth();
  const [title,       setTitle]   = useState("");
  const [body,        setBody]    = useState("");
  const [imageUrl,    setImageUrl] = useState("");
  const [tags,        setTags]    = useState("");
  const [saving,      setSaving]  = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !user) return;
    setSaving(true);
    try {
      await createNewsPost(clubId, {
        clubId,
        title: title.trim(),
        body:  body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        authorId:   user.uid,
        authorName: user.displayName,
        publishedAt: Date.now(),
        updatedAt:   Date.now(),
        pinned:      false,
        likesCount:  0,
        dislikesCount: 0,
        viewsCount:  0,
      });
      toast.success("Post published.");
      onClose();
    } catch {
      toast.error("Failed to publish post.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">New Post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Post title" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Content</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Write your post…" rows={6} className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Image URL (optional)</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. tournament, cricket, update" className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || !body.trim()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">{saving ? "Publishing…" : "Publish"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }    = use(params);
  const { posts }     = useNews(clubId);
  const [showCreate,  setShowCreate] = useState(false);
  const [deleting,    setDeleting]   = useState<string | null>(null);

  const handleDelete = async (postId: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(postId);
    try {
      await deleteNewsPost(clubId, postId);
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePin = async (postId: string, pinned: boolean) => {
    try {
      await updateNewsPost(clubId, postId, { pinned: !pinned });
      toast.success(!pinned ? "Post pinned." : "Post unpinned.");
    } catch {
      toast.error("Failed to update post.");
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && <CreatePostModal clubId={clubId} onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">News</h1>
          <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Edit3 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No posts yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className={`rounded-xl border bg-card overflow-hidden hover:border-border/70 transition group ${post.pinned ? "border-primary/40" : "border-border"}`}>
              {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-36 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{post.title}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => handleTogglePin(post.id, post.pinned)} className={`p-1 rounded transition ${post.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(post.id, post.title)} disabled={deleting === post.id} className="p-1 rounded text-muted-foreground hover:text-destructive transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{post.body}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{formatDate(post.publishedAt)}</p>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post.likesCount}</span>
                    <span className="flex items-center gap-0.5"><ThumbsDown className="w-3 h-3" /> {post.dislikesCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
