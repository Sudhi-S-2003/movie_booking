import { useState, useEffect, useImperativeHandle, memo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/api/auth.api.js';

export interface CaptchaRef {
  refresh: () => void;
}

interface CaptchaProps {
  onTokenChange: (token: string) => void;
  value: string;
  onChange: (value: string) => void;
  ref?: React.Ref<CaptchaRef>;
}

export const Captcha = memo(({ onTokenChange, value, onChange, ref }: CaptchaProps) => {
  const [captchaSvg, setCaptchaSvg] = useState('');

  const fetchCaptcha = async () => {
    try {
      const res = await authApi.getCaptcha();
      if (res.captchaSvg) {
        setCaptchaSvg(res.captchaSvg);
        onTokenChange(res.captchaToken);
        onChange(''); // clear text on refresh
      }
    } catch (err) {
      console.error('Failed to load captcha', err);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchCaptcha
  }));

  if (!captchaSvg) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck size={13} className="text-accent-blue animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
          Security Check
        </span>
      </div>

      <div className="flex items-center gap-3 bg-[#141416]/40 border border-white/5 rounded-[22px] p-2.5">
        <img 
          src={captchaSvg} 
          alt="Security Check"
          className="rounded-[14px] bg-[#0a0f1d] border border-white/5 select-none cursor-pointer active:scale-98 transition-transform"
          title="Click to change verification code"
          onClick={fetchCaptcha}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          width="150"
          height="50"
        />
        
        <div className="flex-1 flex flex-col justify-center">
          <button
            type="button"
            onClick={fetchCaptcha}
            className="text-[10px] font-extrabold uppercase tracking-widest text-accent-blue hover:text-accent-pink transition-colors text-left pl-1"
          >
            Refresh
          </button>
          <span className="text-[9px] text-gray-600 font-medium pl-1 mt-0.5 leading-none">
            Can't read? Click to reload
          </span>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <ShieldCheck className="text-gray-600 group-focus-within:text-accent-pink transition-colors" size={17} />
        </div>
        <input
          type="text"
          placeholder="Enter security code"
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full bg-[#1c1c21] border border-white/5 rounded-[20px] py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-accent-pink/30 transition-all font-bold shadow-inner text-sm uppercase tracking-wider"
        />
      </div>
    </motion.div>
  );
});

Captcha.displayName = 'Captcha';
