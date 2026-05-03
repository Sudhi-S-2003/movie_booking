import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Plus, X, AlertCircle, Sparkles } from 'lucide-react';
import { usersApi } from '../services/api/index.js';
import type { UserProfile, SocialLink } from '../services/api/users.api.js';
import { SEO } from '../components/common/SEO.js';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-pink';

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-2">
      {label}
      {hint && <span className="ml-2 text-gray-600 normal-case tracking-normal">— {hint}</span>}
    </label>
    {children}
  </div>
);

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 sm:p-8 backdrop-blur-sm">
    <div className="mb-6">
      <h2 className="text-lg font-black text-white flex items-center gap-2">
        <Sparkles size={16} className="text-accent-pink" /> {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export const ProfileEdit = () => {
  const { username } = useParams();
  const handle = username?.toLowerCase() ?? '';
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [form, setForm] = useState({
    name:          '',
    bio:           '',
    avatar:        '',
    coverImageUrl: '',
    location:      '',
    website:       '',
    pronouns:      '',
    phoneNumber:   '',
  });
  const [social, setSocial] = useState<SocialLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    usersApi
      .getProfile(handle)
      .then((res) => {
        if (cancelled) return;
        if (!res.isSelf) {
          setForbidden(true);
          return;
        }
        setProfile(res.user);
        setForm({
          name:          res.user.name,
          bio:           res.user.bio          ?? '',
          avatar:        res.user.avatar       ?? '',
          coverImageUrl: res.user.coverImageUrl ?? '',
          location:      res.user.location     ?? '',
          website:       res.user.website      ?? '',
          pronouns:      res.user.pronouns     ?? '',
          phoneNumber:   res.user.phoneNumber  ?? '',
        });
        setSocial(res.user.socialLinks ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Profile not found';
        setError(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      await usersApi.updateMe({ ...form, socialLinks: social });
      navigate(`/user/${profile.username}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-accent-blue animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">Not allowed</h1>
        <p className="text-gray-500 text-sm">You can only edit your own profile.</p>
        <Link to={`/user/${handle}`} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10">
          Back to profile
        </Link>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">Profile unavailable</h1>
        <p className="text-gray-500 text-sm">{error ?? 'Try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <SEO title="Edit Profile" description="Update your profile information, avatar, and social links." />
      {/* Header bar */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link
            to={`/user/${profile.username}`}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">
            Edit profile
          </h1>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-full bg-accent-pink text-white font-bold text-xs disabled:opacity-50 flex items-center gap-2"
          >
            <Check size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto mt-8 space-y-6"
      >
        {/* Avatar + cover preview */}
        <Section title="Avatar & cover" subtitle="Paste hosted image URLs.">
          <div className="relative h-40 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            {form.coverImageUrl ? (
              <img src={form.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent-blue/30 via-accent-purple/20 to-accent-pink/30" />
            )}
            <div className="absolute -bottom-8 left-6 w-20 h-20 rounded-2xl overflow-hidden border-4 border-background bg-surface-dark">
              {form.avatar ? (
                <img src={form.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-white text-3xl font-black">
                  {form.name[0] ?? '?'}
                </div>
              )}
            </div>
          </div>
          <div className="pt-10 grid sm:grid-cols-2 gap-4">
            <Field label="Avatar URL">
              <input value={form.avatar} onChange={onChange('avatar')} className={inputCls} />
            </Field>
            <Field label="Cover image URL">
              <input value={form.coverImageUrl} onChange={onChange('coverImageUrl')} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Identity */}
        <Section title="Identity">
          <Field label="Name">
            <input value={form.name} onChange={onChange('name')} className={inputCls} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Pronouns">
              <input
                value={form.pronouns}
                onChange={onChange('pronouns')}
                placeholder="she/her · he/him · they/them"
                className={inputCls}
              />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={onChange('location')} className={inputCls} />
            </Field>
          </div>
          <Field label="Phone">
            <input value={form.phoneNumber} onChange={onChange('phoneNumber')} className={inputCls} />
          </Field>
        </Section>

        {/* Bio */}
        <Section title="Bio" subtitle="Supports #hashtags and @mentions.">
          <textarea
            value={form.bio}
            onChange={onChange('bio')}
            rows={5}
            className={`${inputCls} resize-none`}
            placeholder="Tell the world what you love watching…"
          />
        </Section>

        {/* Website */}
        <Section title="Website">
          <Field label="URL">
            <input
              value={form.website}
              onChange={onChange('website')}
              placeholder="https://example.com"
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Social links repeater */}
        <Section title="Social links" subtitle="Add as many platforms as you like.">
          <div className="space-y-2">
            {social.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder="platform"
                  value={s.platform}
                  onChange={(e) =>
                    setSocial((prev) =>
                      prev.map((x, j) => (i === j ? { ...x, platform: e.target.value } : x)),
                    )
                  }
                  className={`${inputCls} w-32`}
                />
                <input
                  placeholder="https://…"
                  value={s.url}
                  onChange={(e) =>
                    setSocial((prev) =>
                      prev.map((x, j) => (i === j ? { ...x, url: e.target.value } : x)),
                    )
                  }
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => setSocial((prev) => prev.filter((_, j) => j !== i))}
                  className="p-2 rounded-xl text-gray-500 hover:text-red-500"
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSocial((s) => [...s, { platform: '', url: '' }])}
            className="text-xs text-accent-blue hover:underline flex items-center gap-1 mt-2"
          >
            <Plus size={12} /> Add link
          </button>
        </Section>

        {saveError && (
          <p className="text-red-400 text-sm text-center">{saveError}</p>
        )}

        {/* Footer save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to={`/user/${profile.username}`}
            className="px-5 py-2.5 rounded-full text-gray-400 hover:text-white font-bold text-sm"
          >
            Cancel
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-accent-pink text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Check size={14} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
