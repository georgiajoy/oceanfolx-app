'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, Participant, Level, Skill } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Target, Sparkles, Star, Trophy } from 'lucide-react';

interface ParticipantSkill {
  id: string;
  skill_id: string;
  achieved_date: string;
  notes: string;
  skills: Skill;
}

interface ParticipantLevel {
  id: string;
  level_id: string;
  achieved_date: string;
  notes: string;
  levels: Level;
}

export default function ParticipantProgressPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [achievedSkills, setAchievedSkills] = useState<ParticipantSkill[]>([]);
  const [achievedLevels, setAchievedLevels] = useState<ParticipantLevel[]>([]);
  const [loading, setLoading] = useState(true);
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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) throw participantError;
      setParticipant(participantData);

      if (participantData) {
        const { data: skillsData, error: skillsError } = await supabase
          .from('participant_skills')
          .select('*, skills(*)')
          .eq('participant_id', participantData.id)
          .order('achieved_date', { ascending: false });

        if (skillsError) throw skillsError;
        setAchievedSkills(skillsData || []);

        const { data: levelsData, error: levelsError } = await supabase
          .from('participant_levels')
          .select('*, levels(*)')
          .eq('participant_id', participantData.id)
          .order('achieved_date', { ascending: false });

        if (levelsError) throw levelsError;
        setAchievedLevels(levelsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  if (!participant) {
    return <div className="text-center py-8">{t('profile_not_found')}</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4FBACA] via-[#3AA8BC] to-[#2A9FB4] rounded-2xl p-8 shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{t('my_progress')}</h2>
          <p className="text-xl text-white/90 font-medium mt-1">{t('track_swimming_progress')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white/80 mb-2">{t('total_skills_achieved')}</div>
                <div className="text-5xl font-bold text-white mb-2">{achievedSkills.length}</div>
                <div className="flex items-center gap-1 text-white/90">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('skills_mastered')}</span>
                </div>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Target className="h-12 w-12 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white/80 mb-2">{t('levels_completed')}</div>
                <div className="text-5xl font-bold text-white mb-2">{achievedLevels.length}</div>
                <div className="flex items-center gap-1 text-white/90">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('milestones_reached')}</span>
                </div>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Award className="h-12 w-12 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#E8F8FA] via-[#D4F3F6] to-[#C0EEF2] overflow-hidden">
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-3 rounded-xl shadow-lg">
              <Target className="h-7 w-7 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] bg-clip-text text-transparent">{t('achieved_skills')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {achievedSkills.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-20 w-20 text-[#4FBACA]/50 mx-auto mb-4 animate-pulse" />
              <p className="text-[#443837] font-medium text-lg">{t('skills_journey_begins')}</p>
              <p className="text-[#443837]/70 text-sm mt-2">{t('every_practice_brings_achievements')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {achievedSkills.map((achievedSkill, index) => (
                <div
                  key={achievedSkill.id}
                  className="group relative p-5 bg-gradient-to-r from-white to-[#E8F8FA] border-2 border-[#4FBACA]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-[#4FBACA]"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.05}s backwards`
                  }}
                >
                  <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-gradient-to-br from-[#FFD93D] to-[#FFC107] rounded-full p-2 shadow-lg">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-xl font-bold text-[#443837]">
                        {language === 'en' ? achievedSkill.skills.name_en : achievedSkill.skills.name_id}
                      </div>
                    </div>
                    <Badge className="text-xs py-1 px-3 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] text-white border-0 shadow-sm">
                      {new Date(achievedSkill.achieved_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-base text-[#443837]/80 leading-relaxed font-medium pl-11">
                    {language === 'en' ? achievedSkill.skills.description_en : achievedSkill.skills.description_id}
                  </p>
                  {achievedSkill.notes && (
                    <div className="mt-3 pl-11">
                      <div className="bg-[#4FBACA]/10 border-l-4 border-[#4FBACA] p-3 rounded">
                        <p className="text-sm text-[#443837] italic font-medium">{achievedSkill.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#FFF4E6] via-[#FFE8CC] to-[#FFDDB3] overflow-hidden">
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#FF8E53] to-[#FF6B6B] p-3 rounded-xl shadow-lg">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] bg-clip-text text-transparent">{t('completed_levels')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {achievedLevels.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-20 w-20 text-[#FF8E53]/50 mx-auto mb-4 animate-bounce" />
              <p className="text-[#443837] font-medium text-lg">{t('first_level_awaits')}</p>
              <p className="text-[#443837]/70 text-sm mt-2">{t('work_with_instructor')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {achievedLevels.map((achievedLevel, index) => (
                <div
                  key={achievedLevel.id}
                  className="group relative p-5 bg-gradient-to-r from-white to-[#FFF4E6] border-2 border-[#FF8E53]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-[#FF8E53]"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.05}s backwards`
                  }}
                >
                  <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-gradient-to-br from-[#FFD93D] to-[#FFC107] rounded-full p-2 shadow-lg animate-spin" style={{ animationDuration: '3s' }}>
                      <Star className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-[#FF8E53] to-[#FF6B6B] p-2 rounded-lg">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-xl font-bold text-[#443837]">
                        {language === 'en' ? achievedLevel.levels.name_en : achievedLevel.levels.name_id}
                      </div>
                    </div>
                    <Badge className="text-xs py-1 px-3 bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] text-white border-0 shadow-sm">
                      {new Date(achievedLevel.achieved_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-base text-[#443837]/80 leading-relaxed font-medium pl-11">
                    {language === 'en' ? achievedLevel.levels.description_en : achievedLevel.levels.description_id}
                  </p>
                  {achievedLevel.notes && (
                    <div className="mt-3 pl-11">
                      <div className="bg-[#FF8E53]/10 border-l-4 border-[#FF8E53] p-3 rounded">
                        <p className="text-sm text-[#443837] italic font-medium">{achievedLevel.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
