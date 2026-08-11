import { Eye, Heart, Plus, UsersRound, WandSparkles } from 'lucide-react';
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
    }),
    { views: 0, likes: 0 },
  );

  return (
    <>
      <Head><title>Overview · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <PageHeading
          eyebrow="Doctor workspace"
          title={`Good morning${profile?.display_name ? `, ${profile.display_name.replace('Dr. ', '')}` : ''}`}
          description="Create useful health guidance and keep track of what patients engage with."
          action={<Link className="primary-button" href="/create"><Plus size={18} /> Create post</Link>}
        />

        {error ? (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={refresh}>Try again</button>
          </div>
        ) : null}

        <section className="studio-hero">
          <div className="studio-hero-copy">
            <p className="eyebrow eyebrow-light">Today&apos;s content note</p>
            <h2>What should your patients understand today?</h2>
            <p>Turn one practical clinical insight into a clear image post or short video.</p>
            <Link className="light-button" href="/create"><WandSparkles size={18} /> Start creating</Link>
          </div>
          <div className="clinical-card" aria-hidden="true">
            <span>DRJIVA HEALTH NOTE</span>
            <strong>Teach one thing clearly.</strong>
            <i />
            <i />
            <i />
          </div>
        </section>

        <section aria-labelledby="impact-heading">
          <div className="section-heading">
            <h2 id="impact-heading">Your impact</h2>
            <span>All time</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard label="Views" value={totals.views} icon={Eye} />
            <StatCard label="Likes" value={totals.likes} icon={Heart} tone="rose" />
            <StatCard label="Followers" value={profile?.follower_count || 0} icon={UsersRound} tone="violet" />
          </div>
        </section>

        <section aria-labelledby="recent-heading">
          <div className="section-heading">
            <h2 id="recent-heading">Recent posts</h2>
            <Link href="/posts">View all</Link>
          </div>
          {loading ? <LoadingRows /> : visiblePosts.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {visiblePosts.slice(0, 4).map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          ) : (
            <EmptyState icon={Plus} title="Create your first post" description="Your drafts and published health guidance will appear here." action={<Link className="primary-button" href="/create">Create post</Link>} />
          )}
        </section>
      </div>
    </>
  );
}

function LoadingRows() {
  return <div className="grid gap-3 xl:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}
