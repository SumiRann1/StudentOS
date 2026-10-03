import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, Platform, StatusBar, Dimensions, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { startOAuthLogin } from '../services/authApi';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await startOAuthLogin('google');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initiate Google Sign-In');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Cosmic Top Orbital Glow Graphic Elements */}
      <View style={styles.cosmicOrbitalBg}>
        <View style={[styles.planetCircle, { backgroundColor: colors.primaryGlow }]} />
        <View style={[styles.planetRing, { borderColor: colors.cardBorderHover }]} />
        <View style={[styles.planetRingOuter, { borderColor: colors.cardBorder }]} />
        <View style={[styles.ambientGlow, { backgroundColor: colors.primaryGlow }]} />
      </View>

      {/* Central Glass Card container */}
      <View style={styles.cardWrapper}>
        <View style={[styles.glassCard, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorderHover }]}>
          {/* Main Header / Branding */}
          <View style={styles.headerContainer}>
            <View style={[styles.badgePill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
              <Text style={[styles.badgePillText, { color: colors.primary }]}>✦ ACADEMIC WORKSPACE</Text>
            </View>

            <View style={[styles.logoBadge, { borderColor: colors.primary, backgroundColor: colors.cardBackground }]}>
              <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
            </View>

            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Student OS</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Your unified workspace for courses, emails & schedules</Text>
          </View>

          {/* Features Showcase */}
          <View style={[styles.featuresBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <View style={[styles.featureItem, { borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <Text style={[styles.featureIconText, { color: colors.primary }]}>CLASS</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Google Classroom</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Auto-sync coursework, deadlines & announcements</Text>
              </View>
            </View>

            <View style={[styles.featureItem, { borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <Text style={[styles.featureIconText, { color: colors.primary }]}>MAIL</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Gmail Assistant</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Smart search, summary & AI email drafting</Text>
              </View>
            </View>

            <View style={[styles.featureItem, { borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <Text style={[styles.featureIconText, { color: colors.primary }]}>TIME</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Timetable Tracker</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Class schedules & exam countdown alerts</Text>
              </View>
            </View>
          </View>

          {/* Authentication Section */}
          <View style={styles.authContainer}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>Sign in with Google Account</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            </View>

            {/* Single Google Sign In Button */}
            <TouchableOpacity style={[styles.googleBtn, { backgroundColor: colors.primary }]} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <View style={styles.gLogoContainer}>
                    <Text style={styles.gLogoText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            )}

            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              By signing in, you agree to our <Text style={[styles.termsLink, { color: colors.primary }]}>Terms</Text> & <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    zIndex: 10,
  },
  glassCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(24px)' } : {}),
  },

  /* Cosmic Orbital Background Visuals */
  cosmicOrbitalBg: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: width * 1.2,
    height: width * 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  planetCircle: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    position: 'absolute',
    opacity: 0.15,
  },
  planetRing: {
    width: width * 1.1,
    height: width * 0.45,
    borderRadius: width * 0.55,
    borderWidth: 1.5,
    transform: [{ rotate: '-28deg' }],
    position: 'absolute',
    opacity: 0.2,
  },
  planetRingOuter: {
    width: width * 1.3,
    height: width * 0.55,
    borderRadius: width * 0.65,
    borderWidth: 1,
    transform: [{ rotate: '-15deg' }],
    position: 'absolute',
    opacity: 0.1,
  },
  ambientGlow: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    position: 'absolute',
    top: 40,
    opacity: 0.25,
  },

  /* Header Section */
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 13.5,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },

  /* Features List Box */
  featuresBox: {
    width: '100%',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  featureIconText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },

  /* Auth CTA Area */
  authContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  googleBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gLogoContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gLogoText: {
    color: '#4285F4',
    fontSize: 15,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },
  termsLink: {
    fontWeight: '700',
  },
});

