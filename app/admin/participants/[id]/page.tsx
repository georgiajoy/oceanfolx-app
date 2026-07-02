'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Participant, Level, Skill, ParticipantSkill, ParticipantLevel } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Award, User, Plus, X, Calendar, Edit, Save, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ParticipantSkillWithDetails extends ParticipantSkill {
  skill: Skill;
}

interface ParticipantLevelWithDetails extends ParticipantLevel {
  level: Level;
}

interface AttendanceHistory {
  id: string;
  session_id?: string;
  status: string;
  marked_at: string;
  notes?: string;
  session?: {
    date: string;
    time: string;
    type: string;
  } | {
    date: string;
    time: string;
    type: string;
  }[];
}

interface ParticipantWithUser extends Participant {
  user?: {
    full_name?: string;
    phone?: string;
  };
}

export default function AdminParticipantDetailPage({ params }: { params: { id: string } }) {
  const participantId = params.id;
  const [language, setLanguage] = useState<Language>('en');
  const [participant, setParticipant] = useState<ParticipantWithUser | null>(null);
  const [participantSkills, setParticipantSkills] = useState<ParticipantSkillWithDetails[]>([]);
  const [participantLevels, setParticipantLevels] = useState<ParticipantLevelWithDetails[]>([]);
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [adminId, setAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
  const [lessonHistory, setLessonHistory] = useState<AttendanceHistory[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    full_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    shoe_size: '',
    clothing_size: '',
    age: '',
    village: '',
    number_of_children: '',
    respiratory_issues: '',
    diabetes: '',
    neurological_conditions: '',
    chronic_illnesses: '',
    head_injuries: '',
    hospitalizations: '',
    medications: '',
    medications_not_taking_during_program: '',
    medical_dietary_requirements: '',
    religious_personal_dietary_restrictions: '',
    swim_ability_calm: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    swim_ability_moving: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    surfing_experience: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    commitment_statement: false,
    risks_release_indemnity_agreement: false,
    media_release_agreement: false,
    hijab_photo_preference: 'with_or_without' as 'with_or_without' | 'only_with',
    signature: '',
    signature_date: '',
  });
  const t = useTranslation(language);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setLanguage(profile.preferred_language);
          setAdminId(user.id);
        }
      }

      const [participantResult, skillsResult, levelsResult, participantSkillsResult, participantLevelsResult, lessonHistoryResult] = await Promise.all([
        supabase.from('participants').select('*, user:users(full_name, phone)').eq('id', participantId).maybeSingle(),
        supabase.from('skills').select('*').order('order_number'),
        supabase.from('levels').select('*').order('order_number'),
        supabase.from('participant_progress').select('*, skill:skills(*)').eq('participant_id', participantId).not('skill_id','is', null),
        supabase.from('participant_progress').select('*, level:levels(*)').eq('participant_id', participantId).not('level_id','is', null),
        supabase.from('session_participants').select('id, status, marked_at, notes, session:sessions(date, time, type)').eq('participant_id', participantId).order('marked_at', { ascending: false }),
      ]);

      if (participantResult.error) throw participantResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (levelsResult.error) throw levelsResult.error;
      if (participantSkillsResult.error) throw participantSkillsResult.error;
      if (participantLevelsResult.error) throw participantLevelsResult.error;
      if (lessonHistoryResult.error) throw lessonHistoryResult.error;

      // Map user.full_name to participant.full_name for backward compatibility
      const pData = participantResult.data as any;
      const mappedParticipant = pData ? { ...pData, full_name: pData.user?.full_name || pData.full_name || '' } : null;
      setParticipant(mappedParticipant);
      setAllSkills(skillsResult.data || []);
      setAllLevels(levelsResult.data || []);
      setParticipantSkills(participantSkillsResult.data as ParticipantSkillWithDetails[] || []);
      setParticipantLevels(participantLevelsResult.data as ParticipantLevelWithDetails[] || []);
      setLessonHistory((lessonHistoryResult.data || []) as AttendanceHistory[]);

      if (mappedParticipant) {
        setParticipantForm({
          full_name: mappedParticipant.full_name || '',
          emergency_contact_name: mappedParticipant.emergency_contact_name || '',
          emergency_contact_phone: mappedParticipant.emergency_contact_phone || '',
          shoe_size: mappedParticipant.shoe_size || '',
          clothing_size: mappedParticipant.clothing_size || '',
          age: mappedParticipant.age || '',
          village: mappedParticipant.village || '',
          number_of_children: mappedParticipant.number_of_children || '',
          respiratory_issues: mappedParticipant.respiratory_issues || '',
          diabetes: mappedParticipant.diabetes || '',
          neurological_conditions: mappedParticipant.neurological_conditions || '',
          chronic_illnesses: mappedParticipant.chronic_illnesses || '',
          head_injuries: mappedParticipant.head_injuries || '',
          hospitalizations: mappedParticipant.hospitalizations || '',
          medications: mappedParticipant.medications || '',
          medications_not_taking_during_program: mappedParticipant.medications_not_taking_during_program || '',
          medical_dietary_requirements: mappedParticipant.medical_dietary_requirements || '',
          religious_personal_dietary_restrictions: mappedParticipant.religious_personal_dietary_restrictions || '',
          swim_ability_calm: mappedParticipant.swim_ability_calm || 'none',
          swim_ability_moving: mappedParticipant.swim_ability_moving || 'none',
          surfing_experience: mappedParticipant.surfing_experience || 'none',
          commitment_statement: mappedParticipant.commitment_statement || false,
          risks_release_indemnity_agreement: mappedParticipant.risks_release_indemnity_agreement || false,
          media_release_agreement: mappedParticipant.media_release_agreement || false,
          hijab_photo_preference: mappedParticipant.hijab_photo_preference || 'with_or_without',
          signature: mappedParticipant.signature || '',
          signature_date: mappedParticipant.signature_date || '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedSkillIds(
      participantSkills
        .map((ps) => ps.skill_id)
        .filter((skillId): skillId is string => typeof skillId === 'string')
    );
  }, [participantSkills]);

  useEffect(() => {
    const sortedByHighestFirst = [...allLevels].sort((a, b) => b.order_number - a.order_number);
    if (sortedByHighestFirst.length === 0) {
      setCurrentLevelIndex(0);
      return;
    }

    const achievedLevelIds = new Set<string>([
      ...participantLevels
        .map((pl) => pl.level_id)
        .filter((levelId): levelId is string => typeof levelId === 'string'),
      ...participantSkills
        .map((ps) => ps.skill?.level_id)
        .filter((levelId): levelId is string => typeof levelId === 'string'),
    ]);

    const highestAchievedIndex = sortedByHighestFirst.findIndex((level) => achievedLevelIds.has(level.id));
    setCurrentLevelIndex(highestAchievedIndex >= 0 ? highestAchievedIndex : 0);
  }, [allLevels, participantLevels, participantSkills]);

  async function handleAddLevel() {
    if (!selectedLevelId) return;

    try {
      setMessage('');
      const { error } = await supabase
        .from('participant_progress')
        .insert({
          participant_id: participantId,
          level_id: selectedLevelId,
          validated_by_volunteer_id: adminId,
          achieved_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      setMessage('Level added successfully!');
      setSelectedLevelId('');
      setShowAddLevel(false);
      loadData();
    } catch (error: any) {
      if (error.code === '23505') {
        setMessage('This level is already assigned to the participant');
      } else {
        setMessage('Error adding level: ' + error.message);
      }
    }
  }

  async function handleRemoveLevel(levelId: string) {
    try {
      setMessage('');
      const { error } = await supabase
        .from('participant_progress')
        .delete()
        .eq('id', levelId);

      if (error) throw error;

      setMessage('Level removed successfully!');
      loadData();
    } catch (error: any) {
      setMessage('Error removing level: ' + error.message);
    }
  }

  function handleSkillSelectionChange(skillId: string, checked: boolean) {
    setSelectedSkillIds((prev) => {
      if (checked) {
        return prev.includes(skillId) ? prev : [...prev, skillId];
      }

      return prev.filter((id) => id !== skillId);
    });
  }

  async function handleSaveSkillChanges() {
    try {
      setMessage('');
      const currentSkillIds = participantSkills
        .map((ps) => ps.skill_id)
        .filter((skillId): skillId is string => typeof skillId === 'string');
      const skillsToAdd = selectedSkillIds.filter((id) => !currentSkillIds.includes(id));
      const progressIdsToDelete = participantSkills
        .filter((ps) => ps.skill_id && !selectedSkillIds.includes(ps.skill_id))
        .map((ps) => ps.id);

      if (skillsToAdd.length === 0 && progressIdsToDelete.length === 0) {
        setMessage('No skill changes to save.');
        return;
      }

      setSavingSkills(true);

      if (progressIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('participant_progress')
          .delete()
          .in('id', progressIdsToDelete);
        if (deleteError) throw deleteError;
      }

      if (skillsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('participant_progress')
          .insert(
            skillsToAdd.map((skillId) => ({
              participant_id: participantId,
              skill_id: skillId,
              validated_by_volunteer_id: adminId,
              achieved_date: new Date().toISOString().split('T')[0],
            }))
          );
        if (insertError) throw insertError;
      }

      setMessage('Skill progress updated successfully!');
      await loadData();
    } catch (error: any) {
      setMessage('Error updating skills: ' + error.message);
    } finally {
      setSavingSkills(false);
    }
  }

  async function handleSaveParticipantInfo() {
    try {
      setMessage('');
      // Update users.full_name and participant-specific fields on participants
      const userId = participant?.user_id;
      if (userId) {
        const { error: userError } = await supabase
          .from('users')
          .update({ full_name: participantForm.full_name })
          .eq('id', userId);
        if (userError) throw userError;
      }

      const { error } = await supabase
        .from('participants')
        .update({
          emergency_contact_name: participantForm.emergency_contact_name,
          emergency_contact_phone: participantForm.emergency_contact_phone,
          shoe_size: participantForm.shoe_size,
          clothing_size: participantForm.clothing_size,
          age: participantForm.age,
          village: participantForm.village,
          number_of_children: participantForm.number_of_children,
          respiratory_issues: participantForm.respiratory_issues,
          diabetes: participantForm.diabetes,
          neurological_conditions: participantForm.neurological_conditions,
          chronic_illnesses: participantForm.chronic_illnesses,
          head_injuries: participantForm.head_injuries,
          hospitalizations: participantForm.hospitalizations,
          medications: participantForm.medications,
          medications_not_taking_during_program: participantForm.medications_not_taking_during_program,
          medical_dietary_requirements: participantForm.medical_dietary_requirements,
          religious_personal_dietary_restrictions: participantForm.religious_personal_dietary_restrictions,
          swim_ability_calm: participantForm.swim_ability_calm,
          swim_ability_moving: participantForm.swim_ability_moving,
          surfing_experience: participantForm.surfing_experience,
          commitment_statement: participantForm.commitment_statement,
          risks_release_indemnity_agreement: participantForm.risks_release_indemnity_agreement,
          media_release_agreement: participantForm.media_release_agreement,
          hijab_photo_preference: participantForm.hijab_photo_preference,
          signature: participantForm.signature,
          signature_date: participantForm.signature_date,
        })
        .eq('id', participantId);

      if (error) throw error;

      setMessage('Participant information updated successfully!');
      setEditingInfo(false);
      loadData();
    } catch (error: any) {
      setMessage('Error updating participant information: ' + error.message);
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  if (!participant) {
    return <div className="text-center py-8">Participant not found</div>;
  }

  const assignedSkillIds = participantSkills
    .map((ps) => ps.skill_id)
    .filter((skillId): skillId is string => typeof skillId === 'string');
  const selectedSkillIdSet = new Set(selectedSkillIds);
  const hasUnsavedSkillChanges =
    selectedSkillIds.length !== assignedSkillIds.length ||
    selectedSkillIds.some((id) => !assignedSkillIds.includes(id));

  const assignedLevelIds = participantLevels.map(pl => pl.level_id);
  const availableLevels = allLevels.filter(l => !assignedLevelIds.includes(l.id));

  const sortedLevels = [...allLevels].sort((a, b) => b.order_number - a.order_number);
  const currentLevel = sortedLevels[currentLevelIndex];
  const levelSkills = currentLevel ? allSkills.filter((skill) => skill.level_id === currentLevel.id).sort((a, b) => a.order_number - b.order_number) : [];
  const completedSkillCount = levelSkills.filter((skill) => selectedSkillIdSet.has(skill.id)).length;

  function handlePhotoUpdate(url: string) {
    if (participant) {
      setParticipant({ ...participant, profile_photo_url: url });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">{participant.full_name}</h2>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#443837]/70">Manage participant progress</p>
        <p className="mt-1 text-xs sm:text-sm text-[#443837]/70">{t('phone_number')}: {participant.user?.phone || t('not_specified')}</p>
      </div>

      {message && (
        <Alert variant={message.includes('Error') || message.includes('already') ? 'destructive' : 'default'}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Participant Information
            </CardTitle>
            {!editingInfo ? (
              <Button size="sm" variant="outline" onClick={() => setEditingInfo(true)} className="w-full sm:w-auto">
                <Edit className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit Info</span>
                <span className="sm:hidden ml-1">Edit</span>
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingInfo(false);
                  setParticipantForm({
                    full_name: participant.full_name || '',
                    emergency_contact_name: participant.emergency_contact_name || '',
                    emergency_contact_phone: participant.emergency_contact_phone || '',
                    shoe_size: participant.shoe_size || '',
                    clothing_size: participant.clothing_size || '',
                    age: participant.age || '',
                    village: participant.village || '',
                    number_of_children: participant.number_of_children || '',
                    respiratory_issues: participant.respiratory_issues || '',
                    diabetes: participant.diabetes || '',
                    neurological_conditions: participant.neurological_conditions || '',
                    chronic_illnesses: participant.chronic_illnesses || '',
                    head_injuries: participant.head_injuries || '',
                    hospitalizations: participant.hospitalizations || '',
                    medications: participant.medications || '',
                    medications_not_taking_during_program: participant.medications_not_taking_during_program || '',
                    medical_dietary_requirements: participant.medical_dietary_requirements || '',
                    religious_personal_dietary_restrictions: participant.religious_personal_dietary_restrictions || '',
                    swim_ability_calm: participant.swim_ability_calm || 'none',
                    swim_ability_moving: participant.swim_ability_moving || 'none',
                    surfing_experience: participant.surfing_experience || 'none',
                    commitment_statement: participant.commitment_statement || false,
                    risks_release_indemnity_agreement: participant.risks_release_indemnity_agreement || false,
                    media_release_agreement: participant.media_release_agreement || false,
                    hijab_photo_preference: participant.hijab_photo_preference || 'with_or_without',
                    signature: participant.signature || '',
                    signature_date: participant.signature_date || '',
                  });
                }}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveParticipantInfo}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <ProfilePhotoUpload
              participantId={participant.id}
              currentPhotoUrl={participant.profile_photo_url}
              onPhotoUpdate={handlePhotoUpdate}
              size="md"
            />
            <div>
              <div className="font-semibold text-lg">{participant.full_name}</div>
              <div className="text-sm text-gray-600">Profile photo</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Full Name</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.full_name}
                  onChange={(e) => setParticipantForm({ ...participantForm, full_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.full_name}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Emergency Contact Name</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.emergency_contact_name}
                  onChange={(e) => setParticipantForm({ ...participantForm, emergency_contact_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.emergency_contact_name}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Emergency Contact Phone</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.emergency_contact_phone}
                  onChange={(e) => setParticipantForm({ ...participantForm, emergency_contact_phone: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.emergency_contact_phone}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Shoe Size</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.shoe_size}
                  onChange={(e) => setParticipantForm({ ...participantForm, shoe_size: e.target.value })}
                  placeholder="e.g., 7, 7.5, 8"
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.shoe_size || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Clothing Size</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.clothing_size}
                  onChange={(e) => setParticipantForm({ ...participantForm, clothing_size: e.target.value })}
                  placeholder="e.g., S, M, L, XL"
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.clothing_size || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Age</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.age}
                  onChange={(e) => setParticipantForm({ ...participantForm, age: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.age || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Village</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.village}
                  onChange={(e) => setParticipantForm({ ...participantForm, village: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.village || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Number of Children</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.number_of_children}
                  onChange={(e) => setParticipantForm({ ...participantForm, number_of_children: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.number_of_children || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Swim Ability (Calm Water)</Label>
              {editingInfo ? (
                <select
                  value={participantForm.swim_ability_calm}
                  onChange={(e) => setParticipantForm({ ...participantForm, swim_ability_calm: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{participant.swim_ability_calm || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Swim Ability (Moving Water)</Label>
              {editingInfo ? (
                <select
                  value={participantForm.swim_ability_moving}
                  onChange={(e) => setParticipantForm({ ...participantForm, swim_ability_moving: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{participant.swim_ability_moving || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Surfing Experience</Label>
              {editingInfo ? (
                <select
                  value={participantForm.surfing_experience}
                  onChange={(e) => setParticipantForm({ ...participantForm, surfing_experience: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{participant.surfing_experience || 'Not specified'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Respiratory Issues</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.respiratory_issues}
                  onChange={(e) => setParticipantForm({ ...participantForm, respiratory_issues: e.target.value })}
                  placeholder="e.g., Asthma"
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.respiratory_issues || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Diabetes</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.diabetes}
                  onChange={(e) => setParticipantForm({ ...participantForm, diabetes: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.diabetes || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Neurological Conditions</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.neurological_conditions}
                  onChange={(e) => setParticipantForm({ ...participantForm, neurological_conditions: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.neurological_conditions || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Chronic Illnesses</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.chronic_illnesses}
                  onChange={(e) => setParticipantForm({ ...participantForm, chronic_illnesses: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.chronic_illnesses || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Head Injuries</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.head_injuries}
                  onChange={(e) => setParticipantForm({ ...participantForm, head_injuries: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.head_injuries || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Hospitalizations</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.hospitalizations}
                  onChange={(e) => setParticipantForm({ ...participantForm, hospitalizations: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.hospitalizations || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Medications</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.medications}
                  onChange={(e) => setParticipantForm({ ...participantForm, medications: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.medications || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Medications NOT Taking During Program</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.medications_not_taking_during_program}
                  onChange={(e) => setParticipantForm({ ...participantForm, medications_not_taking_during_program: e.target.value })}
                  className="mt-1"
                  placeholder="Medications participant will not take during program"
                />
              ) : (
                <div className="font-medium mt-1">{participant.medications_not_taking_during_program || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Medical Dietary Requirements</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.medical_dietary_requirements}
                  onChange={(e) => setParticipantForm({ ...participantForm, medical_dietary_requirements: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.medical_dietary_requirements || 'None'}</div>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-600">Religious/Personal Dietary Restrictions</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.religious_personal_dietary_restrictions}
                  onChange={(e) => setParticipantForm({ ...participantForm, religious_personal_dietary_restrictions: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.religious_personal_dietary_restrictions || 'None'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgments & Agreements Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Acknowledgments & Agreements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="commitment_statement"
                  checked={editingInfo ? participantForm.commitment_statement : (participant.commitment_statement || false)}
                  disabled={!editingInfo}
                  onCheckedChange={(checked) => setParticipantForm({ ...participantForm, commitment_statement: checked as boolean })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="commitment_statement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Commitment Statement{' '}
                    <a
                      href="https://docs.google.com/document/d/1NKLWucJcTBEAIJYQppp5wpR5emlRn4mhh8WwA_eqc7Y/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      (View Document)
                    </a>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="risks_release_indemnity_agreement"
                  checked={editingInfo ? participantForm.risks_release_indemnity_agreement : (participant.risks_release_indemnity_agreement || false)}
                  disabled={!editingInfo}
                  onCheckedChange={(checked) => setParticipantForm({ ...participantForm, risks_release_indemnity_agreement: checked as boolean })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="risks_release_indemnity_agreement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Risks & Release and Indemnity Agreement{' '}
                    <a
                      href="https://docs.google.com/document/d/14bXajnXp_FwSqob-v81_sdGbylUYh6r9/edit?usp=sharing&ouid=104263968158926244329&rtpof=true&sd=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      (View Document)
                    </a>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="media_release_agreement"
                  checked={editingInfo ? participantForm.media_release_agreement : (participant.media_release_agreement || false)}
                  disabled={!editingInfo}
                  onCheckedChange={(checked) => setParticipantForm({ ...participantForm, media_release_agreement: checked as boolean })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="media_release_agreement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Photo/Video Media and Social Media Release Agreement{' '}
                    <a
                      href="https://docs.google.com/document/d/1CYVPSTeIYhCoT8zeSzlDl_LXdBPcA_Qb/edit?usp=sharing&ouid=104263968158926244329&rtpof=true&sd=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      (View Document)
                    </a>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">Hijab Photo Preference</Label>
              {editingInfo ? (
                <select
                  id="hijab_photo_preference"
                  value={participantForm.hijab_photo_preference}
                  onChange={(e) => setParticipantForm({ ...participantForm, hijab_photo_preference: e.target.value as 'with_or_without' | 'only_with' })}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="with_or_without">I am comfortable being photographed with or without my hijab</option>
                  <option value="only_with">I am only comfortable being photographed with my hijab</option>
                </select>
              ) : (
                <div className="font-medium mt-1">
                  {participant.hijab_photo_preference === 'only_with' 
                    ? 'I am only comfortable being photographed with my hijab'
                    : 'I am comfortable being photographed with or without my hijab'}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">Signature (Full Name)</Label>
              {editingInfo ? (
                <Input
                  value={participantForm.signature}
                  onChange={(e) => setParticipantForm({ ...participantForm, signature: e.target.value })}
                  className="mt-1"
                  placeholder="Enter participant's full name"
                />
              ) : (
                <div className="font-medium mt-1">{participant.signature || 'Not signed'}</div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">Date of Signature</Label>
              {editingInfo ? (
                <Input
                  type="date"
                  value={participantForm.signature_date}
                  onChange={(e) => setParticipantForm({ ...participantForm, signature_date: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <div className="font-medium mt-1">{participant.signature_date || 'Not signed'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Assigned Levels
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddLevel(!showAddLevel)}>
              {showAddLevel ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showAddLevel ? 'Cancel' : 'Add Level'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddLevel && (
            <div className="mb-4 p-4 border rounded-lg bg-blue-50">
              <Label>Select Level to Add</Label>
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Choose a level...</option>
                  {availableLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {language === 'en' ? level.name_en : level.name_id}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddLevel} disabled={!selectedLevelId}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {participantLevels.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No levels assigned yet</p>
          ) : (
            <div className="space-y-3">
              {participantLevels.map((pl) => (
                <div key={pl.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {language === 'en' ? pl.level.name_en : pl.level.name_id}
                      </Badge>
                      {pl.achieved_date && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(pl.achieved_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {language === 'en' ? pl.level.description_en : pl.level.description_id}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveLevel(pl.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skill Progress by Level
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {currentLevel ? (
                  levelSkills.length === 0 ? (
                    `${language === 'en' ? currentLevel.name_en : currentLevel.name_id} — No skills defined for this level`
                  ) : (
                    `${language === 'en' ? currentLevel.name_en : currentLevel.name_id} — ${completedSkillCount}/${levelSkills.length} skills completed`
                  )
                ) : (
                  'No levels available yet'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveSkillChanges}
                disabled={!hasUnsavedSkillChanges || savingSkills}
              >
                {savingSkills ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentLevelIndex(Math.max(0, currentLevelIndex - 1))}
                disabled={currentLevelIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentLevelIndex(Math.min(sortedLevels.length - 1, currentLevelIndex + 1))}
                disabled={!currentLevel || currentLevelIndex === sortedLevels.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!currentLevel ? (
            <p className="text-gray-500 py-4">No levels are defined yet. Add a level first to assign skills.</p>
          ) : (
            <div className="space-y-4">
              {levelSkills.length === 0 ? (
                <p className="text-gray-500 py-4">No skills defined for this level yet.</p>
              ) : (
                <div className="space-y-3">
                  {levelSkills.map((skill) => {
                    const assigned = selectedSkillIdSet.has(skill.id);
                    const assignment = participantSkills.find((ps) => ps.skill_id === skill.id);
                    const isPersisted = assignedSkillIds.includes(skill.id);
                    return (
                      <div key={skill.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-white sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={assigned}
                            onCheckedChange={(checked) => handleSkillSelectionChange(skill.id, checked === true)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{language === 'en' ? skill.name_en : skill.name_id}</span>
                              {isPersisted && assignment?.achieved_date && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                  {new Date(assignment.achieved_date).toLocaleDateString()}
                                </span>
                              )}
                              {assigned && !isPersisted && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                  Pending save
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {language === 'en' ? skill.description_en : skill.description_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {skill.video_url ? (
                            <a
                              href={skill.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Video demo
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            variant={assigned ? 'outline' : 'secondary'}
                            onClick={() => handleSkillSelectionChange(skill.id, !assigned)}
                          >
                            {assigned ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Uncheck
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Check
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lesson Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessonHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No attendance records yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessonHistory.map((attendance) => {
                  const sessionData = Array.isArray(attendance.session) ? attendance.session[0] : attendance.session;
                  return (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-medium">
                      {sessionData?.date ? new Date(sessionData.date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{sessionData?.type ? sessionData.type.replace('_', ' ') : '-'}</TableCell>
                    <TableCell>{sessionData?.time || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          attendance.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : attendance.status === 'self_reported'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {attendance.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {attendance.marked_at ? new Date(attendance.marked_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{attendance.notes || '-'}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
