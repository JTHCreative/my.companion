import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PetAvatarHeader } from '../components/PetAvatarHeader';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { Message } from '../types';
import { generateId } from '../utils/generateId';
import {
  subscribeToMessages,
  addMessage,
  deleteMessage,
  togglePinMessage,
  cleanupOldMessages,
} from '../services/messages';

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#6FA85C', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316',
];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface MessageBubbleProps {
  message: Message;
  isOwner: boolean;
  isMine: boolean;
  theme: any;
  onReply: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onDelete: (msg: Message) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwner,
  isMine,
  theme,
  onReply,
  onPin,
  onDelete,
}: MessageBubbleProps) {
  const avatarColor = getAvatarColor(message.authorUid);

  const handleLongPress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Reply', onPress: () => onReply(message) },
    ];
    if (isOwner) {
      options.push({
        text: message.pinned ? 'Unpin' : 'Pin',
        onPress: () => onPin(message),
      });
    }
    if (isMine || isOwner) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(message),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      style={styles.bubbleRow}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{getInitials(message.authorName)}</Text>
      </View>
      <View style={styles.bubbleContent}>
        <View style={styles.bubbleHeader}>
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {message.authorName}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatTimestamp(message.createdAt)}
          </Text>
        </View>
        {message.replyTo && (
          <View style={[styles.replyBar, { borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
              {message.replyTo.authorName}
            </Text>
            <Text style={[styles.replyText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {message.replyTo.text}
            </Text>
          </View>
        )}
        <Text style={[styles.messageText, { color: theme.colors.text }]}>
          {message.text}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export function MessagesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, displayName } = useAuth();
  const insets = useSafeAreaInsets();
  const { selectedPet, selectedPetId } = useData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const isOwner = selectedPet?.ownerUid === user?.uid;

  // Subscribe to messages & run cleanup
  useEffect(() => {
    if (!selectedPetId) {
      setMessages([]);
      return;
    }

    // Clean up old unpinned messages on mount
    cleanupOldMessages(selectedPetId).catch(() => {});

    const unsub = subscribeToMessages(selectedPetId, (msgs) => {
      setMessages(msgs);
    });

    return unsub;
  }, [selectedPetId]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned),
    [messages],
  );

  const allMessages = useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !selectedPetId) return;

    const msg: Message = {
      id: generateId(),
      petId: selectedPetId,
      authorUid: user.uid,
      authorName: displayName || user.email || 'Unknown',
      text: trimmed,
      createdAt: Date.now(),
      pinned: false,
      ...(replyingTo
        ? {
            replyTo: {
              id: replyingTo.id,
              authorName: replyingTo.authorName,
              text: replyingTo.text,
            },
          }
        : {}),
    };

    setText('');
    setReplyingTo(null);

    try {
      await addMessage(msg);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message.');
    }
  }, [text, user, selectedPetId, displayName, replyingTo]);

  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  const handlePin = useCallback(
    async (msg: Message) => {
      if (!selectedPetId) return;
      try {
        await togglePinMessage(selectedPetId, msg.id, !msg.pinned);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update pin.');
      }
    },
    [selectedPetId],
  );

  const handleDelete = useCallback(
    (msg: Message) => {
      if (!selectedPetId) return;
      Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(selectedPetId, msg.id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete.');
            }
          },
        },
      ]);
    },
    [selectedPetId],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isOwner={isOwner}
        isMine={item.authorUid === user?.uid}
        theme={theme}
        onReply={handleReply}
        onPin={handlePin}
        onDelete={handleDelete}
      />
    ),
    [isOwner, user?.uid, theme, handleReply, handlePin, handleDelete],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (!selectedPet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PetAvatarHeader
          title="Messages"
          onAddPet={() => navigation.navigate('AddPetChoice')}
        />
        <EmptyState
          icon="chatbubbles"
          title="No Pet Selected"
          subtitle="Add a pet first to use the message board."
          actionLabel="Add Pet"
          onAction={() => navigation.navigate('AddPetChoice')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <PetAvatarHeader
        title="Messages"
        onAddPet={() => navigation.navigate('AddPetChoice')}
      />

      <FlatList
        ref={flatListRef}
        data={allMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          pinnedMessages.length > 0 ? (
            <View>
              <View style={styles.pinnedHeader}>
                <View style={[styles.pinnedIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="pin" size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.pinnedTitle, { color: theme.colors.text }]}>
                  Pinned Messages
                </Text>
              </View>
              {pinnedMessages.map((msg) => (
                <TouchableOpacity
                  key={`pin-${msg.id}`}
                  activeOpacity={0.8}
                  onLongPress={() => {
                    const options: any[] = [
                      { text: 'Reply', onPress: () => handleReply(msg) },
                    ];
                    if (isOwner) {
                      options.push({ text: 'Unpin', onPress: () => handlePin(msg) });
                    }
                    options.push({ text: 'Cancel', style: 'cancel' });
                    Alert.alert('Pinned Message', undefined, options);
                  }}
                >
                  <Card style={styles.pinnedCard}>
                    <View style={styles.pinnedBubbleHeader}>
                      <Ionicons name="pin" size={14} color="#F59E0B" />
                      <Text style={[styles.pinnedAuthor, { color: theme.colors.primary }]}>
                        {msg.authorName}
                      </Text>
                      <Text style={[styles.pinnedTimestamp, { color: theme.colors.textSecondary }]}>
                        {formatTimestamp(msg.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.pinnedText, { color: theme.colors.text }]}>
                      {msg.text}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
              <View style={styles.pinnedDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
                  All Messages
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Start the conversation!
            </Text>
          </View>
        }
      />

      {/* Compose area */}
      <View style={[styles.composeWrapper, { borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 8) + 56 }]}>
        {replyingTo && (
          <View style={[styles.replyPreview, { backgroundColor: theme.colors.primaryLight, borderLeftColor: theme.colors.primary }]}>
            <View style={styles.replyPreviewContent}>
              <Text style={[styles.replyPreviewAuthor, { color: theme.colors.primary }]}>
                Replying to {replyingTo.authorName}
              </Text>
              <Text style={[styles.replyPreviewText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyClose}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composeRow}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Write a message..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim()
                  ? theme.colors.primary
                  : theme.colors.inputBackground,
              },
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="send"
              size={20}
              color={text.trim() ? '#FFFFFF' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  // Pinned section
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8,
  },
  pinnedIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pinnedCard: {
    marginHorizontal: 0,
    marginVertical: 3,
  },
  pinnedBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pinnedAuthor: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  pinnedTimestamp: {
    fontSize: 11,
  },
  pinnedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pinnedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Message bubbles
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bubbleContent: {
    flex: 1,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
  },
  replyBar: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
    marginTop: 2,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  // Empty state
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  // Compose
  composeWrapper: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyPreviewText: {
    fontSize: 12,
  },
  replyClose: {
    padding: 4,
    marginLeft: 8,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
