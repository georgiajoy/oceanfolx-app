'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, UserProfile } from '@/lib/supabase';
import { Calendar, Users, AlertCircle } from 'lucide-react';

export default function LocalLeaderDashboard() {
  const [language, setLanguage] = useState<Language>('en');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [pendingValidation, setPendingValidation] = useState(0);
  const [loading, setLoading] = useState(true);
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const user = await getCurrentUser();
      if (user) {
        const prof = await getUserProfile(user.id);
        if (prof) {
          setProfile(prof);
          setLanguage(prof.preferred_language);
        }
      }

      const today = new Date().toISOString().split('T')[0];

      // Count upcoming lessons
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact' })
        .gte('date', today);

      if (!sessionsError) {
        setUpcomingCount(sessionsData?.length || 0);
      }

      // Count unique participants across all sessions
      const { data: allSpData } = await supabase
        .from('session_participants')
        .select('participant_id');

      const uniqueParticipants = new Set(allSpData?.map(sp => sp.participant_id) || []);
      setParticipantCount(uniqueParticipants.size);

      // Count pending validation
      const { data: pendingData } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact' })
        .eq('status', 'self_reported');

      setPendingValidation(pendingData?.length || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {t('welcome')}, {profile?.preferred_name || profile?.full_name || 'Local Leader'}
        </h1>
        <p className="text-gray-600 mt-2">Local Leader Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('upcoming_lessons')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{upcomingCount}</div>
            <p className="text-xs text-gray-500 mt-1">Lessons to manage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('total_participants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{participantCount}</div>
            <p className="text-xs text-gray-500 mt-1">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t('attendance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingValidation}</div>
            <p className="text-xs text-gray-500 mt-1">Pending validation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/local_leader/sessions'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('lessons')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manage lessons, assign participants, and mark attendance</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/local_leader/participants'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('participants')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">View participant information and track their progress</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
