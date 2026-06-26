import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ProfilePhotoFullscreenViewer } from '@/components/ProfilePhotoFullscreenViewer';
import { images } from '@/constants/images';

type ProfilePhotoCarouselProps = {
  photos: string[];
  placeholderSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  imageWrapStyle?: StyleProp<ViewStyle>;
  arrowColor?: string;
  counterColor?: string;
  maxWidth?: number;
  aspectRatio?: number;
  overlay?: ReactNode;
  enableFullscreen?: boolean;
};

export function ProfilePhotoCarousel({
  photos,
  placeholderSource = images.logo,
  style,
  imageWrapStyle,
  arrowColor = '#570000',
  counterColor = 'rgba(87, 0, 0, 0.7)',
  maxWidth = 280,
  aspectRatio = 0.82,
  overlay,
  enableFullscreen = true,
}: ProfilePhotoCarouselProps) {
  const displayPhotos = photos.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [displayPhotos.join('|')]);

  useEffect(() => {
    if (index >= displayPhotos.length) {
      setIndex(Math.max(0, displayPhotos.length - 1));
    }
  }, [displayPhotos.length, index]);

  const activePhoto = displayPhotos[index] ?? '';
  const hasMultiple = displayPhotos.length > 1;
  const canGoPrev = hasMultiple && index > 0;
  const canGoNext = hasMultiple && index < displayPhotos.length - 1;
  const canOpenFullscreen = enableFullscreen && Boolean(activePhoto);

  return (
    <View style={[styles.root, maxWidth != null ? { maxWidth } : null, style]}>
      <View style={[styles.imageWrap, { aspectRatio }, imageWrapStyle]}>
        <Pressable
          style={styles.imagePressable}
          onPress={() => {
            if (canOpenFullscreen) {
              setFullscreenVisible(true);
            }
          }}
          disabled={!canOpenFullscreen}
          accessibilityRole="button"
          accessibilityLabel="View profile photo full screen"
        >
          {activePhoto ? (
            <Image source={{ uri: activePhoto }} style={styles.image} resizeMode="cover" />
          ) : (
            <Image source={placeholderSource} style={styles.imagePlaceholder} resizeMode="contain" />
          )}
        </Pressable>

        {canGoPrev ? (
          <Pressable
            style={[styles.arrowBtn, overlay ? styles.arrowBtnOnDark : null, styles.arrowLeft]}
            onPress={() => setIndex((current) => Math.max(0, current - 1))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
          >
            <MaterialIcons name="chevron-left" size={28} color={arrowColor} />
          </Pressable>
        ) : null}

        {canGoNext ? (
          <Pressable
            style={[styles.arrowBtn, overlay ? styles.arrowBtnOnDark : null, styles.arrowRight]}
            onPress={() =>
              setIndex((current) => Math.min(displayPhotos.length - 1, current + 1))
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next photo"
          >
            <MaterialIcons name="chevron-right" size={28} color={arrowColor} />
          </Pressable>
        ) : null}

        {hasMultiple ? (
          <View style={[styles.counter, overlay ? styles.counterTop : styles.counterBottom]}>
            <Text
              style={[
                styles.counterText,
                overlay ? styles.counterTextOnDark : { color: counterColor },
              ]}
            >
              {index + 1} / {displayPhotos.length}
            </Text>
          </View>
        ) : null}

        {overlay ? (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 0.78, 1]}
              style={styles.overlayGradient}
              pointerEvents="none"
            />
            <View style={styles.overlayContent} pointerEvents="none">
              {overlay}
            </View>
          </>
        ) : null}
      </View>

      <ProfilePhotoFullscreenViewer
        visible={fullscreenVisible}
        photos={displayPhotos}
        initialIndex={index}
        onClose={() => setFullscreenVisible(false)}
        onIndexChange={setIndex}
        overlay={overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'center',
  },
  imageWrap: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 0,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  imagePressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 34,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    zIndex: 3,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  arrowBtnOnDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  counter: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 3,
  },
  counterBottom: {
    bottom: 8,
    alignSelf: 'center',
    left: 0,
    right: 0,
  },
  counterTop: {
    top: 10,
    right: 10,
    left: undefined,
    alignSelf: 'flex-end',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },
  counterTextOnDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 48,
    gap: 6,
    zIndex: 2,
  },
});
