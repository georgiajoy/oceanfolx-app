'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Session } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users } from 'lucide-react';

interface SessionWithDetails extends Session {
  participant_count?: number;
  attendance_pending?: number;
}

export default function LocalLeaderSessionsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push('/local_leader/login');
        return;
      }

      const profile = await getUserProfile(user.id);
      if (profile) {
        setLanguage(profile.preferred_language);
      }

      const today = new Date().toISOString().split('T')[0];

      // Get all sessions (local leaders can view and manage all sessions)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Get participant counts and pending attendance for each session
      const { data: sessionParticipants } = await supabase
        .from('session_participants')
        .select('session_id, status');

      const sessionStats = (sessionParticipants || []).reduce((acc, sp) => {
        if (!acc[sp.session_id]) {
          acc[sp.session_id] = { total: 0, pending: 0 };
        }
        acc[sp.session_id].total += 1;
        if (sp.status === 'self_reported') {
          acc[sp.session_id].pending += 1;
        }
        return acc;
      }, {} as Record<string, { total: number; pending: number }>);

      const sessionsWithDetails = (sessionsData || []).map(session => ({
        ...session,
        participant_count: sessionStats[session.id]?.total || 0,
        attendance_pending: sessionStats[session.id]?.pending || 0,
      }));

      setSessions(sessionsWithDetails);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(timeString: string): string {
    return timeString.slice(0, 5);
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">{t('lessons')}</h2>
        <p className="text-sm text-[#443837]/70 mt-1">Manage lessons and mark attendance</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('upcoming_lessons')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">{t('no_upcoming_lessons')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('upcoming_lessons')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('time')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Pending Validation</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{formatDate(session.date)}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(session.time)}
                      </TableCell>
                      <TableCell>{session.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.participant_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {(session.attendance_pending || 0) > 0 ? (
                          <Badge variant="secondary">{session.attendance_pending}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/local_leader/sessions/${session.id}`)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
