/* eslint-disable @next/next/no-img-element -- doctor media and avatars are user-managed Supabase URLs */
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bookmark,
  ChevronRight,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';

import { EmptyState, StatCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const profileFields = ['display_name', 'specialty', 'qualifications', 'hospital_name', 'experience_years', 'city', 'bio', 'avatar_url'];

export default function DashboardPage() {
  const { profile, posts, loading, error, refresh } = useWorkspace();
  const published = posts.filter((post) => post.status === 'published');
  const totals = published.reduce(
    (result, post) => ({
      views: result.views + Number(post.views_count || 0),
      likes: result.likes + Number(post.likes_count || 0),
      comments: result.comments + Number(post.comments_count || 0),
      saves: result.saves + Number(post.saves_count || 0),
    }),
    { views: 0, likes: 0, comments: 0, saves: 0 },
  );
  const interactions = totals.likes + totals.comments + totals.saves;
  const engagement = totals.views ? (interactions / totals.views) * 100 : 0;
  const averageViews = published.length ? Math.round(totals.views / published.length) : 0;
  const completedFields = profileFields.filter((field) => Boolean(profile?.[field])).length;
  const profileCompletion = Math.round((completedFields / profileFields.length) * 100);
  const recentPosts = published.slice(0, 4);
  const topPost = published.reduce((best, post) => (
    !best || Number(post.views_count || 0) > Number(best.views_count || 0) ? post : best
  ), null);

  return (
    <>
      <Head><title>Dashboard · DRJIVA Doctors</title></Head>
      <div className="page-container doctor-dashboard">
        <DashboardHeader profile={profile} />

        {error ? <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div> : null}

        <section className="dashboard-publish-card" aria-labelledby="publish-heading">
          <div className="dashboard-publish-copy">
            <span className="publish-symbol"><Sparkles aria-hidden="true" size={20} /></span>
            <div>
              <p>Patient education studio</p>
              <h2 id="publish-heading">Turn your expertise into clear health guidance.</h2>
              <span>Share an image or short video. Your post appears in the Dr Jiva health feed immediately.</span>
            </div>
            <Link className="dashboard-publish-button" href="/create"><Plus aria-hidden="true" size={18} /> Create a post</Link>
          </div>
          <div className="profile-completion-card">
            <div className="profile-completion-top">
              <span>Profile strength</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <div className="profile-progress-track" aria-label={`${profileCompletion}% profile complete`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={profileCompletion}>
              <i style={{ width: `${profileCompletion}%` }} />
            </div>
            <p>{profileCompletion === 100 ? 'Your public doctor profile is complete.' : 'Complete your details so patients know who is guiding them.'}</p>
            <Link href="/profile">Review profile <ChevronRight aria-hidden="true" size={15} /></Link>
          </div>
        </section>

        <section aria-labelledby="reach-heading">
          <div className="dashboard-section-heading">
            <div><p>All-time performance</p><h2 id="reach-heading">Your content reach</h2></div>
            <span>{published.length} published {published.length === 1 ? 'post' : 'posts'}</span>
          </div>
          <div className="dashboard-metric-grid">
            <StatCard label="Total views" value={totals.views} icon={Eye} detail={`${formatCount(averageViews)} average per post`} />
            <StatCard label="Likes" value={totals.likes} icon={Heart} tone="rose" detail="Patient appreciation" />
            <StatCard label="Comments" value={totals.comments} icon={MessageCircle} tone="violet" detail="Patient conversations" />
            <StatCard label="Saves" value={totals.saves} icon={Bookmark} tone="amber" detail="Patients returning later" />
            <StatCard label="Engagement" value={`${formatPercent(engagement)}%`} icon={BarChart3} tone="green" detail="Likes, comments and saves per view" />
          </div>
        </section>

        <div className="dashboard-content-grid">
          <section className="dashboard-content-panel" aria-labelledby="recent-heading">
            <div className="dashboard-panel-heading">
              <div><p>Content library</p><h2 id="recent-heading">Recent posts</h2></div>
              <Link href="/posts">Manage all <ArrowUpRight aria-hidden="true" size={16} /></Link>
            </div>
            {loading ? <LoadingRows /> : recentPosts.length ? (
              <div className="dashboard-post-list">
                {recentPosts.map((post) => <PerformancePost key={post.id} post={post} />)}
              </div>
            ) : (
              <EmptyState icon={FileText} title="Your content library is ready" description="Publish your first health update to start building reach with patients." action={<Link className="primary-button" href="/create">Create first post</Link>} />
            )}
          </section>

          <aside className="dashboard-side-stack">
            <section className="dashboard-doctor-card">
              <DoctorAvatar profile={profile} />
              <div className="dashboard-doctor-name"><h2>{profile?.display_name || 'Doctor'}</h2><BadgeCheck aria-label="Verified doctor" fill="currentColor" size={18} /></div>
              <p>{profile?.specialty || 'Add specialty'}</p>
              <span>{profile?.hospital_name || 'Add hospital'}{profile?.city ? ` · ${profile.city}` : ''}</span>
              <dl>
                <div><dt>Experience</dt><dd>{profile?.experience_years || 0} years</dd></div>
                <div><dt>Followers</dt><dd>{formatCount(profile?.follower_count || 0)}</dd></div>
              </dl>
              <Link className="secondary-button" href="/profile"><UserRound aria-hidden="true" size={17} /> Edit professional profile</Link>
            </section>

            <section className="top-content-card">
              <span><BarChart3 aria-hidden="true" size={18} /></span>
              <p>Top content</p>
              {topPost ? <><h2>{topPost.title}</h2><small>{formatCount(topPost.views_count)} views · {formatCount(topPost.likes_count)} likes</small></> : <><h2>No performance data yet</h2><small>Your most-viewed post will appear here.</small></>}
              <Link href="/posts">View content insights <ChevronRight aria-hidden="true" size={15} /></Link>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function DashboardHeader({ profile }) {
  const displayName = profile?.display_name?.replace(/^Dr\.\s*/i, '') || 'Doctor';
  return (
    <header className="dashboard-welcome">
      <div>
        <p suppressHydrationWarning>{getGreeting()}</p>
        <h1>Dr. {displayName}</h1>
        <span suppressHydrationWarning>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
      </div>
      <Link className="dashboard-header-profile" href="/profile" aria-label="Open doctor profile">
        <DoctorAvatar profile={profile} compact />
      </Link>
    </header>
  );
}

function PerformancePost({ post }) {
  return (
    <article className="performance-post">
      <div className="performance-post-media">
        {post.media_url ? (
          post.media_type === 'video' ? <video src={post.media_url} muted playsInline /> : <img src={post.media_url} alt="" width="112" height="112" loading="lazy" />
        ) : <FileText aria-hidden="true" size={24} />}
      </div>
      <div className="performance-post-copy">
        <div><span>Published {formatDate(post.published_at || post.created_at)}</span><h3>{post.title}</h3></div>
        <div className="performance-post-metrics" aria-label="Post performance">
          <span><Eye aria-hidden="true" size={14} /> {formatCount(post.views_count)}</span>
          <span><Heart aria-hidden="true" size={14} /> {formatCount(post.likes_count)}</span>
          <span><MessageCircle aria-hidden="true" size={14} /> {formatCount(post.comments_count)}</span>
          <span><Bookmark aria-hidden="true" size={14} /> {formatCount(post.saves_count)}</span>
        </div>
      </div>
      <Link href="/posts" aria-label={`Manage ${post.title}`}><ChevronRight aria-hidden="true" size={19} /></Link>
    </article>
  );
}

function DoctorAvatar({ profile, compact = false }) {
  const className = compact ? 'doctor-avatar doctor-avatar-compact' : 'doctor-avatar';
  if (profile?.avatar_url) return <span className={className}><img src={profile.avatar_url} alt="" width="96" height="96" /></span>;
  return <span className={className}><b>{initials(profile?.display_name)}</b></span>;
}

function initials(name = 'Doctor') {
  return name.replace(/^Dr\.\s*/i, '').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return value < 0.1 ? '<0.1' : value.toFixed(1);
}

function formatDate(value) {
  if (!value) return 'recently';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function LoadingRows() {
  return <div className="dashboard-post-list" aria-label="Loading recent posts">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
}
