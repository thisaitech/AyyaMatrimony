import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { resolveMemberListing } from '@/constants/memberDirectory';
import { getDefaultChatSeed, useChat } from '@/context/ChatContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useOpenMemberProfile } from '@/hooks/useOpenMemberProfile';
import { useMemberDirectory } from '@/context/MemberDirectoryContext';
import { colors, fonts, spacing, typography } from '@/constants/theme';

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { translate } = useLanguage();
  const { isPaidMember, isReady: subscriptionReady } = useSubscription();
  const openProfile = useOpenMemberProfile();
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    image?: string | string[];
  }>();
  const memberId = readParam(params.id);
  const paramName = readParam(params.name);
  const paramImage = readParam(params.image);
  const { published } = useMemberDirectory();
  const { threads, ensureThread, sendMessage, markThreadRead, isReady } = useChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const initializedRef = useRef<string | null>(null);

  const member = resolveMemberListing(memberId, published);
  const memberName = paramName || member?.name || translate('chat');
  const memberImage = paramImage || member?.image || '';

  const seedKey = getDefaultChatSeed(memberId);
  const seedMessage = useMemo(() => {
    if (seedKey === 'preview-1') {
      return translate('chatMessagePreview1');
    }
    if (seedKey === 'preview-2') {
      return translate('chatMessagePreview2');
    }
    return undefined;
  }, [seedKey, translate]);

  const thread = threads.find((entry) => entry.memberId === memberId);
  const messages = thread?.messages ?? [];

  useEffect(() => {
    if (!isReady || !memberId || initializedRef.current === memberId) {
      return;
    }

    initializedRef.current = memberId;
    void ensureThread(memberId, memberName, memberImage, seedMessage).then(() => {
      void markThreadRead(memberId);
    });
  }, [ensureThread, isReady, markThreadRead, memberId, memberImage, memberName, seedMessage]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!memberId || !draft.trim() || sending) {
      return;
    }

    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      await sendMessage(memberId, text);
    } finally {
      setSending(false);
    }
  }, [draft, memberId, sendMessage, sending]);

  const canSend = draft.trim().length > 0 && !sending && isPaidMember;

  if (!memberId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerName}>{translate('profileNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subscriptionReady && !isPaidMember) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          {memberImage ? (
            <Image source={{ uri: memberImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {memberName}
            </Text>
          </View>
        </View>
        <View style={styles.lockedWrap}>
          <MaterialIcons name="lock" size={32} color={colors.primary} />
          <Text style={styles.lockedTitle}>{translate('upgradeMembershipBanner')}</Text>
          <PrimaryButton label={translate('upgrade')} onPress={() => router.push('/upgrade')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        {memberImage ? (
          <Image source={{ uri: memberImage }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
            <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {memberName}
          </Text>
          <Text style={styles.headerMeta}>{translate('chatActiveNow')}</Text>
        </View>
        <Pressable
          style={styles.profileBtn}
          onPress={() => openProfile(memberId)}
          hitSlop={8}
        >
          <MaterialIcons name="visibility" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadText}>{translate('chatStartHint')}</Text>
            </View>
          ) : (
            messages.map((message) => {
              const isMine = message.sender === 'me';
              return (
                <View
                  key={message.id}
                  style={[styles.messageBubbleRow, isMine && styles.messageBubbleRowMine]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                    ]}
                  >
                    <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                      {message.text}
                    </Text>
                    <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                      {formatMessageTime(message.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={translate('typeMessagePlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            maxLength={500}
            blurOnSubmit={false}
          />
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={() => {
              void handleSend();
            }}
            disabled={!canSend}
          >
            <MaterialIcons name="send" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(87, 0, 0, 0.08)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  headerMeta: {
    ...typography.labelSm,
    color: '#43A047',
  },
  profileBtn: {
    padding: 4,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  emptyThread: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyThreadText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  messageBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageBubbleRowMine: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  messageBubbleTheirs: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    borderBottomLeftRadius: 4,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  messageTextMine: {
    color: colors.onPrimary,
  },
  messageTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    alignSelf: 'flex-end',
    fontSize: 10,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(87, 0, 0, 0.08)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.md,
  },
  lockedTitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
});
