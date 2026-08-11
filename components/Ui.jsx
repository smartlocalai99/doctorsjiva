/* eslint-disable @next/next/no-img-element -- post media can be a browser blob or user-managed Supabase URL */
import { ImageIcon, Play, MoreHorizontal } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'blue' }) {
  return (
    <article className="panel min-w-0 p-4 sm:p-5">
      <span className={`metric-icon metric-${tone}`}><Icon size={19} /></span>
      <p className="mt-5 text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl">{formatCount(value)}</p>
      <p className="mt-1 text-xs font-semibold text-muted sm:text-sm">{label}</p>
    </article>
  );
}

export function PostCard({ post, onArchive }) {
  return (
    <article className="group grid grid-cols-[88px_1fr] gap-3 rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(29,57,76,0.08)] sm:grid-cols-[120px_1fr] sm:gap-4">
      <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-xl bg-media text-brand">
        {post.media_url ? (
          post.media_type === 'video' ? <video className="size-full object-cover" src={post.media_url} muted playsInline /> : <img className="size-full object-cover" src={post.media_url} alt="" />
        ) : post.media_type === 'video' ? <Play size={28} fill="currentColor" /> : <ImageIcon size={28} />}
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Status status={post.status} />
            <h2 className="mt-2 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{post.title}</h2>
          </div>
          {onArchive ? (
            <button className="icon-button shrink-0" type="button" onClick={() => onArchive(post)} aria-label={`Archive ${post.title}`}>
              <MoreHorizontal size={18} />
            </button>
          ) : null}
        </div>
        {post.status === 'published' ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
            <span>{formatCount(post.views_count)} views</span>
            <span>{formatCount(post.likes_count)} likes</span>
            <span>{formatCount(post.comments_count)} comments</span>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Saved {formatDate(post.updated_at || post.created_at)}</p>
        )}
      </div>
    </article>
  );
}

export function Field({ label, hint, textarea = false, className = '', ...props }) {
  const Input = textarea ? 'textarea' : 'input';
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-bold text-ink">{label}</span>
      <Input className={`form-control ${textarea ? 'min-h-28 resize-y' : ''}`} {...props} />
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="panel grid place-items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon size={26} /></span>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function Status({ status }) {
  const labels = { published: 'Published', draft: 'Draft', archived: 'Archived' };
  return <span className={`status status-${status}`}>{labels[status] || status}</span>;
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value));
}
