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

      {/* Main Header / Branding */}
      <View style={styles.headerContainer}>
        <View style={[styles.badgePill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
          <Text style={[styles.badgePillText, { color: colors.primary }]}>ACADEMIC WORKSPACE</Text>
        </View>

        <View style={[styles.logoBadge, { borderColor: colors.cardBorderHover, backgroundColor: colors.cardBackground }]}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
        </View>

        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Student OS</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Your unified workspace for courses, emails & schedules</Text>
      </View>

      {/* Features Showcase */}
      <View style={[styles.featuresBox, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
        <View style={[styles.featureItem, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            <Text style={[styles.featureIconText, { color: colors.primary }]}>CLASS</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Google Classroom</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Auto-sync coursework, deadlines & announcements</Text>
          </View>
        </View>

        <View style={[styles.featureItem, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            <Text style={[styles.featureIconText, { color: colors.primary }]}>MAIL</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Gmail Assistant</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Smart search, summary & AI email drafting</Text>
          </View>
        </View>

        <View style={[styles.featureItem, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 40) : 54,
    paddingBottom: 36,
  },

  /* Cosmic Orbital Background Visuals */
  cosmicOrbitalBg: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: width * 1.5,
    height: width * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  planetCircle: {
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.475,
    position: 'absolute',
  },
  planetRing: {
    width: width * 1.3,
    height: width * 0.55,
    borderRadius: width * 0.65,
    borderWidth: 1.5,
    transform: [{ rotate: '-28deg' }],
    position: 'absolute',
  },
  planetRingOuter: {
    width: width * 1.5,
    height: width * 0.65,
    borderRadius: width * 0.75,
    borderWidth: 1,
    transform: [{ rotate: '-15deg' }],
    position: 'absolute',
  },
  ambientGlow: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    position: 'absolute',
    top: 50,
  },

  /* Header Section */
  headerContainer: {
    alignItems: 'center',
    marginTop: 12,
    zIndex: 2,
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
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  logoImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
    fontWeight: '500',
  },

  /* Features List Box */
  featuresBox: {
    width: '100%',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    zIndex: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  featureIconText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  /* Auth CTA Area */
  authContainer: {
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
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
    fontSize: 11.5,
    fontWeight: '700',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  googleBtn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gLogoContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gLogoText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  errorBox: {
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  termsLink: {
    fontWeight: '700',
  },
});
