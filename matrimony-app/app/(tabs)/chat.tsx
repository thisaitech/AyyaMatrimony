import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '@/context/ChatContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useRequirePaidContact } from '@/hooks/useOpenMemberProfile';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import { useBrowsableMembers } from '@/hooks/useBrowsableMembers';

type MessageTab = 'received' | 'awaiting';

type MessageItem = {
  id: string;
  name: string;
  image: string;
  verified?: boolean;
  message: string;
  time: string;
  unreadCount: number;
  waitingForResponse: boolean;
  isPaidMember: boolean;
  seedMessage: string;
};

function MessageRow({ item, onPress }: { item: MessageItem; onPress: () => void }) {
  return (
    <Pressable style={styles.messageRow} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.image }} style={styles.avatar} />
        {item.isPaidMember ? (
          <View style={styles.crownBadge}>
            <MaterialIcons name="workspace-premium" size={11} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text
            style={[styles.messagePreview, item.unreadCount > 0 && styles.messagePreviewUnread]}
            numberOfLines={1}
          >
            {item.message}
          </Text>
          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const { isPaidMember } = useSubscription();
  const requirePaidContact = useRequirePaidContact();
  const { threads } = useChat();
  const [activeTab, setActiveTab] = useState<MessageTab>('received');
  const recommendedMatches = useBrowsableMembers();

  const allMessages: MessageItem[] = useMemo(
    () =>
      recommendedMatches.map((match, index) => {
        const storedThread = threads.find((thread) => thread.memberId === match.id);
        const fallbackPreview =
          index === 0 ? translate('chatMessagePreview1') : translate('chatMessagePreview2');
        const lastMessage = storedThread?.messages[storedThread.messages.length - 1];
        const preview = lastMessage?.text ?? fallbackPreview;

        return {
          id: match.id,
          name: match.name,
          image: match.image,
          verified: match.verified,
          message: preview,
          time: index === 0 ? translate('yesterday') : '12 Jun 2026',
          unreadCount: storedThread?.unreadCount ?? (index === 0 ? 1 : index === 1 ? 2 : 0),
          waitingForResponse: storedThread
            ? lastMessage?.sender === 'them'
            : index < 2,
          isPaidMember: Boolean(match.verified) || index < 2,
          seedMessage: fallbackPreview,
        };
      }),
    [recommendedMatches, threads, translate],
  );

  const openChat = (item: MessageItem) => {
    if (!requirePaidContact()) {
      return;
    }

    router.push({
      pathname: '/conversation/[id]',
      params: {
        id: item.id,
        name: item.name,
        image: item.image,
      },
    });
  };

  const visibleMessages = useMemo(() => {
    if (activeTab === 'awaiting') {
      return allMessages.filter((item) => item.waitingForResponse);
    }
    return allMessages;
  }, [activeTab, allMessages]);

  const tabs: { key: MessageTab; label: string }[] = [
    { key: 'received', label: translate('received') },
    { key: 'awaiting', label: translate('awaitingResponse') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{translate('messagesTitle')}</Text>

        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                {isActive ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isPaidMember ? (
        <View style={styles.upgradeBanner}>
          <Text style={styles.upgradeBannerText}>{translate('upgradeMembershipBanner')}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {visibleMessages.map((item) => (
          <MessageRow key={item.id} item={item} onPress={() => openChat(item)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const colorsLocal = {
  tabActive: '#00897B',
  chipBorder: '#D9D9D9',
  rowTint: '#EEF2FA',
  unreadOrange: '#FF9800',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  screenTitle: {
    ...typography.headlineMd,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 8,
    position: 'relative',
  },
  tabText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colorsLocal.tabActive,
    fontFamily: fonts.interSemi,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.xs,
    right: spacing.xs,
    height: 3,
    borderRadius: 2,
    backgroundColor: colorsLocal.tabActive,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
    backgroundColor: colorsLocal.rowTint,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colorsLocal.chipBorder,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceContainerHigh,
  },
  crownBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7B1FA2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerLowest,
  },
  messageContent: {
    flex: 1,
    gap: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.titleLg,
    fontSize: 16,
    color: colors.onSurface,
    fontFamily: fonts.interSemi,
    flex: 1,
  },
  time: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  messagePreview: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  messagePreviewUnread: {
    color: colors.onSurface,
    fontFamily: typography.labelLg.fontFamily,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colorsLocal.unreadOrange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    ...typography.labelSm,
    color: '#fff',
    fontSize: 11,
    fontFamily: fonts.interSemi,
  },
  upgradeBanner: {
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: 'rgba(245, 124, 0, 0.25)',
  },
  upgradeBannerText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 20,
  },
});
