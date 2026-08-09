import { useState, type ReactNode, type ComponentProps } from "react";
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from "react-native";
import { colors } from "../../theme/tokens";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function AppInput({
  value,
  onChangeText,
  placeholder,
  invalid,
  hint,
  keyboardType,
  autoComplete,
  maxLength,
  editable = true,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: ComponentProps<typeof TextInput>["autoComplete"];
  maxLength?: number;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = invalid ? `${colors.emergency}99` : focused ? colors.primary : colors.border;

  return (
    <View>
      <View
        testID="app-input-container"
        style={[
          styles.container,
          { borderColor },
          invalid && styles.invalidBackground,
          !editable && styles.disabled,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={`${colors.mutedForeground}b3`}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      {hint ? <Text style={[styles.hint, { color: invalid ? colors.emergency : colors.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.26,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  container: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  invalidBackground: {
    backgroundColor: `${colors.emergency}0d`,
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: -0.19,
    color: colors.foreground,
  },
  hint: {
    marginTop: 8,
    paddingHorizontal: 4,
    fontSize: 14,
  },
});
