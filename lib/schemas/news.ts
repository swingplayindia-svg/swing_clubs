export interface NewsPost {
  id: string;
  clubId: string;
  title: string;
  body: string;
  imageUrl?: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  publishedAt: number;
  updatedAt: number;
  pinned: boolean;
  scheduledAt?: number;
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
}
