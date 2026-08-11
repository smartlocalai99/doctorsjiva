import { Image } from 'expo-image';
import { Heart, ImageIcon, MessageCircle, MoreHorizontal, Play, UsersRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors, radii } from '../constants/theme';
import { StatusPill } from './status-pill';

const formatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function PostCard({ post, onPress, onMenu }) {
  const hasMedia = Boolean(post.media_url);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 13,
        padding: 12,
        borderRadius: radii.md,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <View
        style={{
          width: 92,
          height: 112,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#DADAD9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasMedia ? (
          <Image source={{ uri: post.media_url }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : post.media_type === 'video' ? (
          <Play color={colors.primaryDark} fill={colors.primaryDark} size={30} />
        ) : (
          <ImageIcon color={colors.primaryDark} size={30} />
        )}
        {post.media_type === 'video' ? (
          <View
            style={{
              position: 'absolute',
              right: 7,
              bottom: 7,
              width: 25,
              height: 25,
              borderRadius: 13,
              backgroundColor: 'rgba(0,0,0,0.62)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play color={colors.white} fill={colors.white} size={12} />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <StatusPill status={post.status} />
            <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>
              {post.title}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Post options"
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onMenu?.();
            }}
            style={{ padding: 2 }}
          >
            <MoreHorizontal color={colors.inkMuted} size={20} />
          </Pressable>
        </View>

        {post.status === 'published' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 13 }}>
            <Metric icon={UsersRound} value={post.views_count} />
            <Metric icon={Heart} value={post.likes_count} />
            <Metric icon={MessageCircle} value={post.comments_count} />
          </View>
        ) : (
          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
            Updated {new Date(post.updated_at ?? post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function Metric({ icon: Icon, value = 0 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon color={colors.inkMuted} size={14} strokeWidth={2} />
      <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        {formatter.format(value)}
      </Text>
    </View>
  );
}
