'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPhone, getCurrentUser, getUserProfile, getRoleRedirectPath } from '@/lib/auth';
import { Language } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Waves, Languages } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const t = useTranslation(language);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  async function checkExistingAuth() {
    try {
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          router.push(getRoleRedirectPath(profile.role));
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await signInWithPhone(phone, password);
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          router.push(getRoleRedirectPath(profile.role));
        } else {
          setError(t('user_profile_not_found'));
        }
      }
    } catch (err: any) {
      setError(err.message || t('failed_sign_in'));
    } finally {
      setLoading(false);
    }
  }

  function toggleLanguage() {
    setLanguage(prev => prev === 'en' ? 'id' : 'en');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F8FA] to-[#F5F5F5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4FBACA] mx-auto"></div>
          <p className="mt-4 text-[#443837]/70">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F8FA] to-[#F5F5F5] p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#4FBACA]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#443837]/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-2 border-[#4FBACA]/20 relative z-10 bg-[#443837] backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center justify-center gap-3">
              <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-3 rounded-full shadow-lg">
                <Waves className="h-8 w-8 text-white" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-white/80 hover:text-white hover:bg-white/10 absolute top-4 right-4"
            >
              <Languages className="h-5 w-5 mr-2" />
              {language === 'en' ? 'ID' : 'EN'}
            </Button>
          </div>
          <CardTitle className="text-4xl font-bold text-center text-white">
            OceanFolx
          </CardTitle>
          <CardDescription className="text-center text-white/80 text-base">
            {t('welcome_back_sign_in')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white font-medium">{t('phone_number')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={`${t('phone_placeholder')} ${t('or')} 0812345678`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
                className="border-2 border-[#4FBACA]/30 focus:border-[#4FBACA] transition-colors h-11 bg-white"
              />
              <p className="text-xs text-white/70">{t('enter_phone_country_code')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-2 border-[#4FBACA]/30 focus:border-[#4FBACA] transition-colors h-11 bg-white"
              />
            </div>
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] hover:from-[#3AA8BC] hover:to-[#4FBACA] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={loading}
            >
              {loading ? t('signing_in') : t('sign_in')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-xs text-center text-white/70">
              {t('need_access_contact_admin')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
