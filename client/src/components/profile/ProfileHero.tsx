import {
  MapPin,
  Globe,
  Calendar,
  Pencil,
  Plus,
  Link as LinkIcon,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import type { UserProfile } from '../../services/api/users.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';

interface ProfileHeroProps {
  profile:       UserProfile;
  isSelf:        boolean;
  isFollowing:   boolean;
  canFollow:     boolean;
  onEdit:        () => void;
  onCompose:     () => void;
  onToggleFollow: () => void;
}

export const ProfileHero = ({
  profile,
  isSelf,
  isFollowing,
  canFollow,
  onEdit,
  onCompose,
  onToggleFollow,
}: ProfileHeroProps) => {
  const joinDate = new Date(profile.createdAt).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="relative -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="h-56 sm:h-72 overflow-hidden relative">
        {profile.coverImageUrl ? (
          <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-accent-blue/30 via-accent-purple/20 to-accent-pink/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-4 border-background overflow-hidden bg-surface-dark shadow-2xl flex-shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-white text-6xl font-black">
                {profile.name[0]}
              </div>
            )}
          </div>

          {/* Identity + actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {profile.name}
              </h1>
              <p className="text-gray-500 font-bold text-sm mt-1">
                @{profile.username}
                {profile.pronouns && (
                  <span className="ml-2 text-gray-600">· {profile.pronouns}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isSelf ? (
                <>
                  <button
                    onClick={onEdit}
                    className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Pencil size={14} /> Edit profile
                  </button>
                  <button
                    onClick={onCompose}
                    className="px-5 py-2.5 rounded-2xl bg-accent-pink text-white text-sm font-bold flex items-center gap-2 hover:bg-accent-pink/90"
                  >
                    <Plus size={14} /> New post
                  </button>
                </>
              ) : (
                <button
                  onClick={onToggleFollow}
                  disabled={!canFollow}
                  className={`px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-white/5 border border-white/10 text-white hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                      : 'bg-accent-blue text-white hover:bg-accent-blue/90'
                  }`}
                >
                  {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-6 max-w-2xl">
            <LinkifiedText className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap block">
              {profile.bio}
            </LinkifiedText>
          </div>
        )}

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-gray-500">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-accent-blue hover:underline"
            >
              <Globe size={14} /> {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> Joined {joinDate}
          </span>
          {profile.socialLinks?.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-accent-blue hover:underline capitalize"
            >
              <LinkIcon size={14} /> {s.platform}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
