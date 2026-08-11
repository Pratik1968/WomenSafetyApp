import type { ReactNode } from "react";
import { Text, Pressable, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "lg" | "md" | "sm";

const SIZE_STYLE: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  lg: { height: 56, paddingHorizontal: 24, fontSize: 17 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 16 },
  sm: { height: 40, paddingHorizontal: 16, fontSize: 15 },
};

export interface AppButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leading?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  variant = "primary",
  size = "lg",
  loading = false,
  leading,
  disabled,
  onPress,
  children,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const sizeStyle = SIZE_STYLE[size];
  const textColor = TEXT_COLOR[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { height: sizeStyle.height, paddingHorizontal: sizeStyle.paddingHorizontal },
        VARIANT_STYLE[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {variant === "primary" && (
        <LinearGradient
          colors={gradientBrand as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading ? (
        <>
          <ActivityIndicator color={textColor} size="small" />
          <Text style={[styles.text, { color: textColor, fontSize: sizeStyle.fontSize }]}>Please wait</Text>
        </>
      ) : (
        <>
          {leading}
          <Text style={[styles.text, { color: textColor, fontSize: sizeStyle.fontSize }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.foreground,
  outline: colors.foreground,
  ghost: colors.mutedForeground,
  destructive: colors.emergencyForeground,
};

const VARIANT_STYLE = StyleSheet.create({
  primary: { overflow: "hidden" },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: colors.emergency },
});

const styles = StyleSheet.create({
  base: {
    position: "relative",
    // Stretch to full width inside column layouts (forms, sheets) — RN's default cross-axis
    // stretch — without forcing 100% width when placed inline in a row (e.g. next to a text
    // block), which would otherwise crush its siblings and overflow the container.
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
  },
  text: {
    fontWeight: "600",
    letterSpacing: -0.16,
  },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.985 }] },
});
