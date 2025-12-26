'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Participant, Skill } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Info } from 'lucide-react';

interface ParticipantWithSkill extends Participant {
  highestSkill?: string;
}

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [participants, setParticipants] = useState<ParticipantWithSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    if (language) {
      loadParticipants();
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

  async function loadParticipants() {
    try {
      setLoading(true);
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*, user:users(full_name)');

      if (participantsError) throw participantsError;

      // Map users.full_name onto participant.full_name for backwards compatibility and client-side sort
      const mappedParticipants = (participantsData || []).map((p: any) => ({
        ...p,
        full_name: p.user?.full_name || p.full_name || ''
      }));

      // Sort by full_name on client since participants.full_name was moved to users
      mappedParticipants.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

      const participantsWithSkills = await Promise.all(
        (mappedParticipants || []).map(async (participant) => {
          const { data: skillsData } = await supabase
            .from('participant_progress')
            .select('skill:skills(name_en, name_id, order_number)')
            .eq('participant_id', participant.id)
            .not('skill_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let highestSkill: string | undefined;
          if (skillsData && skillsData.skill && typeof skillsData.skill === 'object') {
            const skill = skillsData.skill as any;
            highestSkill = language === 'en' ? skill.name_en : skill.name_id;
          }

          return {
            ...participant,
            highestSkill,
          };
        })
      );

      setParticipants(participantsWithSkills);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredParticipants = participants.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">{t('participants')}</h2>
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
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('full_name')}</TableHead>
                  <TableHead>Highest Skill</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      {t('no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.full_name}</TableCell>
                      <TableCell>
                        {participant.highestSkill ? (
                          <span className="text-gray-700">{participant.highestSkill}</span>
                        ) : (
                          <span className="text-gray-400 italic">No skills yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/participants/${participant.id}`)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          More Info
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
