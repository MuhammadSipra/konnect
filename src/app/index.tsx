import { StyleSheet, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";

export default function SplashScreen() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.bg }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});