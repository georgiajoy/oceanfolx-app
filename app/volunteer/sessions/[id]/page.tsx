'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Session, Participant, Attendance } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, UserCheck, Users, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ParticipantWithUser extends Participant {
  user?: {
    full_name?: string;
  };
}

interface AttendanceWithParticipant extends Attendance {
  participant: ParticipantWithUser;
}

interface LessonSignup {
  id: string;
  session_id: string;
  participant_id: string;
  signed_up_at: string;
}

interface SignupWithParticipant extends LessonSignup {
  participant: ParticipantWithUser;
}

export default function SessionCheckInPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const [language, setLanguage] = useState<Language>('en');
  const [session, setSession] = useState<Session | null>(null);
  const [signups, setSignups] = useState<SignupWithParticipant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithParticipant[]>([]);
  const [volunteerId, setVolunteerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [allParticipants, setAllParticipants] = useState<ParticipantWithUser[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const t = useTranslation(language);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setLanguage(profile.preferred_language);
          setVolunteerId(user.id);
        }
      }

      const [sessionResult, spResult, participantsResult] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
        supabase
          .from('session_participants')
          .select('*, participant:participants(*, user:users(full_name))')
          .eq('session_id', sessionId)
          .order('signed_up_at'),
        supabase
          .from('participants')
          .select('*, user:users(full_name)')
          .order('user(full_name)'),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (spResult.error) throw spResult.error;
      if (participantsResult.error) throw participantsResult.error;

      setSession(sessionResult.data);
      const spAll = spResult.data || [];
      setSignups((spAll as any[]).filter(s => s.status === 'signed_up'));
      setAttendance((spAll as any[]).filter(s => s.status !== 'signed_up'));
      setAllParticipants(participantsResult.data as any[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function confirmAttendance(participantId: string) {
    try {
      await supabase.from('session_participants').upsert(
        {
          session_id: sessionId,
          participant_id: participantId,
          status: 'present',
          validated_by_volunteer_id: volunteerId,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,participant_id' }
      );

      loadData();
    } catch (error) {
      console.error('Error confirming attendance:', error);
    }
  }

  async function markAbsent(participantId: string) {
    try {
      await supabase.from('session_participants').upsert(
        {
          session_id: sessionId,
          participant_id: participantId,
          status: 'absent',
          validated_by_volunteer_id: volunteerId,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,participant_id' }
      );

      loadData();
    } catch (error) {
      console.error('Error marking absent:', error);
    }
  }

  async function addParticipantToSession() {
    if (!selectedParticipantId) return;

    try {
      setAddingParticipant(true);
      await supabase.from('session_participants').insert({
        session_id: sessionId,
        participant_id: selectedParticipantId,
        status: 'signed_up',
        signed_up_at: new Date().toISOString(),
      });

      setSelectedParticipantId('');
      loadData();
    } catch (error) {
      console.error('Error adding participant:', error);
    } finally {
      setAddingParticipant(false);
    }
  }

  const needsValidation = attendance.filter(a => a.status === 'self_reported');
  const notCheckedIn = signups.filter(
    s => !attendance.find(a => a.participant_id === s.participant_id)
  );
  const confirmedAttendance = attendance.filter(a => a.status === 'present');
  const markedAbsent = attendance.filter(a => a.status === 'absent');

  // Get participants not already in this session
  const enrolledParticipantIds = new Set([
    ...signups.map(s => s.participant_id),
    ...attendance.map(a => a.participant_id),
  ]);
  const availableParticipants = allParticipants.filter(
    p => !enrolledParticipantIds.has(p.id)
  );

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Lesson not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">Lesson Attendance</h2>
        <p className="mt-2 text-sm text-[#443837]/70">
          {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          - {session.time.slice(0, 5)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Participant to Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a participant..." />
              </SelectTrigger>
              <SelectContent>
                {availableParticipants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.user?.full_name || 'Unnamed Participant'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={addParticipantToSession}
              disabled={!selectedParticipantId || addingParticipant}
              className="bg-[#4FBACA] hover:bg-[#4FBACA]/90"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add to Session
            </Button>
          </div>
          {availableParticipants.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">All participants are already enrolled in this session</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{needsValidation.length}</div>
              <div className="text-sm text-gray-600 mt-1">Needs Validation</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{notCheckedIn.length}</div>
              <div className="text-sm text-gray-600 mt-1">Not Checked In</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{confirmedAttendance.length}</div>
              <div className="text-sm text-gray-600 mt-1">Confirmed Attendance</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {needsValidation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Needs Validation ({needsValidation.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsValidation.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">{att.participant.user?.full_name || att.participant.full_name}</div>
                      <div className="text-xs text-gray-600">Self checked-in</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => confirmAttendance(att.participant_id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm Attendance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => markAbsent(att.participant_id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {notCheckedIn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Users className="h-5 w-5" />
              Not Checked In ({notCheckedIn.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notCheckedIn.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">{signup.participant.user?.full_name || signup.participant.full_name}</div>
                      <div className="text-xs text-gray-600">Signed up for lesson</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => confirmAttendance(signup.participant_id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm Attendance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => markAbsent(signup.participant_id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {confirmedAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Confirmed Attendance ({confirmedAttendance.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {confirmedAttendance.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">{att.participant.user?.full_name || att.participant.full_name}</div>
                      <div className="text-xs text-gray-600">Attendance confirmed</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => markAbsent(att.participant_id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Mark Absent
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {markedAbsent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Marked Absent ({markedAbsent.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {markedAbsent.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">{att.participant.user?.full_name || att.participant.full_name}</div>
                      <div className="text-xs text-gray-600">Marked as absent</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => confirmAttendance(att.participant_id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirm Attendance
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {needsValidation.length === 0 && notCheckedIn.length === 0 && confirmedAttendance.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No participants have signed up for this lesson yet
          </CardContent>
        </Card>
      )}
    </div>
  );
}
