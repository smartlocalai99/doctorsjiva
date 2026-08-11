/* eslint-disable @next/next/no-img-element -- doctor photos are user-managed URLs */
import { BadgeCheck, Eye, Heart, MessageCircle, MoreHorizontal, Play, Plus } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';

import { EmptyState, PageHeading, PostCard, StatCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function DashboardPage() {
  const { profile, posts, loading, error, refresh } = useWorkspace();
  const visiblePosts = posts.filter((post) => post.status !== 'archived');
  const published = visiblePosts.filter((post) => post.status === 'published');
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
      <Head><title>Creator home · DRJIVA Doctors</title></Head>
      <div className="page-container social-home">
        <PageHeading eyebrow="Creator home" title={`Hello, ${profile?.display_name?.replace('Dr. ', '') || 'Doctor'}`} description="Publish useful digestive-health guidance and see what patients respond to." action={<Link className="primary-button" href="/create"><Plus size={18} /> Create</Link>} />

        {error ? <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div> : null}

        <section className="doctor-social-card">
          <div className="doctor-story-ring"><Avatar profile={profile} /></div>
          <div className="doctor-social-copy">
            <h2>{profile?.display_name || 'Dr. Ritish Reddy'} <BadgeCheck size={18} fill="currentColor" /></h2>
            <p>{profile?.specialty || 'Gastroenterology'} · {profile?.hospital_name || 'Asian Hospitals'}</p>
            <span>{profile?.experience_years || 8} years experience</span>
          </div>
          <div className="profile-social-metrics">
            <Metric value={published.length} label="posts" />
            <Metric value={profile?.follower_count || 0} label="followers" compact />
            <Metric value={totals.likes} label="likes" compact />
          </div>
          <Link className="secondary-button profile-edit-button" href="/profile">Edit profile</Link>
        </section>

        <section className="creator-feature-grid">
          <article className="feed-preview-card">
            <div className="feed-preview-top"><span>Patient feed preview</span><MoreHorizontal size={20} /></div>
            <div className="feed-preview-copy">
              <span className="preview-kicker">DRJIVA · GUT HEALTH</span>
              <h2>3 signs your gut needs more attention.</h2>
              <p>Save this for your next health check.</p>
            </div>
            <div className="feed-preview-doctor"><span>RR</span><div><strong>Dr. Ritish Reddy <BadgeCheck size={13} fill="currentColor" /></strong><small>Gastroenterology</small></div></div>
            <div className="feed-preview-actions"><span><Heart size={23} fill="white" />3.2K</span><span><MessageCircle size={23} fill="white" />186</span><span><Play size={23} fill="white" />18K</span></div>
          </article>

          <aside className="creator-insights">
            <div className="section-heading"><h2>Content performance</h2><span>Last 30 days</span></div>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <StatCard label="Views" value={totals.views} icon={Eye} />
              <StatCard label="Likes" value={totals.likes} icon={Heart} tone="rose" />
              <StatCard label="Comments" value={totals.comments} icon={MessageCircle} tone="violet" />
            </div>
            <Link className="create-prompt-card" href="/create"><span><Plus size={22} /></span><div><strong>Share your next health note</strong><small>Image or short video</small></div></Link>
          </aside>
        </section>

        <section aria-labelledby="recent-heading">
          <div className="section-heading"><h2 id="recent-heading">Recent posts</h2><Link href="/posts">See library</Link></div>
          {loading ? <LoadingRows /> : visiblePosts.length ? (
            <div className="grid gap-3 xl:grid-cols-2">{visiblePosts.slice(0, 4).map((post) => <PostCard key={post.id} post={post} />)}</div>
          ) : (
            <EmptyState icon={Plus} title="Create your first post" description="Your drafts and published health guidance will appear here." action={<Link className="primary-button" href="/create">Create post</Link>} />
          )}
        </section>
      </div>
    </>
  );
}

function Avatar({ profile }) {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" />;
  return <span>RR</span>;
}

function Metric({ value, label, compact = false }) {
  const formatted = compact ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : value;
  return <div><strong>{formatted}</strong><span>{label}</span></div>;
}

function LoadingRows() {
  return <div className="grid gap-3 xl:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}
