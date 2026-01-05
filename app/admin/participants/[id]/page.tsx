'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Participant, Level, Skill, ParticipantSkill, ParticipantLevel } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Award, User, Plus, X, Calendar, Edit, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';

interface ParticipantSkillWithDetails extends ParticipantSkill {
  skill: Skill;
}

interface ParticipantLevelWithDetails extends ParticipantLevel {
  level: Level;
}

export default function AdminParticipantDetailPage({ params }: { params: { id: string } }) {
  const participantId = params.id;
  const [language, setLanguage] = useState<Language>('en');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantSkills, setParticipantSkills] = useState<ParticipantSkillWithDetails[]>([]);
  const [participantLevels, setParticipantLevels] = useState<ParticipantLevelWithDetails[]>([]);
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [adminId, setAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
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

      const [participantResult, skillsResult, levelsResult, participantSkillsResult, participantLevelsResult] = await Promise.all([
        supabase.from('participants').select('*, user:users(full_name)').eq('id', participantId).maybeSingle(),
        supabase.from('skills').select('*').order('order_number'),
        supabase.from('levels').select('*').order('order_number'),
        supabase.from('participant_progress').select('*, skill:skills(*)').eq('participant_id', participantId).not('skill_id','is', null),
        supabase.from('participant_progress').select('*, level:levels(*)').eq('participant_id', participantId).not('level_id','is', null),
      ]);

      if (participantResult.error) throw participantResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (levelsResult.error) throw levelsResult.error;
      if (participantSkillsResult.error) throw participantSkillsResult.error;
      if (participantLevelsResult.error) throw participantLevelsResult.error;

      // Map user.full_name to participant.full_name for backward compatibility
      const pData = participantResult.data as any;
      const mappedParticipant = pData ? { ...pData, full_name: pData.user?.full_name || pData.full_name || '' } : null;
      setParticipant(mappedParticipant);
      setAllSkills(skillsResult.data || []);
      setAllLevels(levelsResult.data || []);
      setParticipantSkills(participantSkillsResult.data as ParticipantSkillWithDetails[] || []);
      setParticipantLevels(participantLevelsResult.data as ParticipantLevelWithDetails[] || []);

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

  async function handleAddSkill() {
    if (!selectedSkillId) return;

    try {
      setMessage('');
      const { error } = await supabase
        .from('participant_progress')
        .insert({
          participant_id: participantId,
          skill_id: selectedSkillId,
          validated_by_volunteer_id: adminId,
          achieved_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      setMessage('Skill added successfully!');
      setSelectedSkillId('');
      setShowAddSkill(false);
      loadData();
    } catch (error: any) {
      if (error.code === '23505') {
        setMessage('This skill is already assigned to the participant');
      } else {
        setMessage('Error adding skill: ' + error.message);
      }
    }
  }

  async function handleRemoveSkill(skillId: string) {
    try {
      setMessage('');
      const { error } = await supabase
        .from('participant_progress')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      setMessage('Skill removed successfully!');
      loadData();
    } catch (error: any) {
      setMessage('Error removing skill: ' + error.message);
    }
  }

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

  const assignedSkillIds = participantSkills.map(ps => ps.skill_id);
  const availableSkills = allSkills.filter(s => !assignedSkillIds.includes(s.id));

  const assignedLevelIds = participantLevels.map(pl => pl.level_id);
  const availableLevels = allLevels.filter(l => !assignedLevelIds.includes(l.id));

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
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Assigned Skills
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddSkill(!showAddSkill)}>
              {showAddSkill ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showAddSkill ? 'Cancel' : 'Add Skill'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddSkill && (
            <div className="mb-4 p-4 border rounded-lg bg-green-50">
              <Label>Select Skill to Add</Label>
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Choose a skill...</option>
                  {availableSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {language === 'en' ? skill.name_en : skill.name_id}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddSkill} disabled={!selectedSkillId}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {participantSkills.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No skills assigned yet</p>
          ) : (
            <div className="space-y-3">
              {participantSkills.map((ps) => (
                <div key={ps.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {language === 'en' ? ps.skill.name_en : ps.skill.name_id}
                      </Badge>
                      {ps.achieved_date && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(ps.achieved_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {language === 'en' ? ps.skill.description_en : ps.skill.description_id}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSkill(ps.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
