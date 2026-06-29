'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Participant, LessonNote } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import LessonNotesSection from '@/components/LessonNotesSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Users, Plus, Search } from 'lucide-react';

interface ParticipantWithStatus extends Participant {
  status?: 'signed_up' | 'present' | 'self_reported';
  user?: { full_name: string };
}

interface SessionDetail {
  id: string;
  date: string;
  time: string;
  type: string;
  created_at: string;
}

export default function LocalLeaderSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;

  const [language, setLanguage] = useState<Language>('en');
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithStatus[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
    const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
    const [currentUserId, setCurrentUserId] = useState('');
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push('/local_leader/login');
        return;
      }
        setCurrentUserId(user.id);

      const profile = await getUserProfile(user.id);
      if (profile) {
        setLanguage(profile.preferred_language);
      }

      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) {
        router.push('/local_leader/sessions');
        return;
      }

      setSession(sessionData);

      // Load participants in this session
      const { data: sessionParticipantsData, error: spError } = await supabase
        .from('session_participants')
        .select('*, participant:participants(*, user:users(full_name))')
        .eq('session_id', sessionId);

      if (spError) throw spError;

      const sessionParticipantsList = (sessionParticipantsData || []).map((sp: any) => ({
        ...sp.participant,
        status: sp.status,
        user: sp.participant?.user,
      }));

      setParticipants(sessionParticipantsList);

      // Load all participants
      const { data: allParticipantsData, error: apError } = await supabase
        .from('participants')
        .select('*, user:users(full_name)');

      if (apError) throw apError;

      const allParticipantsList = (allParticipantsData || []).map((p: any) => ({
        ...p,
        user: p.user,
      }));

      setAllParticipants(allParticipantsList);

        const { data: lessonNotesData, error: lessonNotesError } = await supabase
          .from('lesson_notes')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        if (lessonNotesError) throw lessonNotesError;
        setLessonNotes(lessonNotesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddParticipants() {
    if (selectedParticipants.size === 0) {
      setError('Please select at least one participant');
      return;
    }

    try {
      setError('');
      const participantsToAdd = Array.from(selectedParticipants).map(id => ({
        session_id: sessionId,
        participant_id: id,
        status: 'signed_up' as const,
        notes: '',
      }));

      const { error: insertError } = await supabase
        .from('session_participants')
        .insert(participantsToAdd);

      if (insertError) throw insertError;

      setSuccessMessage('Participants added successfully!');
      setSelectedParticipants(new Set());
      setIsAddDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add participants');
    }
  }

  async function handleMarkAttendance(participantId: string, attended: boolean) {
    try {
      setError('');
      
      if (attended) {
        // Local leaders can only mark attendance as self_reported (needs validation)
        const { error: updateError } = await supabase
          .from('session_participants')
          .update({ status: 'self_reported' })
          .eq('session_id', sessionId)
          .eq('participant_id', participantId);

        if (updateError) throw updateError;
        setSuccessMessage('Attendance marked - pending validation');
      } else {
        // Remove from session if marking as absent
        const { error: deleteError } = await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', sessionId)
          .eq('participant_id', participantId);

        if (deleteError) throw deleteError;
        setSuccessMessage('Participant removed from attendance');
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    try {
      setError('');
      const { error: deleteError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', participantId);

      if (deleteError) throw deleteError;

      setSuccessMessage('Participant removed successfully');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove participant');
    }
  }

  const availableParticipants = allParticipants.filter(
    ap => !participants.some(p => p.id === ap.id)
  );

  const filteredAvailable = availableParticipants.filter(p =>
    p.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function formatDate(dateString: string): string {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(timeString: string): string {
    return timeString.slice(0, 5);
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'self_reported':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Validation</Badge>;
      default:
        return <Badge variant="outline">Signed Up</Badge>;
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Session not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">{t('lessons')}</h2>
        <p className="text-sm text-[#443837]/70 mt-1">Manage participants and attendance</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {session.type}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatDate(session.date)} at {formatTime(session.time)}
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participants
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Participants to Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t('search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {filteredAvailable.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No participants available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredAvailable.map(participant => (
                        <div key={participant.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={participant.id}
                            checked={selectedParticipants.has(participant.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedParticipants);
                              if (checked) {
                                newSelected.add(participant.id);
                              } else {
                                newSelected.delete(participant.id);
                              }
                              setSelectedParticipants(newSelected);
                            }}
                          />
                          <Label
                            htmlFor={participant.id}
                            className="text-sm cursor-pointer"
                          >
                            {participant.user?.full_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddParticipants} className="flex-1">
                    Add ({selectedParticipants.size})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-gray-500">{t('no_data')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('full_name')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.user?.full_name || participant.full_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(participant.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {participant.status !== 'self_reported' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAttendance(participant.id, true)}
                            >
                              Mark Attended
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAttendance(participant.id, false)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        <LessonNotesSection
          sessionId={sessionId}
          currentUserId={currentUserId}
          notes={lessonNotes}
          onNotesUpdated={loadData}
        />
    </div>
  );
}
