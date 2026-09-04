import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';

const PROMPT_CARDS = [
  {
    icon: '📅',
    title: "Today's Timetable",
    desc: 'Check class schedule, room numbers & lunch breaks',
    prompt: 'What is on my timetable today?',
  },
  {
    icon: '📚',
    title: 'Classroom Assignments',
    desc: 'Track upcoming deadlines & posted coursework',
    prompt: 'List my Google Classroom assignments',
  },
  {
    icon: '✉️',
    title: 'Student Emails',
    desc: 'Read recent messages & search inbox',
    prompt: 'Check my unread student emails',
  },
  {
    icon: '📝',
    title: 'Study & Planning',
    desc: 'Organize exam prep & study timetables',
    prompt: 'Help me plan my study schedule for exams',
  },
];

export default function ClaudeLandingHero({ onSelectPrompt }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      {/* App Logo & Warm Greeting */}
      <View style={styles.headerContainer}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
        </View>
        <Text style={styles.greetingText}>{getGreeting()}, Student</Text>
        <Text style={styles.subtitleText}>How can Student OS assist your academics today?</Text>
      </View>

      {/* 2x2 Claude Prompt Cards Grid */}
      <View style={styles.gridContainer}>
        {PROMPT_CARDS.map((card, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.card}
            onPress={() => onSelectPrompt(card.prompt)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {card.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  gridContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
