/* eslint-disable @next/next/no-img-element -- post media can be a browser blob or user-managed Supabase URL */
import { CalendarDays, Eye, Heart, ImageIcon, MessageCircle, Play, Trash2 } from 'lucide-react';

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

export function StatCard({ label, value, icon: Icon, tone = 'blue', detail }) {
  return (
    <article className="dashboard-stat-card">
      <span className={`metric-icon metric-${tone}`}><Icon aria-hidden="true" size={19} /></span>
      <div><p>{typeof value === 'number' ? formatCount(value) : value}</p><h3>{label}</h3>{detail ? <span>{detail}</span> : null}</div>
    </article>
  );
}

export function PostCard({ deleting = false, post, onDelete, variant = 'list' }) {
  return (
    <article className={`post-card group post-card-${variant}`}>
      <div className="post-card-media">
        {post.media_url ? (
          post.media_type === 'video' ? <video className="size-full object-cover" src={post.media_url} muted playsInline /> : <img className="size-full object-cover" src={post.media_url} alt="" width="480" height="600" loading="lazy" />
        ) : post.media_type === 'video' ? <Play aria-hidden="true" size={28} fill="currentColor" /> : <ImageIcon aria-hidden="true" size={28} />}
      </div>
      <div className="post-card-content">
        <div className="post-card-heading">
          <Status status={post.status} />
          <span><CalendarDays aria-hidden="true" size={13} /> {formatDate(post.published_at || post.updated_at || post.created_at)}</span>
        </div>
        <h2>{post.title}</h2>
        <p>{post.caption}</p>
        {post.status === 'published' ? (
          <div className="post-card-metrics" aria-label="Post performance">
            <span><Eye aria-hidden="true" size={15} /><b>{formatCount(post.views_count)}</b> views</span>
            <span><Heart aria-hidden="true" size={15} /><b>{formatCount(post.likes_count)}</b> likes</span>
            <span><MessageCircle aria-hidden="true" size={15} /><b>{formatCount(post.comments_count)}</b> comments</span>
          </div>
        ) : (
          <span className="post-archived-note">This post is not visible in the patient feed.</span>
        )}
        {onDelete ? <div className="post-card-actions"><button disabled={deleting} type="button" onClick={() => onDelete(post)}><Trash2 aria-hidden="true" size={16} /> {deleting ? 'Deleting…' : 'Delete post'}</button></div> : null}
      </div>
    </article>
  );
}

export function Field({ label, hint, textarea = false, className = '', autoComplete = 'off', name, ...props }) {
  const Input = textarea ? 'textarea' : 'input';
  const inputName = name || label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-bold text-ink">{label}</span>
      <Input autoComplete={autoComplete} className={`form-control ${textarea ? 'min-h-28 resize-y' : ''}`} name={inputName} {...props} />
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="panel grid place-items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon aria-hidden="true" size={26} /></span>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function Status({ status }) {
  const labels = { published: 'Published', archived: 'Archived' };
  return <span className={`status status-${status}`}>{labels[status] || status}</span>;
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value));
}
