'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Participant } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Info } from 'lucide-react';

interface ParticipantWithUser extends Participant {
  user?: { full_name: string; phone: string };
  highestLevel?: string;
}

export default function LocalLeaderParticipantsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([]);
  const [levels, setLevels] = useState<Array<{ id: string; name_en: string; name_id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    if (language) {
      loadData();
    }
  }, [language]);

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

  async function loadData() {
    try {
      setLoading(true);

      // Load levels
      const { data: levelsData } = await supabase
        .from('levels')
        .select('*')
        .order('order_number', { ascending: true });

      setLevels(levelsData || []);

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*, user:users(full_name, phone)');

      if (participantsError) throw participantsError;

      // Fetch highest level for each participant
      const participantsWithLevels = await Promise.all(
        (participantsData || []).map(async (participant: any) => {
          const { data: progressData } = await supabase
            .from('participant_progress')
            .select('level:levels(id, name_en, name_id)')
            .eq('participant_id', participant.id)
            .not('level_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let highestLevel: string | undefined;
          if (progressData && progressData.level) {
            const level = progressData.level as any;
            highestLevel = language === 'en' ? level.name_en : level.name_id;
          }

          return {
            ...participant,
            user: participant.user,
            highestLevel,
          };
        })
      );

      // Sort by name
      participantsWithLevels.sort((a, b) => {
        const nameA = a.user?.full_name || a.full_name || '';
        const nameB = b.user?.full_name || b.full_name || '';
        return nameA.localeCompare(nameB);
      });

      setParticipants(participantsWithLevels);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredParticipants = participants.filter(p =>
    (p.user?.full_name || p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.user?.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">{t('participants')}</h2>
        <p className="text-sm text-[#443837]/70 mt-1">View and manage participants in your lessons</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">{t('no_data')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('full_name')}</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Highest Level</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.user?.full_name || participant.full_name}
                      </TableCell>
                      <TableCell className="text-sm">{participant.user?.phone || '-'}</TableCell>
                      <TableCell>
                        {participant.highestLevel ? (
                          <Badge variant="secondary">{participant.highestLevel}</Badge>
                        ) : (
                          <span className="text-gray-400 italic">No level</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/local_leader/participants/${participant.id}`)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          View Progress
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
