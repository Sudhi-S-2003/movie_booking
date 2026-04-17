import { ProfilePostCard } from './ProfilePostCard.js';
import type { Post } from '../../services/api/posts.api.js';

interface BookmarkedPostCardProps {
  post:       Post;
  canInteract: boolean;
  onLike:     (id: string) => void;
  onBookmark: (id: string) => void;
}

export const BookmarkedPostCard = ({
  post,
  canInteract,
  onLike,
  onBookmark,
}: BookmarkedPostCardProps) => (
  <ProfilePostCard
    post={post}
    isSelf={false}
    canInteract={canInteract}
    onLike={onLike}
    onBookmark={onBookmark}
  />
);
