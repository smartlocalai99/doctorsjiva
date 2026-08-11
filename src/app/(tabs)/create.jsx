import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { FileText, Image as ImageIcon, Send, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { MediaPreview } from '../../components/media-preview';
import { PrimaryButton } from '../../components/primary-button';
import { colors, radii } from '../../constants/theme';
import { useSaveDoctorPost } from '../../hooks/use-doctor-data';

const emptyForm = {
  title: '',
  caption: '',
  hashtags: '',
  safety_note: '',
  source_url: '',
};

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const savePost = useSaveDoctorPost();
  const [mediaType, setMediaType] = useState('image');
  const [media, setMedia] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const pickMedia = async () => {
    if (mediaType === 'video') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access required', 'Allow media access to choose a health video.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [mediaType === 'video' ? 'videos' : 'images'],
      allowsEditing: mediaType === 'image',
      aspect: mediaType === 'image' ? [4, 5] : undefined,
      quality: 0.88,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const maxBytes = mediaType === 'video' ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxBytes) {
        Alert.alert('File is too large', mediaType === 'video' ? 'Choose a video below 50 MB.' : 'Choose an image below 8 MB.');
        return;
      }
      setMedia({ ...asset, type: mediaType });
    }
  };

  const submit = async (status) => {
    try {
      await savePost.mutateAsync({ ...form, media, media_type: mediaType, status });
      setForm(emptyForm);
      setMedia(null);
      Alert.alert(
        status === 'draft' ? 'Draft saved' : 'Submitted for review',
        status === 'draft'
          ? 'You can continue editing it from Posts.'
          : 'The post will appear in the patient feed after approval.',
        [{ text: 'View posts', onPress: () => router.replace('/(tabs)/posts') }],
      );
    } catch (error) {
      Alert.alert('Unable to save post', error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 17, paddingHorizontal: 18, paddingBottom: 34, gap: 22 }}
      >
        <View style={{ gap: 5 }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>Create health post</Text>
          <Text style={{ color: colors.inkMuted, fontSize: 14, lineHeight: 20 }}>Make it useful, clear and safe for a general audience.</Text>
        </View>

        <View style={{ flexDirection: 'row', padding: 4, borderRadius: 15, backgroundColor: colors.surfaceMuted, gap: 4 }}>
          <TypeButton label="Image" icon={ImageIcon} selected={mediaType === 'image'} onPress={() => { setMediaType('image'); setMedia(null); }} />
          <TypeButton label="Video" icon={Video} selected={mediaType === 'video'} onPress={() => { setMediaType('video'); setMedia(null); }} />
        </View>

        <MediaPreview media={media} mediaType={mediaType} onPress={pickMedia} />

        <View style={{ gap: 17 }}>
          <FormField
            label="Post title"
            placeholder="Example: 5 stretches for a better morning"
            value={form.title}
            onChangeText={(value) => setField('title', value)}
            maxLength={90}
            hint={`${form.title.length}/90 characters`}
          />
          <FormField
            label="Caption"
            placeholder="Explain the health guidance in simple language..."
            value={form.caption}
            onChangeText={(value) => setField('caption', value)}
            multiline
            maxLength={1200}
            hint={`${form.caption.length}/1200 characters`}
          />
          <FormField
            label="Hashtags"
            placeholder="#Wellness #MorningRoutine"
            value={form.hashtags}
            onChangeText={(value) => setField('hashtags', value)}
            autoCapitalize="none"
            hint="Use up to 10 relevant topics."
          />
          <FormField
            label="Safety note"
            placeholder="Example: Stop if you feel pain and consult your doctor."
            value={form.safety_note}
            onChangeText={(value) => setField('safety_note', value)}
            multiline
            hint="Recommended for exercise, medicine and condition-related content."
          />
          <FormField
            label="Clinical source (optional)"
            placeholder="https://..."
            value={form.source_url}
            onChangeText={(value) => setField('source_url', value)}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={{ borderRadius: radii.md, backgroundColor: colors.warningSoft, padding: 14, flexDirection: 'row', gap: 10 }}>
          <FileText color={colors.warning} size={20} />
          <Text style={{ flex: 1, color: '#77501D', fontSize: 12, lineHeight: 18 }}>
            Do not include patient-identifying information. Content must be educational and should not replace an individual consultation.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <PrimaryButton label="Submit for review" icon={Send} onPress={() => submit('pending_review')} loading={savePost.isPending} />
          <PrimaryButton label="Save as draft" tone="secondary" onPress={() => submit('draft')} disabled={savePost.isPending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TypeButton({ label, icon: Icon, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        backgroundColor: selected ? colors.surface : 'transparent',
        opacity: pressed ? 0.75 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}
    >
      <Icon color={selected ? colors.primary : colors.inkMuted} size={18} />
      <Text style={{ color: selected ? colors.primaryDark : colors.inkMuted, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
