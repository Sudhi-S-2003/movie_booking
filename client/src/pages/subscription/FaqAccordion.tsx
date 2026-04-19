import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Coins, Zap, Clock, Repeat, CreditCard, Tag, XCircle, HelpCircle,
  type LucideIcon,
} from 'lucide-react';

interface FaqItem {
  q:        string;
  a:        string;
  icon:     LucideIcon;
  category: 'usage' | 'billing' | 'plans';
}

const FAQS: readonly FaqItem[] = [
  {
    category: 'usage',
    icon:     Coins,
    q: "What's a token and how is it counted?",
    a: "A token is a small chunk of text — roughly 4 characters. We count tokens from both the prompt you send AND the model's reply. \"Hi\" costs about 1 token; a 300-word answer is closer to 400. Every send-message response returns your remaining balance so you can budget in real time.",
  },
  {
    category: 'usage',
    icon:     Clock,
    q: 'When exactly do my tokens refill?',
    a: 'Daily tokens reset at 12:00 AM UTC. Weekly tokens reset Sunday 00:00 UTC. Monthly tokens are a 30-day rolling window — they refill 30 days after your last reset, not on the 1st of the calendar month. The exact next-reset time is shown under each bucket on this page.',
  },
  {
    category: 'usage',
    icon:     Zap,
    q: 'What happens when I run out of tokens?',
    a: 'Sending a message that exceeds any bucket returns a 402 "Token limit reached" error and the message is not persisted. You can wait for the next rollover, upgrade to a plan with more headroom, or for quick relief, upgrade to Pro Max which has no daily cap.',
  },
  {
    category: 'plans',
    icon:     Repeat,
    q: "What's the difference between Pro and Pro Max?",
    a: 'Pro has a 20,000-token daily cap (to discourage runaway scripts) plus a 500,000-token monthly pool. Pro Max drops the daily cap entirely — burst as hard as you want inside a 2,000,000-token monthly pool. If you batch-process content, Pro Max is the cleaner fit.',
  },
  {
    category: 'plans',
    icon:     HelpCircle,
    q: "When should I pick Enterprise?",
    a: "If 2M tokens per month isn't enough, or you need a contract longer than 3 months, Enterprise lets you dial in both the monthly limit and the duration (1–12 months). The price scales linearly from ₹0.0007/token/month with longer-duration discounts (5% at 3 mo, 10% at 6 mo, 15% at 12 mo).",
  },
  {
    category: 'billing',
    icon:     CreditCard,
    q: 'Monthly vs. Quarterly billing — which wins?',
    a: "Quarterly costs 10% less per month than Monthly on the same plan, and your monthly pool still refills every 30 days — you just prepay three of them. If you're confident you'll use the plan for more than a month, Quarterly is almost always cheaper.",
  },
  {
    category: 'billing',
    icon:     Tag,
    q: 'How do the welcome offers work?',
    a: 'Your first paid plan — any plan, any cycle — gets 60% off. The second gets 50% off. After that, standard pricing applies. The discount is computed server-side at checkout, so the final price on the card is exactly what you pay.',
  },
  {
    category: 'billing',
    icon:     XCircle,
    q: 'Can I cancel anytime?',
    a: "Yes. Cancelling stops the next renewal — you keep access through the end of the cycle you already paid for. No prorated refunds, no lock-in. If you change your mind before the cycle ends, just re-upgrade; the plan stays active without a gap.",
  },
] as const;

const CATEGORY_LABELS: Record<FaqItem['category'], string> = {
  usage:   'Usage',
  billing: 'Billing',
  plans:   'Plans',
};

const CATEGORY_ACCENT: Record<FaqItem['category'], string> = {
  usage:   'text-accent-blue',
  billing: 'text-accent-pink',
  plans:   'text-emerald-400',
};

// ── Accordion row ───────────────────────────────────────────────────────────

const FaqItemRow = ({ item, open, onToggle }: {
  item:     FaqItem;
  open:     boolean;
  onToggle: () => void;
}) => {
  const Icon = item.icon;
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start gap-3 py-4 text-left group"
      >
        <span className={`mt-0.5 shrink-0 ${CATEGORY_ACCENT[item.category]}`}>
          <Icon size={14} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[10px] font-black uppercase tracking-[0.25em] mb-0.5 ${CATEGORY_ACCENT[item.category]}`}>
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="block text-[13px] sm:text-[14px] font-black text-white group-hover:text-accent-pink transition-colors leading-snug">
            {item.q}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="shrink-0 mt-1 text-white/40 group-hover:text-white/80"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 pl-7 pr-8 text-[12px] sm:text-[13px] font-medium text-white/60 leading-relaxed">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Accordion ───────────────────────────────────────────────────────────────

export const FaqAccordion = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">FAQ</span>
          <h2 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">
            Answers before you ask
          </h2>
        </div>
        <a
          href="mailto:support@moveai.com"
          className="text-[11px] font-bold text-white/50 hover:text-white transition-colors"
        >
          Didn't find it? support@moveai.com →
        </a>
      </div>

      {/*
        Two-column on lg+ so the accordion doesn't feel endless; single column
        below. openIdx is shared across both columns since we identify by index.
      */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
        {FAQS.map((item, i) => (
          <FaqItemRow
            key={item.q}
            item={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      </div>
    </section>
  );
};
