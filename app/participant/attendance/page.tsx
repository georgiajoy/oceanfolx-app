'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, Participant, Session, Attendance } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CircleCheck as CheckCircle, Calendar, Waves, TrendingUp, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AttendanceWithSession extends Attendance {
  session: Session;
}

export default function ParticipantAttendancePage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [attendance, setAttendance] = useState<AttendanceWithSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInMessage, setCheckInMessage] = useState('');
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

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*, user:users(full_name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) throw participantError;
      const pData = participantData as any;
      setParticipant(pData ? { ...pData, full_name: pData.user?.full_name || pData.full_name || '' } : null);

      if (participantData) {
        const today = new Date().toISOString().split('T')[0];

        const [attendanceResult, todaySessionsResult] = await Promise.all([
          supabase
            .from('attendance')
            .select('*, session:sessions(*)')
            .eq('participant_id', participantData.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sessions')
            .select('*')
            .eq('date', today)
            .order('time'),
        ]);

        if (attendanceResult.error) throw attendanceResult.error;
        if (todaySessionsResult.error) throw todaySessionsResult.error;

        setAttendance(attendanceResult.data as AttendanceWithSession[]);
        setTodaySessions(todaySessionsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelfCheckIn(sessionId: string) {
    if (!participant) return;

    try {
      setCheckInMessage('');

      const existing = attendance.find(
        a => a.session_id === sessionId && a.participant_id === participant.id
      );

      if (existing) {
        setCheckInMessage(language === 'en'
          ? 'You have already checked in for this session'
          : 'Anda sudah check-in untuk sesi ini');
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .insert({
          session_id: sessionId,
          participant_id: participant.id,
          status: 'self_reported',
        });

      if (error) throw error;

      setCheckInMessage(language === 'en'
        ? 'Check-in successful! Please wait for volunteer validation.'
        : 'Check-in berhasil! Silakan tunggu validasi relawan.');

      loadData();
    } catch (error: any) {
      console.error('Error checking in:', error);
      setCheckInMessage(error.message || 'Failed to check in');
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  if (!participant) {
    return <div className="text-center py-8">Profile not found</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4FBACA] via-[#3AA8BC] to-[#2A9FB4] rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }}></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{t('my_attendance')}</h2>
          <p className="text-xl text-white/90 font-medium mt-1">{t('attendance')} {t('status')}</p>
        </div>
      </div>

      {todaySessions.length > 0 && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#FF8E53]/10 via-[#FFE8CC] to-[#FFF4E6] overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FF8E53]/20 to-[#FF6B6B]/20 rounded-full opacity-30 blur-3xl"></div>
          <CardHeader className="relative pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="bg-gradient-to-br from-[#FF8E53] to-[#FF6B6B] p-3 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] bg-clip-text text-transparent">{t('today_sessions')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {todaySessions.map((session, index) => {
                const hasCheckedIn = attendance.some(
                  a => a.session_id === session.id
                );
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-[#FFF4E6] border-2 border-[#FF8E53]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
                    style={{
                      animation: `slideIn 0.4s ease-out ${index * 0.1}s backwards`
                    }}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-lg text-[#443837]">{session.type.replace('_', ' ')}</div>
                      <div className="text-sm text-[#443837]/70 font-medium flex items-center gap-2">
                        <Waves className="h-4 w-4 text-[#4FBACA]" />
                        {session.time}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSelfCheckIn(session.id)}
                      disabled={hasCheckedIn}
                      className={hasCheckedIn
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                        : "bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] hover:from-[#3AA8BC] hover:to-[#2A9FB4] text-white shadow-md"}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {hasCheckedIn ? t('validated') : t('check_in')}
                    </Button>
                  </div>
                );
              })}
            </div>
            {checkInMessage && (
              <Alert className="mt-6 bg-white/80 border-2 border-[#4FBACA]">
                <AlertDescription className="text-[#443837]">{checkInMessage}</AlertDescription>
              </Alert>
            )}
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
            <span className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] bg-clip-text text-transparent">{t('attendance')} {t('recent_attendance')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="bg-white/80 rounded-xl overflow-hidden shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#4FBACA]/20 to-[#3AA8BC]/20">
                  <TableHead className="font-bold text-[#443837]">{t('date')}</TableHead>
                  <TableHead className="font-bold text-[#443837]">{t('time')}</TableHead>
                  <TableHead className="font-bold text-[#443837]">{t('type')}</TableHead>
                  <TableHead className="font-bold text-[#443837]">{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-[#4FBACA]/50 mx-auto mb-3 animate-pulse" />
                      <p className="text-[#443837] font-medium">{t('no_data')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((record) => (
                    <TableRow key={record.id} className="hover:bg-[#4FBACA]/5 transition-colors">
                      <TableCell className="font-medium text-[#443837]">
                        {new Date(record.session.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-[#443837]/80">{record.session.time}</TableCell>
                      <TableCell className="text-[#443837]/80">{record.session.type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.status === 'present'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0'
                              : record.status === 'self_reported'
                              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-0'
                              : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0'
                          }
                        >
                          {t(record.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
