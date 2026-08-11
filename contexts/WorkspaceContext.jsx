import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import {
  deletePost as deletePostRecord,
  loadWorkspace,
  savePost as savePostRecord,
  saveProfile as saveProfileRecord,
} from '@/lib/repository';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const workspace = await loadWorkspace();
      setProfile(workspace.profile);
      setPosts(workspace.posts);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({
      profile,
      posts,
      loading,
      error,
      refresh,
      async savePost(input) {
        const saved = await savePostRecord(input);
        setPosts((current) => {
          const exists = current.some((post) => post.id === saved.id);
          return exists
            ? current.map((post) => (post.id === saved.id ? saved : post))
            : [saved, ...current];
        });
        return saved;
      },
      async deletePost(postId) {
        await deletePostRecord(postId);
        setPosts((current) => current.filter((post) => post.id !== postId));
      },
      async saveProfile(input) {
        const saved = await saveProfileRecord(input);
        setProfile(saved);
        return saved;
      },
    }),
    [error, loading, posts, profile, refresh],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace() {
  const value = use(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return value;
}
