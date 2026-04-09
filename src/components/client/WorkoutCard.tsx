import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface WorkoutCardProps {
  workout: {
    id: string;
    title: string;
    duration: string;
    calories?: string;
  };
}

const WorkoutCard = ({ workout }: WorkoutCardProps) => {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.emoji}>🏋️</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏱️</Text>
          <Text style={styles.duration}>{workout.duration}</Text>
        </View>
        {workout.calories && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🔥</Text>
            <Text style={styles.calories}>{workout.calories} cal</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  emoji: {
    fontSize: 24,
  },
  details: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailIcon: {
    fontSize: 14,
  },
  duration: {
    fontSize: 14,
    color: "#666",
  },
  calories: {
    fontSize: 14,
    color: "#666",
  },
});

export default WorkoutCard;
