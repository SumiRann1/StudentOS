import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, Platform, StatusBar, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { startOAuthLogin } from '../services/authApi';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0914" />

      {/* Cosmic Top Orbital Glow Graphic Elements */}
      <View style={styles.cosmicOrbitalBg}>
        <View style={styles.planetCircle} />
        <View style={styles.planetRing} />
        <View style={styles.planetRingOuter} />
        <View style={styles.ambientGlow} />
      </View>

      {/* Main Header / Branding */}
      <View style={styles.headerContainer}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>✨ AI ACADEMIC WORKSPACE</Text>
        </View>

        <View style={styles.logoBadge}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
        </View>

        <Text style={styles.heroTitle}>Student OS</Text>
        <Text style={styles.heroSubtitle}>Your intelligent campus copilot for courses, emails & schedules</Text>
      </View>

      {/* Features Showcase */}
      <View style={styles.featuresBox}>
        <View style={[styles.featureItem, { borderColor: 'rgba(16, 163, 127, 0.3)' }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 163, 127, 0.15)' }]}>
            <Text style={styles.featureIcon}>📚</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Google Classroom</Text>
            <Text style={styles.featureDesc}>Auto-sync coursework, deadlines & announcements</Text>
          </View>
        </View>

        <View style={[styles.featureItem, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Text style={styles.featureIcon}>✉️</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Gmail Assistant</Text>
            <Text style={styles.featureDesc}>Smart search, summary & AI email drafting</Text>
          </View>
        </View>

        <View style={[styles.featureItem, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Text style={styles.featureIcon}>📅</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Timetable Tracker</Text>
            <Text style={styles.featureDesc}>Class schedules & exam countdown alerts</Text>
          </View>
        </View>
      </View>

      {/* Authentication Section */}
      <View style={styles.authContainer}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Sign in with Google Account</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Single Google Sign In Button */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.85}>
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
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        <Text style={styles.termsText}>
          By signing in, you agree to our <Text style={styles.termsLink}>Terms</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0A0914',
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
    backgroundColor: 'rgba(26, 23, 62, 0.4)',
    position: 'absolute',
  },
  planetRing: {
    width: width * 1.3,
    height: width * 0.55,
    borderRadius: width * 0.65,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    transform: [{ rotate: '-28deg' }],
    position: 'absolute',
  },
  planetRingOuter: {
    width: width * 1.5,
    height: width * 0.65,
    borderRadius: width * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(16, 163, 127, 0.18)',
    transform: [{ rotate: '-15deg' }],
    position: 'absolute',
  },
  ambientGlow: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: 'rgba(16, 163, 127, 0.12)',
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 163, 127, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 163, 127, 0.3)',
    marginBottom: 16,
  },
  badgePillText: {
    color: '#10A37F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#141226',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2952',
    shadowColor: '#10A37F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
    fontWeight: '400',
  },

  /* Features List Box */
  featuresBox: {
    width: '100%',
    backgroundColor: '#121024',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242046',
    gap: 10,
    zIndex: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171430',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  featureDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
    backgroundColor: '#26224B',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#10A37F',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10A37F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    width: '100%',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  termsLink: {
    color: '#818CF8',
    fontWeight: '600',
  },
});
