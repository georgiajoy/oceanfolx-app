'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Session } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SessionsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    type: 'Swim Lesson',
    isRecurring: false,
    frequency: 'weekly' as 'daily' | 'weekly',
    endDate: '',
  });
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
    loadSessions();
  }, []);

  async function loadLanguage() {
    try {
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setLanguage(profile.preferred_language);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  }

  async function loadSessions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (formData.isRecurring && formData.endDate) {
        // Generate recurring sessions
        const sessions = [];
        const startDate = new Date(formData.date + 'T00:00:00');
        const endDate = new Date(formData.endDate + 'T00:00:00');
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          sessions.push({
            date: currentDate.toISOString().split('T')[0],
            time: formData.time,
            type: formData.type,
          });
          
          // Increment based on frequency
          if (formData.frequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (formData.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          }
        }
        
        const { error: insertError } = await supabase
          .from('sessions')
          .insert(sessions);

        if (insertError) throw insertError;
      } else {
        // Single session
        const { error: insertError } = await supabase
          .from('sessions')
          .insert({
            date: formData.date,
            time: formData.time,
            type: formData.type,
          });

        if (insertError) throw insertError;
      }

      setFormData({
        date: '',
        time: '',
        type: 'Swim Lesson',
        isRecurring: false,
        frequency: 'weekly',
        endDate: '',
      });
      setIsDialogOpen(false);
      loadSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    }
  }

  function handleEditClick(session: Session) {
    setEditingSession(session);
    setIsEditDialogOpen(true);
  }

  async function handleUpdateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSession) return;
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          date: editingSession.date,
          time: editingSession.time,
          type: editingSession.type,
        })
        .eq('id', editingSession.id);

      if (updateError) throw updateError;

      setIsEditDialogOpen(false);
      setEditingSession(null);
      loadSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    }
  }

  async function handleDeleteSession(sessionId: string) {
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) throw deleteError;

      loadSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">Manage Lessons</h2>
          <p className="text-xs sm:text-sm text-[#443837]/70 mt-1">Create and manage swim lessons</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Lesson</span>
              <span className="sm:hidden">Add Lesson</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Lesson</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">{t('time')}</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('type')}</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isRecurring" className="cursor-pointer">Make this a recurring lesson</Label>
                </div>
              </div>
              {formData.isRecurring && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <select
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'daily' | 'weekly' })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.date}
                      required={formData.isRecurring}
                    />
                  </div>
                </>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{t('create')}</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('time')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {t('no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>{session.time.slice(0, 5)}</TableCell>
                      <TableCell>{session.type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditClick(session)}
                          >
                            <Pencil className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">{t('edit')}</span>
                          </Button>
                          <Link href={`/admin/sessions/${session.id}`}>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Manage Attendance</span>
                              <span className="sm:hidden">Attend</span>
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('delete')}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this lesson? This action cannot be undone and will remove all associated attendance records and signups.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>
                                  {t('delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit')} Lesson</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <form onSubmit={handleUpdateSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">{t('date')}</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingSession.date}
                  onChange={(e) => setEditingSession({ ...editingSession, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">{t('time')}</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editingSession.time}
                  onChange={(e) => setEditingSession({ ...editingSession, time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">{t('type')}</Label>
                <Input
                  id="edit-type"
                  value={editingSession.type}
                  onChange={(e) => setEditingSession({ ...editingSession, type: e.target.value })}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{t('update')}</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingSession(null);
                    setError('');
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
