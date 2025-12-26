'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, CircleCheck as CheckCircle, UserCheck, Sparkles } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  time: string;
  type: string;
  created_at: string;
}

interface LessonSignup {
  id: string;
  session_id: string;
  participant_id: string;
  signed_up_at: string;
}

interface Attendance {
  id: string;
  session_id: string;
  participant_id: string;
  status: string;
  validated_by_volunteer_id: string | null;
}

export default function ParticipantLessonsPage() {
  const [participantId, setParticipantId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [signups, setSignups] = useState<LessonSignup[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { language } = useLanguage();
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { data: participantData } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!participantData) return;
      setParticipantId(participantData.id);

      const today = new Date().toISOString().split('T')[0];

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      const { data: spData, error: spError } = await supabase
        .from('session_participants')
        .select('*, sessions(*)')
        .eq('participant_id', participantData.id);

      if (spError) throw spError;

      const all = spData || [];
      setSignups(all.filter((s: any) => s.status === 'signed_up'));
      setAttendance(all.filter((s: any) => s.status !== 'signed_up'));
    } catch (error) {
      console.error('Error loading data:', error);
      setError(t('failed_load_lessons'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(sessionId: string) {
    if (!participantId) return;

    setError('');
    setSuccessMessage('');

    try {
      const { error: signupError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          status: 'signed_up',
        });

      if (signupError) throw signupError;

      setSuccessMessage(t('successfully_signed_up_lesson'));
      loadData();
    } catch (err: any) {
      setError(err.message || t('failed_sign_up_lesson'));
    }
  }

  async function handleCancelSignup(sessionId: string) {
    if (!participantId) return;

    setError('');
    setSuccessMessage('');

    try {
      const { error: deleteError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', participantId)
        .eq('status', 'signed_up');

      if (deleteError) throw deleteError;

      setSuccessMessage(t('signup_cancelled_success'));
      loadData();
    } catch (err: any) {
      setError(err.message || t('failed_cancel_signup'));
    }
  }

  async function handleCheckIn(sessionId: string) {
    if (!participantId) return;

    setError('');
    setSuccessMessage('');

    try {
      const { error: checkInError } = await supabase
        .from('session_participants')
        .upsert(
          {
            session_id: sessionId,
            participant_id: participantId,
            status: 'self_reported',
            marked_at: new Date().toISOString(),
          },
          { onConflict: ['session_id', 'participant_id'] }
        );

      if (checkInError) throw checkInError;

      setSuccessMessage(t('checked_in_here_today'));
      loadData();
    } catch (err: any) {
      setError(err.message || t('failed_check_in'));
    }
  }

  function isSignedUp(sessionId: string): boolean {
    return signups.some(s => s.session_id === sessionId);
  }

  function getAttendanceStatus(sessionId: string): Attendance | undefined {
    return attendance.find(a => a.session_id === sessionId);
  }

  function isToday(dateString: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
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

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4FBACA] via-[#3AA8BC] to-[#2A9FB4] rounded-2xl p-8 shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{t('upcoming_lessons_title')}</h2>
          <p className="text-xl text-white/90 font-medium mt-1">{t('view_signup_swim_lessons')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {sessions.length === 0 ? (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-[#E8F8FA] to-[#C0EEF2]">
            <CardContent className="py-12 text-center">
              <Calendar className="h-20 w-20 text-[#4FBACA]/50 mx-auto mb-4 animate-pulse" />
              <p className="text-[#443837] font-medium text-lg">{t('no_upcoming_lessons_participant')}</p>
              <p className="text-[#443837]/70 text-sm mt-2">{t('check_back_soon_opportunities')}</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session, index) => {
            const signedUp = isSignedUp(session.id);
            const attendanceStatus = getAttendanceStatus(session.id);
            const todayLesson = isToday(session.date);

            return (
              <Card
                key={session.id}
                className="border-0 shadow-xl bg-gradient-to-br from-white to-[#E8F8FA] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                style={{
                  animation: `slideIn 0.4s ease-out ${index * 0.1}s backwards`
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-2 rounded-lg">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-[#443837]">{formatDate(session.date)}</span>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-base text-[#443837]/80 pl-11">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-[#4FBACA]" />
                          <span className="font-semibold">{formatTime(session.time)}</span>
                        </div>
                        {todayLesson && (
                          <Badge className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] text-white border-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t('today')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {attendanceStatus ? (
                        <div className="flex items-center gap-2">
                          {attendanceStatus.status === 'present' && (
                            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('attendance_confirmed_badge')}
                            </Badge>
                          )}
                          {attendanceStatus.status === 'self_reported' && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-0 shadow-md">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {t('awaiting_validation_badge')}
                            </Badge>
                          )}
                          {attendanceStatus.status === 'absent' && (
                            <Badge variant="destructive">{t('marked_absent_badge')}</Badge>
                          )}
                        </div>
                      ) : signedUp ? (
                        <Badge className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] text-white border-0 shadow-md">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('signed_up')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 flex-wrap">
                    {!attendanceStatus && (
                      <>
                        {signedUp ? (
                          <>
                            {todayLesson && (
                              <Button
                                onClick={() => handleCheckIn(session.id)}
                                className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] hover:from-[#3AA8BC] hover:to-[#2A9FB4] text-white shadow-md"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {t('im_here_today')}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => handleCancelSignup(session.id)}
                              className="border-2 border-[#443837]/20 hover:border-[#443837]/40 text-[#443837]"
                            >
                              {t('cancel_signup_button')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleSignUp(session.id)}
                            className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] hover:from-[#FF6B6B] hover:to-[#FF5252] text-white shadow-md"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {t('sign_up_for_lesson')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
