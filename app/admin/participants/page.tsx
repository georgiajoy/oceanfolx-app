'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Level, Participant } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Info } from 'lucide-react';

interface ParticipantWithSkill extends Participant {
  highestSkill?: string;
  highestLevel?: string;
  highestLevelId?: string;
  hijabPreference?: 'with_or_without' | 'only_with';
}

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [participants, setParticipants] = useState<ParticipantWithSkill[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hijabFilter, setHijabFilter] = useState<'all' | 'with_or_without' | 'only_with'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    if (language) {
      loadParticipants();
      loadLevels();
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

  async function loadLevels() {
    try {
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .order('order_number', { ascending: true });

      if (levelsError) throw levelsError;
      setLevels(levelsData || []);
    } catch (error) {
      console.error('Error loading levels:', error);
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
        full_name: p.user?.full_name || p.full_name || '',
        hijabPreference: p.hijab_photo_preference || 'with_or_without',
      }));

      // Sort by full_name on client since participants.full_name was moved to users
      mappedParticipants.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

      const participantsWithSkills = await Promise.all(
        (mappedParticipants || []).map(async (participant) => {
          const [{ data: skillsData }, { data: levelData }] = await Promise.all([
            supabase
              .from('participant_progress')
              .select('skill:skills(name_en, name_id, order_number)')
              .eq('participant_id', participant.id)
              .not('skill_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('participant_progress')
              .select('level:levels(id, name_en, name_id, order_number)')
              .eq('participant_id', participant.id)
              .not('level_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          let highestSkill: string | undefined;
          let highestLevel: string | undefined;
          let highestLevelId: string | undefined;

          if (skillsData && skillsData.skill && typeof skillsData.skill === 'object') {
            const skill = skillsData.skill as any;
            highestSkill = language === 'en' ? skill.name_en : skill.name_id;
          }

          if (levelData && levelData.level && typeof levelData.level === 'object') {
            const level = levelData.level as any;
            highestLevel = language === 'en' ? level.name_en : level.name_id;
            highestLevelId = level.id;
          }

          return {
            ...participant,
            highestSkill,
            highestLevel,
            highestLevelId,
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

  const filteredParticipants = participants.filter((p) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = p.full_name.toLowerCase().includes(searchTermLower);
    const matchesHijab =
      hijabFilter === 'all' || p.hijabPreference === hijabFilter;
    const matchesLevel =
      levelFilter === 'all' || p.highestLevelId === levelFilter;

    return matchesSearch && matchesHijab && matchesLevel;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">{t('participants')}</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block">Hijab Photo Preference</Label>
              <select
                value={hijabFilter}
                onChange={(e) => setHijabFilter(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Preferences</option>
                <option value="with_or_without">With or Without</option>
                <option value="only_with">Only With Hijab</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block">Highest Level</Label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Levels</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {language === 'en' ? level.name_en : level.name_id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('full_name')}</TableHead>
                  <TableHead>Highest Skill</TableHead>
                  <TableHead>Highest Level</TableHead>
                  <TableHead>Hijab Preference</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
                        {participant.highestLevel ? (
                          <span className="text-gray-700">{participant.highestLevel}</span>
                        ) : (
                          <span className="text-gray-400 italic">No level yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.hijabPreference === 'only_with' ? (
                          'Only With Hijab'
                        ) : (
                          'With or Without'
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
