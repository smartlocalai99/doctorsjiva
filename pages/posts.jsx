import { Archive, FilePlus2, Search } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

import { EmptyState, PageHeading, PostCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { loadPostComments } from '@/lib/repository';

const filters = ['all', 'published', 'archived'];

export default function PostsPage() {
  const router = useRouter();
  const { posts, loading, deletePost } = useWorkspace();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [expandedCommentsId, setExpandedCommentsId] = useState('');
  const [commentsLoadingId, setCommentsLoadingId] = useState('');
  const [commentsByPost, setCommentsByPost] = useState({});

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesStatus = filter === 'all' || post.status === filter;
      const matchesQuery = !normalizedQuery || `${post.title} ${post.caption}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, posts, query]);

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
        <PageHeading eyebrow="Content library" title="Manage your posts" description="Review reach, find published guidance, and permanently delete content you no longer want in the patient feed." action={<Link className="primary-button" href="/create"><FilePlus2 aria-hidden="true" size={18} /> Create post</Link>} />

        {router.query.published ? <div className="success-banner" role="status">Published to the patient feed.</div> : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}

        <section className="panel grid gap-4 p-4 sm:p-5">
          <label className="search-control">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search posts</span>
            <input autoComplete="off" name="post_search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or caption…" />
          </label>
          <div className="filter-row" aria-label="Filter posts">
            {filters.map((item) => (
              <button key={item} type="button" className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>
                {item[0].toUpperCase() + item.slice(1)}
                <span>{item === 'all' ? posts.length : posts.filter((post) => post.status === item).length}</span>
              </button>
            ))}
          </div>
        </section>

        {loading ? <div className="grid gap-3 xl:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div> : filteredPosts.length ? (
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
                variant="manage"
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
