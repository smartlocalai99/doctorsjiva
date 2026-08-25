/* eslint-disable @next/next/no-img-element -- the profile avatar is a user-managed Supabase URL */
import { Archive, BadgeCheck, CalendarDays, Grid3X3, Stethoscope, Video } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { EmptyState, PostCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { loadCamps, loadPostComments } from '@/lib/repository';

const contentTabs = [
  { key: 'posts', label: 'Posts', icon: Grid3X3 },
  { key: 'reels', label: 'Reels', icon: Video },
  { key: 'camps', label: 'Medical camps', icon: Stethoscope },
];

export default function PostsPage() {
  const router = useRouter();
  const { posts, profile, loading, deletePost } = useWorkspace();
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [expandedCommentsId, setExpandedCommentsId] = useState('');
  const [commentsLoadingId, setCommentsLoadingId] = useState('');
  const [commentsByPost, setCommentsByPost] = useState({});
  const [activeTab, setActiveTab] = useState('reels');
  const [camps, setCamps] = useState([]);
  const [campsLoaded, setCampsLoaded] = useState(false);

  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'reels') return post.media_type === 'video';
    return post.media_type !== 'video';
  });

  useEffect(() => {
    if (activeTab !== 'camps' || camps.length) return;
    loadCamps()
      .then((result) => setCamps(result.camps || []))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setCampsLoaded(true));
  }, [activeTab, camps.length]);

  const remove = async (post) => {
    if (!window.confirm(`Permanently delete “${post.title}” and its uploaded media? This cannot be undone.`)) return;
    setError('');
    setDeletingId(post.id);
    try {
      await deletePost(post.id);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId('');
    }
  };

  const toggleComments = async (post) => {
    if (expandedCommentsId === post.id) {
      setExpandedCommentsId('');
      return;
    }
    setExpandedCommentsId(post.id);
    if (commentsByPost[post.id]) return;
    setCommentsLoadingId(post.id);
    setError('');
    try {
      const comments = await loadPostComments(post.id);
      setCommentsByPost((current) => ({ ...current, [post.id]: comments }));
    } catch (commentsError) {
      setExpandedCommentsId('');
      setError(commentsError.message);
    } finally {
      setCommentsLoadingId('');
    }
  };

  return (
    <>
      <Head><title>Posts · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <header className="content-profile-header">
          <span className="content-profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile?.display_name)}</span>
          <div className="content-profile-copy">
            <div className="content-profile-title"><div><p>Doctor studio</p><h1>{profile?.display_name || 'Your content'} <BadgeCheck aria-label="Verified doctor" className="content-profile-verified" fill="currentColor" size={20} /></h1></div></div>
            <p className="content-profile-specialty">{profile?.specialty || 'Health education'}{profile?.hospital_name ? ` · ${profile.hospital_name}` : ''}</p>
            <div className="content-profile-stats"><span><strong>{formatCount(posts.reduce((total, post) => total + Number(post.views_count || 0), 0))}</strong> views</span><span><strong>{formatCount(posts.reduce((total, post) => total + Number(post.likes_count || 0), 0))}</strong> likes</span><span><strong>{formatCount(posts.reduce((total, post) => total + Number(post.saves_count || 0), 0))}</strong> saves</span></div>
          </div>
        </header>

        {router.query.published ? <div className="success-banner" role="status">Published to the patient feed.</div> : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}

        <nav className="content-tab-bar" aria-label="Content type">
          {contentTabs.map(({ key, label, icon: Icon }) => <button className={activeTab === key ? 'selected' : ''} key={key} type="button" onClick={() => setActiveTab(key)}><Icon aria-hidden="true" size={20} /><span>{label}</span></button>)}
        </nav>

        {activeTab === 'camps' ? <CampGrid camps={camps} loading={!campsLoaded} /> : loading ? <div className="content-library-list">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="aspect-square animate-pulse rounded-xl bg-slate-200" />)}</div> : filteredPosts.length ? (
          <div className="content-library-list">
            {filteredPosts.map((post) => (
              <PostCard
                comments={commentsByPost[post.id] || []}
                commentsExpanded={expandedCommentsId === post.id}
                commentsLoading={commentsLoadingId === post.id}
                deleting={deletingId === post.id}
                key={post.id}
                onDelete={remove}
                onToggleComments={() => void toggleComments(post)}
                post={post}
                variant={activeTab === 'reels' ? 'reel-grid' : 'grid'}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Archive} title="No matching posts" description="Try another filter or create a new health post." action={<Link className="primary-button" href="/create">Create post</Link>} />
        )}
      </div>
    </>
  );
}

function CampGrid({ camps, loading }) {
  if (loading) return <div className="content-library-list">{[1, 2, 3].map((item) => <div key={item} className="aspect-square animate-pulse rounded-xl bg-slate-200" />)}</div>;
  if (!camps.length) return <EmptyState icon={Stethoscope} title="No medical camps yet" description="Published camps will appear here for quick review." />;
  return <div className="content-library-list">{camps.map((camp) => <article className="camp-grid-card" key={camp.id}><div className="camp-grid-media"><Stethoscope aria-hidden="true" size={34} /></div><div className="camp-grid-copy"><span><CalendarDays aria-hidden="true" size={13} /> {camp.event_date}</span><h2>{camp.title}</h2><p>{camp.location || camp.hospital_name}</p></div></article>)}</div>;
}

function initials(name = 'Doctor') {
  return name.replace(/^Dr\.\s*/i, '').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}
