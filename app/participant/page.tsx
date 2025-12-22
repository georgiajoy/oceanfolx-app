'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, Participant, Level, Skill, Session } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Target, Calendar, Waves, Trophy, Star, Sparkles } from 'lucide-react';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';

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

interface LessonSignup {
  id: string;
  session_id: string;
  sessions: Session;
}

export default function ParticipantDashboard() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [currentLevel, setCurrentLevel] = useState<ParticipantLevel | null>(null);
  const [recentSkills, setRecentSkills] = useState<ParticipantSkill[]>([]);
  const [nextLesson, setNextLesson] = useState<LessonSignup | null>(null);
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
        const { data: levelData, error: levelError } = await supabase
          .from('participant_levels')
          .select('*, levels(*)')
          .eq('participant_id', participantData.id)
          .order('achieved_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (levelError) throw levelError;
        setCurrentLevel(levelData);

        const { data: skillsData, error: skillsError } = await supabase
          .from('participant_skills')
          .select('*, skills(*)')
          .eq('participant_id', participantData.id)
          .order('achieved_date', { ascending: false })
          .limit(3);

        if (skillsError) throw skillsError;
        setRecentSkills(skillsData || []);

        const { data: lessonDataList, error: lessonError } = await supabase
          .from('lesson_signups')
          .select('*, sessions(*)')
          .eq('participant_id', participantData.id);

        if (lessonError) throw lessonError;

        const today = new Date().toISOString().split('T')[0];
        const upcomingLessons = lessonDataList
          ?.filter((signup) => signup.sessions.date >= today)
          .sort((a, b) => {
            const dateCompare = a.sessions.date.localeCompare(b.sessions.date);
            if (dateCompare !== 0) return dateCompare;
            return a.sessions.time.localeCompare(b.sessions.time);
          });

        setNextLesson(upcomingLessons && upcomingLessons.length > 0 ? upcomingLessons[0] : null);
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
    return <div className="text-center py-8">Profile not found</div>;
  }

  function handlePhotoUpdate(url: string) {
    if (participant) {
      setParticipant({ ...participant, profile_photo_url: url });
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4FBACA] via-[#3AA8BC] to-[#2A9FB4] rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }}></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-4xl font-bold text-white drop-shadow-lg">{t('welcome')}, {participant.full_name}!</h2>
                <p className="text-xl text-white/90 font-medium mt-1">{t('participant_dashboard')}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <ProfilePhotoUpload
                participantId={participant.id}
                currentPhotoUrl={participant.profile_photo_url}
                onPhotoUpdate={handlePhotoUpdate}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#FFF4E6] to-[#FFE8CC] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="bg-gradient-to-br from-[#FF8E53] to-[#FF6B6B] p-3 rounded-xl shadow-lg">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] bg-clip-text text-transparent">Current Level</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLevel ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute -top-2 -left-2">
                    <Star className="h-6 w-6 text-[#FFD93D] animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="text-3xl font-bold mb-3 text-[#443837] animate-pulse">
                    {language === 'en' ? currentLevel.levels.name_en : currentLevel.levels.name_id}
                  </div>
                </div>
                <p className="text-base text-[#443837]/80 leading-relaxed font-medium">
                  {language === 'en' ? currentLevel.levels.description_en : currentLevel.levels.description_id}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Badge className="text-sm py-1.5 px-4 bg-gradient-to-r from-[#FF8E53] to-[#FF6B6B] text-white border-0 shadow-md">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Achieved {new Date(currentLevel.achieved_date).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="h-16 w-16 text-[#FF8E53]/50 mx-auto mb-3 animate-bounce" />
                <p className="text-[#443837] font-medium">Your first level awaits! Keep practicing!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#E8F8FA] to-[#C0EEF2] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-3 rounded-xl shadow-lg">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] bg-clip-text text-transparent">Next Lesson</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextLesson ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="text-3xl font-bold mb-2 text-[#443837]">
                    {new Date(nextLesson.sessions.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className="space-y-2 bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#4FBACA] animate-pulse"></div>
                    <p className="text-base text-[#443837] font-semibold">
                      Time: {nextLesson.sessions.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#3AA8BC] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <p className="text-base text-[#443837] font-semibold">
                      Type: {nextLesson.sessions.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <Badge className="text-sm py-1.5 px-4 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] text-white border-0 shadow-md">
                    <Waves className="h-4 w-4 mr-1" />
                    {t('get_ready_to_swim')}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-[#4FBACA]/50 mx-auto mb-3" />
                <p className="text-[#443837] font-medium">No upcoming lessons scheduled</p>
                <p className="text-[#443837]/70 text-sm mt-2">Check back soon for new opportunities!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#E8F8FA] via-[#D4F3F6] to-[#C0EEF2] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#4FBACA]/30 to-[#3AA8BC]/30 rounded-full opacity-30 blur-3xl"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] p-3 rounded-xl shadow-lg">
              <Target className="h-7 w-7 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] bg-clip-text text-transparent">Recent Skills Achieved</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {recentSkills.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-20 w-20 text-[#4FBACA]/50 mx-auto mb-4 animate-pulse" />
              <p className="text-[#443837] font-medium text-lg">Your skills journey begins here!</p>
              <p className="text-[#443837]/70 text-sm mt-2">Every practice brings you closer to new achievements</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSkills.map((skill, index) => (
                <div
                  key={skill.id}
                  className="group relative p-5 bg-gradient-to-r from-white to-[#E8F8FA] border-2 border-[#4FBACA]/30 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-[#4FBACA]"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s backwards`
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
                        {language === 'en' ? skill.skills.name_en : skill.skills.name_id}
                      </div>
                    </div>
                    <Badge className="text-xs py-1 px-3 bg-gradient-to-r from-[#4FBACA] to-[#3AA8BC] text-white border-0 shadow-sm">
                      {new Date(skill.achieved_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-base text-[#443837]/80 leading-relaxed font-medium pl-11">
                    {language === 'en' ? skill.skills.description_en : skill.skills.description_id}
                  </p>
                  {skill.notes && (
                    <div className="mt-3 pl-11">
                      <div className="bg-[#4FBACA]/10 border-l-4 border-[#4FBACA] p-3 rounded">
                        <p className="text-sm text-[#443837] italic font-medium">{skill.notes}</p>
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
