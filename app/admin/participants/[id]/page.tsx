'use client';

import { useEffect, useState } from 'react';
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
  });
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, [participantId]);

  async function loadData() {
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
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

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
        <h2 className="text-3xl font-bold text-[#443837]">{participant.full_name}</h2>
        <p className="mt-2 text-sm text-[#443837]/70">Manage participant progress</p>
      </div>

      {message && (
        <Alert variant={message.includes('Error') || message.includes('already') ? 'destructive' : 'default'}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Participant Information
            </CardTitle>
            {!editingInfo ? (
              <Button size="sm" variant="outline" onClick={() => setEditingInfo(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit Info
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingInfo(false);
                  setParticipantForm({
                    full_name: participant.full_name || '',
                    emergency_contact_name: participant.emergency_contact_name || '',
                    emergency_contact_phone: participant.emergency_contact_phone || '',
                    shoe_size: participant.shoe_size || '',
                    clothing_size: participant.clothing_size || '',
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
