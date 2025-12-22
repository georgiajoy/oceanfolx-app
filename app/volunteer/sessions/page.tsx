'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Session } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink, Users } from 'lucide-react';

interface SessionWithSignups extends Session {
  signup_count?: number;
}

export default function VolunteerSessionsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [sessions, setSessions] = useState<SessionWithSignups[]>([]);
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

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (sessionsError) throw sessionsError;

      const { data: signupsData } = await supabase
        .from('lesson_signups')
        .select('session_id');

      const signupCounts = (signupsData || []).reduce((acc, signup) => {
        acc[signup.session_id] = (acc[signup.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sessionsWithCounts = (sessionsData || []).map(session => ({
        ...session,
        signup_count: signupCounts[session.id] || 0,
      }));

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(timeString: string): string {
    return timeString.slice(0, 5);
  }

  function isToday(dateString: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">Upcoming Lessons</h2>
        <p className="text-sm text-[#443837]/70 mt-1">View and manage attendance for upcoming lessons</p>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No upcoming lessons scheduled
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className={isToday(session.date) ? 'border-blue-500 border-2' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDate(session.date)}
                      {isToday(session.date) && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                          Today
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(session.time)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {session.signup_count} signed up
                      </div>
                    </div>
                  </div>
                  <Link href={`/volunteer/sessions/${session.id}`}>
                    <Button>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Attendance
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
