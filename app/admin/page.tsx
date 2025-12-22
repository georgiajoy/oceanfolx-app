'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Session } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, CalendarPlus, Package, Calendar, Clock, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setLanguage(profile.preferred_language);
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const [todayResult, upcomingResult] = await Promise.all([
        supabase
          .from('sessions')
          .select('*')
          .eq('date', today)
          .order('time'),
        supabase
          .from('sessions')
          .select('*')
          .gte('date', tomorrowStr)
          .order('date')
          .order('time')
          .limit(5),
      ]);

      if (todayResult.error) throw todayResult.error;
      if (upcomingResult.error) throw upcomingResult.error;

      setTodaySessions(todayResult.data || []);
      setUpcomingSessions(upcomingResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4FBACA] via-[#3AA8BC] to-[#2A9FB4] rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }}></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{t('admin_dashboard')}</h2>
          <p className="text-xl text-white/90 font-medium mt-1">{t('manage_swim_program')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button
          onClick={() => router.push('/admin/users')}
          className="h-24 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] hover:from-[#3AA8BC] hover:to-[#2A9FB4] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-8 w-8" />
            <span className="text-lg font-semibold">{t('add_user')}</span>
          </div>
        </Button>

        <Button
          onClick={() => router.push('/admin/sessions')}
          className="h-24 bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] hover:from-[#FF6B6B] hover:to-[#FF5252] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col items-center gap-2">
            <CalendarPlus className="h-8 w-8" />
            <span className="text-lg font-semibold">{t('add_lesson')}</span>
          </div>
        </Button>

        <Button
          onClick={() => router.push('/admin/gear-assignments')}
          className="h-24 bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] hover:from-[#8E44AD] hover:to-[#7D3C98] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col items-center gap-2">
            <Package className="h-8 w-8" />
            <span className="text-lg font-semibold">{t('assign_gear')}</span>
          </div>
        </Button>
      </div>

      {todaySessions.length > 0 && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#FF8E53]/10 via-[#FFE8CC] to-[#FFF4E6] overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FF8E53]/20 to-[#FF6B6B]/20 rounded-full opacity-30 blur-3xl"></div>
          <CardHeader className="relative pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="bg-gradient-to-br from-[#FF8E53] to-[#FF6B6B] p-3 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] bg-clip-text text-transparent">{t('todays_lessons')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {todaySessions.map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-[#FFF4E6] border-2 border-[#FF8E53]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  style={{
                    animation: `slideIn 0.4s ease-out ${index * 0.1}s backwards`
                  }}
                  onClick={() => router.push('/admin/sessions')}
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] text-white border-0 text-sm py-1 px-3">
                      {session.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-2 text-[#443837]/70 font-medium">
                      <Clock className="h-4 w-4 text-[#FF8E53]" />
                      {session.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#E8F8FA] via-[#D4F3F6] to-[#C0EEF2] overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#4FBACA]/30 to-[#3AA8BC]/30 rounded-full opacity-30 blur-3xl"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-3 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] bg-clip-text text-transparent">{t('upcoming_lessons')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-[#4FBACA]/50 mx-auto mb-3" />
              <p className="text-[#443837] font-medium">{t('no_upcoming_lessons')}</p>
              <Button
                onClick={() => router.push('/admin/sessions')}
                className="mt-4 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] hover:from-[#3AA8BC] hover:to-[#2A9FB4] text-white"
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                {t('create_new_lesson')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session, index) => (
                <div
                  key={session.id}
                  className="group relative p-5 bg-gradient-to-r from-white to-[#E8F8FA] border-2 border-[#4FBACA]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-[#4FBACA]"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s backwards`
                  }}
                  onClick={() => router.push('/admin/sessions')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] text-white border-0 text-sm py-1 px-3">
                        {session.type.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center gap-2 text-[#443837] font-semibold">
                        <Calendar className="h-4 w-4 text-[#4FBACA]" />
                        {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-[#443837]/70 font-medium">
                        <Clock className="h-4 w-4 text-[#3AA8BC]" />
                        {session.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
