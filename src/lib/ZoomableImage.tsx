import { useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ZOOM_SCALE = 2.5;

// Double-tap to zoom, drag to pan while zoomed — no external dependency needed.
export default function ZoomableImage({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const zoomedRef = useRef(false);
  const lastTapRef = useRef(0);
  const startTranslate = useRef({ x: 0, y: 0 });
  const currentTranslate = useRef({ x: 0, y: 0 });

  const toggleZoom = () => {
    if (zoomedRef.current) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      currentTranslate.current = { x: 0, y: 0 };
      zoomedRef.current = false;
    } else {
      Animated.spring(scale, { toValue: ZOOM_SCALE, useNativeDriver: true }).start();
      zoomedRef.current = true;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startTranslate.current = { ...currentTranslate.current };
      },
      onMoveShouldSetPanResponder: (_, g) =>
        zoomedRef.current && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
      onPanResponderMove: (_, g) => {
        if (!zoomedRef.current) return;
        translateX.setValue(startTranslate.current.x + g.dx);
        translateY.setValue(startTranslate.current.y + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        const moved = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        if (zoomedRef.current && moved) {
          currentTranslate.current = {
            x: startTranslate.current.x + g.dx,
            y: startTranslate.current.y + g.dy,
          };
          return;
        }
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          toggleZoom();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      },
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={styles.wrap}>
      <Animated.Image
        source={{ uri }}
        resizeMode="contain"
        style={[styles.image, { transform: [{ scale }, { translateX }, { translateY }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SCREEN_W, height: SCREEN_H * 0.8, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});