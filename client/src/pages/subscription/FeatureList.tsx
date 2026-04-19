import { Check } from 'lucide-react';

type Category = 'limits' | 'speed' | 'extras';

/**
 * Heuristic: inspect the feature copy and bucket it into one of three
 * categories so each line can wear an intentional accent tint.
 *
 * This is a text-match hack (the server doesn't tag features) — new feature
 * strings will fall through to "extras" until someone adds a keyword here.
 * Worth it because a truly generic list reads as visual noise.
 */
const categorize = (text: string): Category => {
  const t = text.toLowerCase();
  if (
    t.includes('token') ||
    t.includes('limit') ||
    t.includes('/day')  ||
    t.includes('/month') ||
    t.includes('per day') ||
    t.includes('per month') ||
    t.includes('daily') ||
    t.includes('monthly')
  ) return 'limits';
  if (
    t.includes('priority') ||
    t.includes('speed')    ||
    t.includes('fast')     ||
    t.includes('queue')    ||
    t.includes('latenc')
  ) return 'speed';
  return 'extras';
};

const tint: Record<Category, string> = {
  limits: 'text-accent-blue',
  speed:  'text-accent-pink',
  extras: 'text-emerald-400',
};

export const FeatureList = ({ features, max = 6 }: {
  features: readonly string[];
  max?:     number;
}) => (
  <ul className="space-y-2 mb-5 flex-1">
    {features.slice(0, max).map((f) => {
      const cat = categorize(f);
      return (
        <li
          key={f}
          className="flex items-start gap-2 text-[11px] sm:text-[12px] font-bold text-white/65"
        >
          <Check size={12} className={`${tint[cat]} mt-0.5 shrink-0`} />
          <span>{f}</span>
        </li>
      );
    })}
  </ul>
);
