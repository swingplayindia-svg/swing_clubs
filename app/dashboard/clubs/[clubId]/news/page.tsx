"use client";

import { use, useEffect, useState } from "react";
import { useNews } from "@/hooks/use-club-data";
import { useAuth } from "@/hooks/use-auth";
import { createNewsPost, deleteNewsPost, updateNewsPost } from "@/lib/firestore/news";
import { NewsImageUpload } from "@/components/news/news-image-upload";
import { formatDate } from "@/lib/utils";
import type { NewsPost } from "@/lib/schemas/news";
import { Plus, Pin, Trash2, Edit3, X, Heart, ThumbsDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

function PostModal({
  clubId,
  post,
  onClose,
}: {
  clubId: string;
  post?: NewsPost;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const isEdit = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(post?.imageUrl ?? null);
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setBody(post.body);
    setImageUrl(post.imageUrl ?? null);
    setTags(post.tags?.join(", ") ?? "");
    setPinned(post.pinned);
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !user || imageUploading) return;
    setSaving(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const imagePayload = imageUrl?.trim() || null;
      if (isEdit && post) {
        await updateNewsPost(clubId, post.id, {
          title: title.trim(),
          body: body.trim(),
          imageUrl: imagePayload,
          tags: tagList,
          pinned,
        });
        toast.success("Post updated.");
      } else {
        await createNewsPost(clubId, {
          clubId,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imagePayload || undefined,
          tags: tagList,
          authorId: user.uid,
          authorName: user.displayName,
          publishedAt: Date.now(),
          updatedAt: Date.now(),
          pinned,
          likesCount: 0,
          dislikesCount: 0,
          viewsCount: 0,
        });
        toast.success("Post published.");
      }
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update post." : "Failed to publish post.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? "Edit Post" : "New Post"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Post title"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder="Write your post…"
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Cover image
            </label>
            <NewsImageUpload
              clubId={clubId}
              postId={post?.id}
              value={imageUrl ?? undefined}
              onChange={setImageUrl}
              onUploadingChange={setImageUploading}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. tournament, cricket, update"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">Pin to top of feed</span>
          </label>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || imageUploading || !title.trim() || !body.trim()}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { posts } = useNews(clubId);
  const [modal, setModal] = useState<"create" | NewsPost | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (post: NewsPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(post.id);
    try {
      await deleteNewsPost(clubId, post.id);
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePin = async (post: NewsPost) => {
    try {
      await updateNewsPost(clubId, post.id, { pinned: !post.pinned });
      toast.success(post.pinned ? "Post unpinned." : "Post pinned.");
    } catch {
      toast.error("Failed to update post.");
    }
  };

  return (
    <div className="space-y-6">
      {modal === "create" && <PostModal clubId={clubId} onClose={() => setModal(null)} />}
      {modal && modal !== "create" && <PostModal clubId={clubId} post={modal} onClose={() => setModal(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">News</h1>
          <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Edit3 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No posts yet</p>
          <button
            type="button"
            onClick={() => setModal("create")}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className={`rounded-xl border bg-card overflow-hidden flex flex-col ${post.pinned ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
            >
              {post.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.imageUrl} alt={post.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    {post.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{post.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{post.body}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                  <span>{formatDate(post.publishedAt)}</span>
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post.likesCount}</span>
                    <span className="flex items-center gap-0.5"><ThumbsDown className="w-3 h-3" /> {post.dislikesCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setModal(post)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTogglePin(post)}
                    className={`p-1.5 rounded-lg border border-border transition ${post.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"}`}
                    title={post.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    disabled={deleting === post.id}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-loss hover:border-loss/30 hover:bg-loss/5 transition disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
