'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth';
import { UserProfile } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { LanguageProvider, useLanguage } from '@/lib/language-context';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Users, Calendar, Award, LayoutDashboard, LogOut, UserCog, Package, Menu } from 'lucide-react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, updateLanguage } = useLanguage();
  const t = useTranslation(language);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }

      const userProfile = await getUserProfile(user.id);
      if (!userProfile || userProfile.role !== 'admin') {
        router.push('/');
        return;
      }

      setProfile(userProfile);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleLanguageChange(newLang: 'en' | 'id') {
    try {
      await updateLanguage(newLang);
    } catch (error) {
      console.error('Error updating language:', error);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/admin/users', icon: UserCog, label: t('users') },
    { href: '/admin/participants', icon: Users, label: t('participants') },
    { href: '/admin/sessions', icon: Calendar, label: t('lessons') },
    { href: '/admin/skills', icon: Award, label: t('skills') },
    { href: '/admin/gear', icon: Package, label: t('gear') },
    { href: '/admin/gear-assignments', icon: Package, label: t('assignments') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F8FA] to-[#F5F5F5]">
      <nav className="bg-gradient-to-r from-[#443837] to-[#5A4A47] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden text-white hover:text-white hover:bg-white/20 mr-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-gradient-to-b from-[#443837] to-[#5A4A47] text-white border-r-[#4FBACA]/20">
                  <SheetHeader>
                    <SheetTitle className="text-left bg-gradient-to-r from-[#4FBACA] to-[#6DD5ED] bg-clip-text text-transparent">
                      OceanFolx Admin
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#4FBACA] to-[#6DD5ED] bg-clip-text text-transparent drop-shadow-sm">OceanFolx</h1>
              </div>

              <div className="hidden lg:ml-6 lg:flex lg:space-x-4 xl:space-x-6">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#4FBACA] text-sm font-medium text-white/90 hover:text-white transition-colors"
                    >
                      <Icon className="h-4 w-4 mr-1.5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher currentLanguage={language} onLanguageChange={handleLanguageChange} />
              <Button
                size="sm"
                onClick={handleLogout}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </LanguageProvider>
  );
}
