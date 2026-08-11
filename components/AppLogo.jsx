import { Stethoscope } from 'lucide-react';

export function AppLogo({ compact = false, inverse = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${compact ? 'size-10 rounded-xl' : 'size-12 rounded-2xl'} grid place-items-center ${inverse ? 'bg-white/12 text-white' : 'bg-brand-soft text-brand'}`}>
        <Stethoscope size={compact ? 22 : 26} strokeWidth={2.3} />
      </span>
      <span className="leading-none">
        <strong className={`${compact ? 'text-lg' : 'text-xl'} block tracking-[-0.04em] ${inverse ? 'text-white' : 'text-ink'}`}>DRJIVA</strong>
        <span className={`mt-1 block text-[11px] font-semibold tracking-[0.16em] uppercase ${inverse ? 'text-white/60' : 'text-muted'}`}>Doctor studio</span>
      </span>
    </div>
  );
}
