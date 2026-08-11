import { Link, useRouter } from 'expo-router';
import {
  Eye,
  FileClock,
  Heart,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/avatar';
import { MetricCard } from '../../components/metric-card';
import { PostCard } from '../../components/post-card';
import { colors, radii } from '../../constants/theme';
import { useDoctorPosts, useDoctorProfile } from '../../hooks/use-doctor-data';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profileQuery = useDoctorProfile();
  const postsQuery = useDoctorPosts();
  const profile = profileQuery.data;
  const posts = postsQuery.data ?? [];
  const published = posts.filter((post) => post.status === 'published');
  const views = published.reduce((total, post) => total + (post.views_count ?? 0), 0);
  const likes = published.reduce((total, post) => total + (post.likes_count ?? 0), 0);
  const refreshing = profileQuery.isRefetching || postsQuery.isRefetching;

  const refresh = () => Promise.all([profileQuery.refetch(), postsQuery.refetch()]);

  if (profileQuery.isLoading || postsQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 30, gap: 24 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.inkMuted, fontSize: 13, fontWeight: '600' }}>Good morning</Text>
          <Text style={{ color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' }} numberOfLines={1}>
            {profile?.display_name ?? 'Doctor'}
          </Text>
        </View>
        <Link href="/(tabs)/profile" asChild>
          <Pressable accessibilityLabel="Open doctor profile">
            <Avatar uri={profile?.avatar_url} size={52} />
          </Pressable>
        </Link>
      </View>

      <View
        style={{
          borderRadius: radii.lg,
          backgroundColor: colors.primary,
          padding: 20,
          gap: 18,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: 90,
            right: -60,
            top: -80,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles color="#DDF2FF" size={18} />
          <Text style={{ color: '#DDF2FF', fontSize: 13, fontWeight: '700' }}>SHARE TRUSTED GUIDANCE</Text>
        </View>
        <View style={{ gap: 6, maxWidth: 280 }}>
          <Text style={{ color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '800' }}>
            What should your patients learn today?
          </Text>
          <Text style={{ color: '#DDEEFF', fontSize: 14, lineHeight: 21 }}>
            Create a clear image post or short health video in a few minutes.
          </Text>
        </View>
        <Link href="/(tabs)/create" asChild>
          <Pressable
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              minHeight: 44,
              paddingHorizontal: 15,
              borderRadius: 14,
              backgroundColor: pressed ? '#E8F2FA' : colors.white,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            })}
          >
            <Plus color={colors.primaryDark} size={19} strokeWidth={2.5} />
            <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: '700' }}>Create new post</Text>
          </Pressable>
        </Link>
      </View>

      <View style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>Your impact</Text>
          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>All time</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard label="Views" value={views} icon={Eye} />
          <MetricCard label="Likes" value={likes} icon={Heart} tone="#D94B67" />
          <MetricCard label="Followers" value={profile?.follower_count ?? 0} icon={UsersRound} tone={colors.purple} />
        </View>
      </View>

      <View
        style={{
          borderRadius: radii.md,
          backgroundColor: colors.successSoft,
          borderWidth: 1,
          borderColor: '#CDECDD',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 15,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck color={colors.success} size={23} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.success, fontSize: 14, fontWeight: '700' }}>Verified doctor profile</Text>
          <Text style={{ color: '#39725A', fontSize: 12, lineHeight: 17 }}>
            Your professional identity is shown with every post.
          </Text>
        </View>
      </View>

      <View style={{ gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>Recent posts</Text>
          <Link href="/(tabs)/posts" asChild>
            <Pressable hitSlop={8}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View all</Text></Pressable>
          </Link>
        </View>
        {posts.length ? (
          posts.slice(0, 3).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
            />
          ))
        ) : (
          <View style={{ padding: 24, backgroundColor: colors.surface, borderRadius: radii.md, alignItems: 'center', gap: 9 }}>
            <FileClock color={colors.primary} size={28} />
            <Text style={{ color: colors.ink, fontWeight: '700' }}>No posts yet</Text>
            <Text style={{ color: colors.inkMuted, fontSize: 13, textAlign: 'center' }}>Your drafts and published health posts will appear here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
