import { OTPWidget } from '@msg91comm/sendotp-react-native';
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { AppAlertHost } from "../lib/AppAlert";
import { ThemeProvider } from "../lib/ThemeContext";
import { hydrateCurrentProfile, setCurrentProfile } from "../lib/currentProfile";
import { setPendingGoogleTokens } from "../lib/pendingGoogleSession";
import { resolvePendingRole } from "../lib/pendingRole";
import { findProfileByEmail } from "../lib/profileLookup";
import { supabase } from "../lib/supabase";

function decodeJwtEmail(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    return parsed.email || null;
  } catch {
    return null;
  }
}

export default function Layout() {
  const router = useRouter();

  useEffect(() => {
    OTPWidget.initializeWidget('3667446a4f79373732303939', '555661TBCi9YjCmrdy6a6b2bb4P1');

    let hasRouted = false;
    let lastProcessedToken: string | null = null;

    // One person = one profile (one role). Find by login id first, then by
    // email (any role) and link it the first time this Google account is used.
    const linkOrFindProfile = async (authUserId: string, email: string | null) => {
      const { data: byAuthId } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (byAuthId) return byAuthId;

      if (email) {
        const byEmail = await findProfileByEmail(email);
        if (byEmail && !byEmail.auth_user_id) {
          await supabase.from('profiles').update({ auth_user_id: authUserId }).eq('id', byEmail.id);
          return { ...byEmail, auth_user_id: authUserId };
        }
      }

      return null;
    };

    // Used only for the "already fully logged in, app reopened" path — a real
    // Supabase session already exists here (set at the end of a PAST
    // successful OTP verification, and persisted by AsyncStorage).
    const routeForSession = async (session: any) => {
      if (!session?.user) return;

      const authUserId = session.user.id;
      const role = (await resolvePendingRole()) ?? 'client';

      const existingProfile = await linkOrFindProfile(authUserId, session.user.email || null);

      if (existingProfile) {
        setCurrentProfile(existingProfile.id, existingProfile.user_type);
        router.dismissAll();
        if (
          existingProfile.user_type === 'contractor' &&
          existingProfile.verification_status !== 'approved'
        ) {
          router.replace('/verification-pending');
        } else {
          router.replace(existingProfile.user_type === 'contractor' ? '/contractor' : '/customer');
        }
      } else {
        router.dismissAll();
        router.replace({
          pathname: '/signup',
          params: {
            role,
            phone: session.user.phone || '',
            email: session.user.email || '',
          },
        });
      }
    };

    // Google OAuth deep-link handler. Does NOT call setSession here — the
    // tokens are held in memory and only become a real session after the
    // email OTP is verified (see otp.tsx).
    const handleUrl = async (url: string | null): Promise<boolean> => {
      if (!url || !url.includes('access_token')) return false;

      const hashPart = url.split('#')[1] || url.split('?')[1];
      if (!hashPart) return false;

      const params = new URLSearchParams(hashPart);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return false;

      // Same URL can arrive twice (initial URL + event). A NEW login has a new token.
      if (access_token === lastProcessedToken) return false;
      lastProcessedToken = access_token;

      const email = decodeJwtEmail(access_token);
      if (!email) {
        console.log('Could not read email from Google token');
        return true;
      }

      // The role the user tapped on the welcome screen (survives an app restart).
      const role = await resolvePendingRole();
      if (!role) {
        hasRouted = true;
        Alert.alert("Please try again", "Please choose whether you are a Contractor or a Client, then sign in again.");
        router.replace('/welcome');
        return true;
      }

      try {
        const response = await OTPWidget.sendOTP({ identifier: email });
        if (response.type === 'success') {
          hasRouted = true;
          setPendingGoogleTokens(access_token, refresh_token);
          router.replace({
            pathname: '/otp',
            params: {
              mode: 'google',
              email,
              role,
              reqId: response.message,
            },
          });
        } else {
          console.log('GOOGLE EMAIL OTP SEND FAILED:', JSON.stringify(response));
          Alert.alert("Error", "Could not send verification code. Please try again.");
        }
      } catch (err) {
        console.log('GOOGLE EMAIL OTP ERROR:', err);
        Alert.alert("Error", "Could not send verification code. Please try again.");
      }

      return true;
    };

    const runInitialCheck = async () => {
      const hydrated = await hydrateCurrentProfile();

      if (hasRouted) return;

      if (hydrated) {
        hasRouted = true;
        router.dismissAll();
        if (hydrated.role === 'contractor') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('verification_status')
            .eq('id', hydrated.id)
            .maybeSingle();
          if (profile && profile.verification_status !== 'approved') {
            router.replace('/verification-pending');
          } else {
            router.replace('/contractor');
          }
        } else {
          router.replace('/customer');
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user) {
        hasRouted = true;
        await routeForSession(session);
      } else if (!hasRouted) {
        hasRouted = true;
        router.dismissAll();
        router.replace('/welcome');
      }
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      const handled = await handleUrl(initialUrl);
      if (!handled) {
        await runInitialCheck();
      }
    };
    init();

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <AppAlertHost />
    </ThemeProvider>
  );
}