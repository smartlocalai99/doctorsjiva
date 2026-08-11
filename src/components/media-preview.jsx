import { Image } from 'expo-image';
import { ImagePlus, Play, Video } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { colors, radii } from '../constants/theme';

export function MediaPreview({ media, mediaType, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        aspectRatio: 4 / 5,
        maxHeight: 430,
        width: '100%',
        borderRadius: radii.lg,
        overflow: 'hidden',
        backgroundColor: '#DADAD9',
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.9 : 1,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {media?.uri && mediaType === 'image' ? (
        <Image source={{ uri: media.uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      ) : media?.uri && mediaType === 'video' ? (
        <VideoAsset uri={media.uri} />
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 30 }}>
          <View
            style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            {mediaType === 'video' ? (
              <Video color={colors.primary} size={30} />
            ) : (
              <ImagePlus color={colors.primary} size={30} />
            )}
          </View>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>
            Add {mediaType === 'video' ? 'a short video' : 'a cover image'}
          </Text>
          <Text style={{ color: colors.inkMuted, textAlign: 'center', fontSize: 13, lineHeight: 19 }}>
            Use a clear vertical asset. You can preview it before saving.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function VideoAsset({ uri }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls
        fullscreenOptions={{ enable: true }}
        style={{ width: '100%', height: '100%' }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(0,0,0,0.48)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Play color={colors.white} fill={colors.white} size={16} />
      </View>
    </View>
  );
}
