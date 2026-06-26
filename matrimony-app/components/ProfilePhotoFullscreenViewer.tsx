import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfilePhotoFullscreenViewerProps = {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  overlay?: ReactNode;
};

export function ProfilePhotoFullscreenViewer({
  visible,
  photos,
  initialIndex = 0,
  onClose,
  onIndexChange,
  overlay,
}: ProfilePhotoFullscreenViewerProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0));
    setActiveIndex(safeIndex);
    requestAnimationFrame(() => {
      if (photos.length > 0) {
        listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      }
    });
  }, [visible, initialIndex, photos.length]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      const clamped = Math.min(Math.max(nextIndex, 0), photos.length - 1);
      setActiveIndex(clamped);
      onIndexChange?.(clamped);
    },
    [onIndexChange, photos.length, width],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <View style={[styles.slide, { width, height }]}>
        <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
      </View>
    ),
    [height, width],
  );

  if (!photos.length) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          bounces={photos.length > 1}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, photos.length - 1)}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollToIndexFailed={() => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({
                index: Math.min(initialIndex, photos.length - 1),
                animated: false,
              });
            });
          }}
          style={styles.list}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          {photos.length > 1 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {photos.length}
              </Text>
            </View>
          ) : (
            <View style={styles.counterSpacer} />
          )}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {photos.length > 1 ? (
          <View style={[styles.hintRow, { bottom: overlay ? insets.bottom + 120 : insets.bottom + 24 }]}>
            <MaterialIcons name="compare-arrows" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hintText}>Swipe to view photos</Text>
          </View>
        ) : null}

        {overlay ? (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.4, 0.75, 1]}
              style={styles.overlayGradient}
              pointerEvents="none"
            />
            <View style={[styles.overlayContent, { paddingBottom: insets.bottom + 16 }]}>
              {overlay}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  counter: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  counterSpacer: {
    flex: 1,
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 'auto',
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  hintRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    zIndex: 1,
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 6,
    zIndex: 2,
  },
});
