import { useRouter } from 'expo-router';
import { Archive, FilePlus2, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '../../components/post-card';
import { colors, radii } from '../../constants/theme';
import { useArchiveDoctorPost, useDoctorPosts } from '../../hooks/use-doctor-data';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'pending_review', label: 'In review' },
  { key: 'draft', label: 'Drafts' },
];

export default function PostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const postsQuery = useDoctorPosts();
  const archivePost = useArchiveDoctorPost();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const visiblePosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (postsQuery.data ?? []).filter((post) => {
      const matchesFilter = filter === 'all' || post.status === filter;
      const matchesSearch = !normalizedSearch || post.title.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch && post.status !== 'archived';
    });
  }, [filter, postsQuery.data, search]);

  const showPostMenu = (post) => {
    Alert.alert(post.title, 'Manage this post', [
      { text: 'Open post', onPress: () => router.push({ pathname: '/post/[id]', params: { id: post.id } }) },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => archivePost.mutate(post.id, { onError: (error) => Alert.alert('Unable to archive', error.message) }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={postsQuery.isRefetching} onRefresh={postsQuery.refetch} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingTop: insets.top + 17, paddingHorizontal: 18, paddingBottom: 32, gap: 19 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ gap: 5 }}>
        <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>Your posts</Text>
        <Text style={{ color: colors.inkMuted, fontSize: 14 }}>Manage drafts, reviews and published guidance.</Text>
      </View>

      <View
        style={{
          minHeight: 48,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingHorizontal: 14,
        }}
      >
        <Search color={colors.inkMuted} size={19} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your posts"
          placeholderTextColor="#929DA6"
          style={{ flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={({ pressed }) => ({
                borderRadius: radii.pill,
                backgroundColor: selected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                paddingHorizontal: 15,
                paddingVertical: 9,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text style={{ color: selected ? colors.white : colors.inkMuted, fontSize: 13, fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: 11 }}>
        {visiblePosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
            onMenu={() => showPostMenu(post)}
          />
        ))}
      </View>

      {!visiblePosts.length ? (
        <View style={{ alignItems: 'center', gap: 11, paddingVertical: 54, paddingHorizontal: 28 }}>
          <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            {filter === 'all' ? <FilePlus2 color={colors.primary} size={27} /> : <Archive color={colors.primary} size={27} />}
          </View>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>No matching posts</Text>
          <Text style={{ color: colors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' }}>
            Try another filter or create a new health post.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
