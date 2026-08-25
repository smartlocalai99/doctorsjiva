import Image from 'next/image';

export function AppLogo({ compact = false, inverse = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${compact ? 'size-12' : 'size-14'} grid shrink-0 place-items-center`}>
        <Image alt="" className="size-full object-contain" height={56} src="/icons/drjiva-mark.png" width={56} />
      </span>
      <span className="leading-none">
        <strong className={`${compact ? 'text-lg' : 'text-xl'} block tracking-[-0.04em] ${inverse ? 'text-white' : 'text-ink'}`}>DRJIVA</strong>
        <span className={`mt-1 block text-[11px] font-semibold tracking-[0.16em] uppercase ${inverse ? 'text-white/60' : 'text-muted'}`}>Doctor studio</span>
      </span>
    </div>
  );
}
