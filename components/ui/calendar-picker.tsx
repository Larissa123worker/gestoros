import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEK_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function DayButton({ day, isSelected, isToday, onPress }: { day: number; isSelected: boolean; isToday: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.dayWrapper, anim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.85))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={[
          styles.dayBtn,
          isSelected && styles.dayBtnSelected,
          isToday && !isSelected && styles.dayBtnToday,
        ]}
      >
        <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayTextToday]}>
          {day}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function CalendarPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstWeekday(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const isSelectedDay = (d: number) =>
    value.getFullYear() === viewYear &&
    value.getMonth() === viewMonth &&
    value.getDate() === d;

  const isToday = (d: number) =>
    now.getFullYear() === viewYear &&
    now.getMonth() === viewMonth &&
    now.getDate() === d;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.container}>
      {/* Navigation */}
      <View style={styles.nav}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={20} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS_PT[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={20} color="#FAFAFA" />
        </Pressable>
      </View>

      {/* Week headers */}
      <View style={styles.weekRow}>
        {WEEK_PT.map((w) => (
          <Text key={w} style={styles.weekText}>{w}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {cells.map((day, i) =>
          day === null ? (
            <View key={`empty-${i}`} style={styles.dayWrapper} />
          ) : (
            <DayButton
              key={`day-${day}`}
              day={day}
              isSelected={isSelectedDay(day)}
              isToday={isToday(day)}
              onPress={() => onChange(new Date(viewYear, viewMonth, day))}
            />
          )
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#18181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 20,
    gap: 16,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FAFAFA",
    letterSpacing: -0.3,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayWrapper: {
    width: "14.285714%",
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtn: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnSelected: {
    backgroundColor: "#D9FF3F",
  },
  dayBtnToday: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderWidth: 1,
    borderColor: "#D9FF3F",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A1A1AA",
  },
  dayTextSelected: {
    color: "#09090B",
    fontWeight: "900",
  },
  dayTextToday: {
    color: "#D9FF3F",
    fontWeight: "900",
  },
});
