/* eslint-disable @next/next/no-img-element -- doctor media can be a user-managed Supabase URL */
import { BadgeCheck, Eye, Heart, MessageCircle, Plus } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';

import { EmptyState, PageHeading, PostCard, StatCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function DashboardPage() {
  const { profile, posts, loading, error, refresh } = useWorkspace();
  const published = posts.filter((post) => post.status === 'published');
  const totals = published.reduce(
    (result, post) => ({
      views: result.views + (post.views_count || 0),
      likes: result.likes + (post.likes_count || 0),
      comments: result.comments + (post.comments_count || 0),
    }),
    { views: 0, likes: 0, comments: 0 },
  );

  return (
    <>
      <Head><title>Home · DRJIVA Doctors</title></Head>
      <div className="page-container social-home">
        <PageHeading eyebrow="Doctor Studio" title={`Hello, ${profile?.display_name?.replace('Dr. ', '') || 'Doctor'}`} description="Publish trusted health guidance directly to the patient feed." action={<Link className="primary-button" href="/create"><Plus aria-hidden="true" size={18} /> Create Post</Link>} />

        {error ? <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try Again</button></div> : null}

        <section className="doctor-social-card">
          <div className="doctor-story-ring"><Avatar profile={profile} /></div>
          <div className="doctor-social-copy">
            <h2>{profile?.display_name || 'Dr. Ritish Reddy'} <BadgeCheck aria-hidden="true" size={18} fill="currentColor" /></h2>
            <p>{profile?.specialty || 'Gastroenterology'} · {profile?.hospital_name || 'Asian Hospitals'}</p>
            <span>{profile?.experience_years || 8} years of experience</span>
          </div>
          <div className="profile-social-metrics">
            <Metric value={published.length} label="posts" />
            <Metric value={profile?.follower_count || 0} label="followers" compact />
            <Metric value={totals.likes} label="likes" compact />
          </div>
          <Link className="secondary-button profile-edit-button" href="/profile">Edit Profile</Link>
        </section>

        <section className="creator-feature-grid">
          {published[0] ? <FeedPreview post={published[0]} profile={profile} /> : (
            <EmptyState icon={Plus} title="No Published Posts Yet" description="Create your first image or video post. It will appear in the patient feed immediately." action={<Link className="primary-button" href="/create">Create First Post</Link>} />
          )}

          <aside className="creator-insights">
            <div className="section-heading"><h2>Performance</h2><span>Published Content</span></div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Views" value={totals.views} icon={Eye} />
              <StatCard label="Likes" value={totals.likes} icon={Heart} tone="rose" />
              <StatCard label="Comments" value={totals.comments} icon={MessageCircle} tone="violet" />
            </div>
            <Link className="create-prompt-card" href="/create"><span><Plus aria-hidden="true" size={22} /></span><div><strong>Share a Health Update</strong><small>Publish an image or short video</small></div></Link>
          </aside>
        </section>

        <section aria-labelledby="recent-heading">
          <div className="section-heading"><h2 id="recent-heading">Recent Posts</h2><Link href="/posts">Open Library</Link></div>
          {loading ? <LoadingRows /> : published.length ? (
            <div className="grid gap-3 xl:grid-cols-2">{published.slice(0, 4).map((post) => <PostCard key={post.id} post={post} />)}</div>
          ) : <p className="text-sm text-muted">Published posts will appear here.</p>}
        </section>
      </div>
    </>
  );
}

function FeedPreview({ post, profile }) {
  return (
    <article className="feed-preview-card">
      {post.media_type === 'video' ? <video className="feed-preview-media" src={post.media_url} muted loop autoPlay playsInline /> : <img className="feed-preview-media" src={post.media_url} alt="" width="720" height="1120" />}
      <div className="feed-preview-shade" />
      <div className="feed-preview-copy"><span className="preview-kicker">Published</span><h2>{post.title}</h2><p>{post.caption}</p></div>
      <div className="feed-preview-doctor"><span>{initials(profile?.display_name)}</span><div><strong>{profile?.display_name} <BadgeCheck aria-hidden="true" size={13} fill="currentColor" /></strong><small>{profile?.specialty}</small></div></div>
      <div className="feed-preview-actions"><span><Heart aria-hidden="true" size={23} />{formatCount(post.likes_count)}</span><span><MessageCircle aria-hidden="true" size={23} />{formatCount(post.comments_count)}</span><span><Eye aria-hidden="true" size={23} />{formatCount(post.views_count)}</span></div>
    </article>
  );
}

function Avatar({ profile }) {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" width="80" height="80" />;
  return <span>{initials(profile?.display_name)}</span>;
}

function initials(name = 'Doctor') {
  return name.replace('Dr. ', '').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function Metric({ value, label, compact = false }) {
  return <div><strong>{compact ? formatCount(value) : value}</strong><span>{label}</span></div>;
}

function LoadingRows() {
  return <div className="grid gap-3 xl:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}
