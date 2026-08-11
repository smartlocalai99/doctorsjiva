import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Archive,
  Eye,
  Heart,
  MessageCircle,
  Send,
  ShieldAlert,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { MediaPreview } from '../../components/media-preview';
import { MetricCard } from '../../components/metric-card';
import { PrimaryButton } from '../../components/primary-button';
import { StatusPill } from '../../components/status-pill';
import { colors, radii } from '../../constants/theme';
import {
  useArchiveDoctorPost,
  useDoctorPost,
  useSaveDoctorPost,
} from '../../hooks/use-doctor-data';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const postQuery = useDoctorPost(id);
  const savePost = useSaveDoctorPost();
  const archivePost = useArchiveDoctorPost();
  const [draft, setDraft] = useState(null);

  if (postQuery.isLoading || !postQuery.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const form = draft ?? {
    ...postQuery.data,
    hashtags: (postQuery.data.hashtags ?? []).map((tag) => `#${tag}`).join(' '),
  };
  const canEdit = ['draft', 'rejected'].includes(form.status);
  const setField = (field, value) =>
    setDraft((current) => ({ ...form, ...current, [field]: value }));

  const save = async (status = form.status) => {
    try {
      const post = await savePost.mutateAsync({ ...form, status });
      setDraft({ ...post, hashtags: (post.hashtags ?? []).map((tag) => `#${tag}`).join(' ') });
      Alert.alert(status === 'pending_review' ? 'Submitted for review' : 'Post updated');
    } catch (error) {
      Alert.alert('Unable to update post', error.message);
    }
  };

  const archive = () => {
    Alert.alert('Archive this post?', 'It will no longer appear in your active post list or patient feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => archivePost.mutate(form.id, {
          onSuccess: () => router.back(),
          onError: (error) => Alert.alert('Unable to archive', error.message),
        }),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 14,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable accessibilityLabel="Go back" onPress={router.back} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft color={colors.ink} size={24} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{form.title}</Text>
          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>Post details</Text>
        </View>
        <Pressable accessibilityLabel="Archive post" onPress={archive} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Archive color={colors.danger} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 20, paddingBottom: insets.bottom + 28, gap: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <StatusPill status={form.status} />
          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
            {form.created_at ? new Date(form.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </Text>
        </View>

        <MediaPreview
          media={form.media_url ? { uri: form.media_url, fileName: form.title } : null}
          mediaType={form.media_type}
          onPress={() => canEdit && Alert.alert('Media replacement', 'Create a new post when the clinical meaning of the media changes.')}
        />

        {form.status === 'published' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <MetricCard label="Views" value={form.views_count ?? 0} icon={Eye} />
            <MetricCard label="Likes" value={form.likes_count ?? 0} icon={Heart} tone="#D94B67" />
            <MetricCard label="Comments" value={form.comments_count ?? 0} icon={MessageCircle} tone={colors.purple} />
          </View>
        ) : null}

        <View style={{ gap: 16 }}>
          <FormField label="Title" value={form.title} onChangeText={(value) => setField('title', value)} editable={canEdit} />
          <FormField label="Caption" value={form.caption} onChangeText={(value) => setField('caption', value)} multiline editable={canEdit} />
          <FormField label="Hashtags" value={form.hashtags} onChangeText={(value) => setField('hashtags', value)} editable={canEdit} autoCapitalize="none" />
          {form.safety_note || canEdit ? (
            <FormField label="Safety note" value={form.safety_note ?? ''} onChangeText={(value) => setField('safety_note', value)} multiline editable={canEdit} />
          ) : null}
        </View>

        {form.status === 'pending_review' ? (
          <View style={{ borderRadius: radii.md, backgroundColor: colors.warningSoft, padding: 15, flexDirection: 'row', gap: 10 }}>
            <ShieldAlert color={colors.warning} size={21} />
            <Text style={{ flex: 1, color: '#77501D', fontSize: 13, lineHeight: 19 }}>
              This post is locked while the clinical moderation team reviews it.
            </Text>
          </View>
        ) : null}

        {canEdit ? (
          <View style={{ gap: 10 }}>
            <PrimaryButton label={form.status === 'draft' ? 'Save changes' : 'Save corrections'} onPress={() => save(form.status)} loading={savePost.isPending} />
            <PrimaryButton label="Submit for review" tone="secondary" icon={Send} onPress={() => save('pending_review')} disabled={savePost.isPending} />
          </View>
        ) : null}

        {form.status === 'published' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>Recent comments</Text>
            <Comment name="Ananya" text="Very helpful explanation, doctor. Thank you!" />
            <Comment name="Rahul" text="Can this routine be done after a minor knee injury?" />
            <Text style={{ color: colors.inkMuted, fontSize: 12, lineHeight: 18 }}>
              Comment replies and moderation actions will connect when the patient Health Feed interaction tables are enabled.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Comment({ name, text }) {
  return (
    <View style={{ borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 5 }}>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>{name}</Text>
      <Text style={{ color: colors.inkMuted, fontSize: 13, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}
