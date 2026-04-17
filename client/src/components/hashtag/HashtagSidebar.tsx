import { Link } from 'react-router-dom';
import { Hash, Sparkles, TrendingUp } from 'lucide-react';
import type { Hashtag, RelatedHashtag } from '../../services/api/hashtags.api.js';

interface HashtagSidebarProps {
  related:  RelatedHashtag[];
  trending: Hashtag[];
}

const SidebarCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-5 backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-4 text-gray-500">
      {icon}
      <h3 className="text-xs font-black uppercase tracking-[0.25em]">{title}</h3>
    </div>
    {children}
  </div>
);

export const HashtagSidebar = ({ related, trending }: HashtagSidebarProps) => (
  <aside className="space-y-6">
    <SidebarCard title="Related hashtags" icon={<Sparkles size={14} />}>
      {related.length === 0 ? (
        <p className="text-gray-500 text-sm">No co-occurrences yet.</p>
      ) : (
        <ul className="space-y-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                to={`/hashtag/${r.slug}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Hash size={14} style={{ color: r.color }} />
                  <span className="text-white font-bold text-sm group-hover:text-accent-pink transition-colors">
                    {r.name}
                  </span>
                </span>
                <span className="text-xs text-gray-500">{r.postCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidebarCard>

    <SidebarCard title="Trending now" icon={<TrendingUp size={14} />}>
      {trending.length === 0 ? (
        <p className="text-gray-500 text-sm">Quiet on the frontier.</p>
      ) : (
        <ol className="space-y-3">
          {trending.map((t, i) => (
            <li key={t._id}>
              <Link to={`/hashtag/${t.slug}`} className="flex items-center gap-3 group">
                <span className="w-6 text-gray-500 font-black text-sm">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate group-hover:text-accent-pink transition-colors">
                    #{t.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.postCount} posts · {t.followerCount} followers
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </SidebarCard>
  </aside>
);
