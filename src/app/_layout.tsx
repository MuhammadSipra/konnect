import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { getPendingRole } from "../lib/pendingRole";

export default function Layout() {
  const router = useRouter();

  useEffect(() => {
    OTPWidget.initializeWidget('3667446a4f79373732303939', '555661TBCi9YjCmrdy6a6b2bb4P1');

    const routeAfterLogin = async () => {
      import { setCurrentProfile } from "../lib/currentProfile";
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) return;

      const authUserId = session.user.id;
      const role = getPendingRole();

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

        if (existingProfile) {
          setCurrentProfile(existingProfile.id, existingProfile.user_type);
          if (
            existingProfile.user_type === 'contractor' &&
            existingProfile.verification_status !== 'approved'
          ) {
            router.replace('/verification-pending');
          } else {
            router.replace(existingProfile.user_type === 'contractor' ? '/contractor' : '/customer');
          }
        }
        else {
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

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      console.log('INCOMING URL:', url);

      if (url.includes('access_token')) {
        const hashPart = url.split('#')[1] || url.split('?')[1];
        if (!hashPart) return;

        const params = new URLSearchParams(hashPart);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.log('SET SESSION ERROR:', error.message);
          } else {
            console.log('Session set from deep link!');
            await routeAfterLogin();
          }
        }
      }
    };

    // Handle the case where the link opened/resumed the app from cold start
    Linking.getInitialURL().then(handleUrl);

    // Handle the case where the link arrives while the app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
