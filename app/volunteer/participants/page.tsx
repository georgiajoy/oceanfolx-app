'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { createUserAction } from '@/app/admin/users/actions';
import { supabase, Language, Participant, Skill } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Info, Plus } from 'lucide-react';

interface ParticipantWithSkill extends Participant {
  highestSkill?: string;
}

export default function VolunteerParticipantsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [participants, setParticipants] = useState<ParticipantWithSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
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
    medications: 'Type of Medication (Jenis Obat): \\nReason for Medication (Alasan Mengonsumsi Obat): \\nDosage (Dosis): \\nFrequency (Frekuensi): \\nSide Effects (Efek Samping): \\nEffects of Missed Dose (Efek jika Dosis Terlewat):',
    medications_not_taking_during_program: '',
    medical_dietary_requirements: '',
    religious_personal_dietary_restrictions: '',
    swim_ability_calm: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    swim_ability_moving: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    surfing_experience: 'none' as 'none' | 'poor' | 'competent' | 'advanced',
    commitment_statement: false,
    acknowledgment_agreement_authorization: false,
    risks_release_indemnity_agreement: false,
    media_release_agreement: false,
    signature: '',
    signature_date: '',
  });
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

      const mappedParticipants = (participantsData || []).map((p: any) => ({
        ...p,
        full_name: p.user?.full_name || p.full_name || ''
      }));

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

  async function handleCreateParticipant(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.phone || !formData.password) {
      setError('Phone number and password are required');
      return;
    }

    try {
      const result = await createUserAction(
        formData.phone,
        formData.password,
        'participant',
        formData.full_name,
        'id', // Default participants to Indonesian
        formData.emergency_contact_name,
        formData.emergency_contact_phone,
        formData.shoe_size,
        formData.clothing_size,
        formData.age,
        formData.village,
        formData.number_of_children,
        formData.respiratory_issues,
        formData.diabetes,
        formData.neurological_conditions,
        formData.chronic_illnesses,
        formData.head_injuries,
        formData.hospitalizations,
        formData.medications,
        formData.medications_not_taking_during_program,
        formData.medical_dietary_requirements,
        formData.religious_personal_dietary_restrictions,
        formData.swim_ability_calm,
        formData.swim_ability_moving,
        formData.surfing_experience,
        formData.commitment_statement,
        formData.acknowledgment_agreement_authorization,
        formData.risks_release_indemnity_agreement,
        formData.media_release_agreement,
        formData.signature,
        formData.signature_date
      );

      if (result.success) {
        setSuccessMessage('Participant created successfully!');
        setIsDialogOpen(false);
        setFormData({
          phone: '',
          password: '',
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
          medications: 'Type of Medication (Jenis Obat): \\nReason for Medication (Alasan Mengonsumsi Obat): \\nDosage (Dosis): \\nFrequency (Frekuensi): \\nSide Effects (Efek Samping): \\nEffects of Missed Dose (Efek jika Dosis Terlewat):',
          medications_not_taking_during_program: '',
          medical_dietary_requirements: '',
          religious_personal_dietary_restrictions: '',
          swim_ability_calm: 'none',
          swim_ability_moving: 'none',
          surfing_experience: 'none',
          commitment_statement: false,
          acknowledgment_agreement_authorization: false,
          risks_release_indemnity_agreement: false,
          media_release_agreement: false,
          signature: '',
          signature_date: '',
        });
        loadParticipants();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create participant');
    }
  }

  const filteredParticipants = participants.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#443837]">{t('participants')}</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Participant</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add New Participant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateParticipant} className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+62812345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name
                  <span className="block text-xs text-gray-500 font-normal">Nama Lengkap</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">
                  Emergency Contact Name
                  <span className="block text-xs text-gray-500 font-normal">Nama Kontak Darurat</span>
                </Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">
                  Emergency Contact Phone
                  <span className="block text-xs text-gray-500 font-normal">Nomor Telepon Kontak Darurat</span>
                </Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shoe_size">
                  Shoe Size
                  <span className="block text-xs text-gray-500 font-normal">Ukuran Sepatu</span>
                </Label>
                <Input
                  id="shoe_size"
                  value={formData.shoe_size}
                  onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clothing_size">
                  Clothing Size
                  <span className="block text-xs text-gray-500 font-normal">Ukuran Pakaian</span>
                </Label>
                <Input
                  id="clothing_size"
                  value={formData.clothing_size}
                  onChange={(e) => setFormData({ ...formData, clothing_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age
                  <span className="block text-xs text-gray-500 font-normal">Umur</span>
                </Label>
                <Input
                  id="age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">
                  Village
                  <span className="block text-xs text-gray-500 font-normal">Desa</span>
                </Label>
                <Input
                  id="village"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_children">
                  Number of Children
                  <span className="block text-xs text-gray-500 font-normal">Jumlah Anak</span>
                </Label>
                <Input
                  id="number_of_children"
                  value={formData.number_of_children}
                  onChange={(e) => setFormData({ ...formData, number_of_children: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respiratory_issues">
                  Respiratory Issues
                  <span className="block text-xs text-gray-500 font-normal">Masalah Pernapasan</span>
                </Label>
                <Input
                  id="respiratory_issues"
                  value={formData.respiratory_issues}
                  onChange={(e) => setFormData({ ...formData, respiratory_issues: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diabetes">
                  Diabetes
                  <span className="block text-xs text-gray-500 font-normal">Diabetes</span>
                </Label>
                <Input
                  id="diabetes"
                  value={formData.diabetes}
                  onChange={(e) => setFormData({ ...formData, diabetes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neurological_conditions">
                  Neurological Conditions
                  <span className="block text-xs text-gray-500 font-normal">Kondisi Neurologis</span>
                </Label>
                <Input
                  id="neurological_conditions"
                  value={formData.neurological_conditions}
                  onChange={(e) => setFormData({ ...formData, neurological_conditions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronic_illnesses">
                  Chronic Illnesses
                  <span className="block text-xs text-gray-500 font-normal">Penyakit Kronis</span>
                </Label>
                <Input
                  id="chronic_illnesses"
                  value={formData.chronic_illnesses}
                  onChange={(e) => setFormData({ ...formData, chronic_illnesses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="head_injuries">
                  Head Injuries
                  <span className="block text-xs text-gray-500 font-normal">Cedera Kepala</span>
                </Label>
                <Input
                  id="head_injuries"
                  value={formData.head_injuries}
                  onChange={(e) => setFormData({ ...formData, head_injuries: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospitalizations">
                  Hospitalizations
                  <span className="block text-xs text-gray-500 font-normal">Rawat Inap</span>
                </Label>
                <Input
                  id="hospitalizations"
                  value={formData.hospitalizations}
                  onChange={(e) => setFormData({ ...formData, hospitalizations: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications">
                  Medications
                  <span className="block text-xs text-gray-500 font-normal">Obat-obatan</span>
                </Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications_not_taking_during_program">
                  Medications NOT Taking During Program
                  <span className="block text-xs text-gray-500 font-normal">Obat yang TIDAK Dikonsumsi Selama Program</span>
                </Label>
                <Input
                  id="medications_not_taking_during_program"
                  value={formData.medications_not_taking_during_program}
                  onChange={(e) => setFormData({ ...formData, medications_not_taking_during_program: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_dietary_requirements">
                  Medical Dietary Requirements
                  <span className="block text-xs text-gray-500 font-normal">Kebutuhan Diet Medis</span>
                </Label>
                <Input
                  id="medical_dietary_requirements"
                  value={formData.medical_dietary_requirements}
                  onChange={(e) => setFormData({ ...formData, medical_dietary_requirements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="religious_personal_dietary_restrictions">
                  Religious/Personal Dietary Restrictions
                  <span className="block text-xs text-gray-500 font-normal">Pembatasan Diet Agama/Pribadi</span>
                </Label>
                <Input
                  id="religious_personal_dietary_restrictions"
                  value={formData.religious_personal_dietary_restrictions}
                  onChange={(e) => setFormData({ ...formData, religious_personal_dietary_restrictions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swim_ability_calm">
                  Swimming Ability (Calm Water)
                  <span className="block text-xs text-gray-500 font-normal">Kemampuan Berenang (Air Tenang)</span>
                </Label>
                <select
                  id="swim_ability_calm"
                  value={formData.swim_ability_calm}
                  onChange={(e) => setFormData({ ...formData, swim_ability_calm: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="swim_ability_moving">
                  Swimming Ability (Moving Water)
                  <span className="block text-xs text-gray-500 font-normal">Kemampuan Berenang (Air Bergerak)</span>
                </Label>
                <select
                  id="swim_ability_moving"
                  value={formData.swim_ability_moving}
                  onChange={(e) => setFormData({ ...formData, swim_ability_moving: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surfing_experience">
                  Surfing Experience
                  <span className="block text-xs text-gray-500 font-normal">Pengalaman Berselancar</span>
                </Label>
                <select
                  id="surfing_experience"
                  value={formData.surfing_experience}
                  onChange={(e) => setFormData({ ...formData, surfing_experience: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="commitment_statement"
                    checked={formData.commitment_statement}
                    onCheckedChange={(checked) => setFormData({ ...formData, commitment_statement: checked as boolean })}
                  />
                  <Label htmlFor="commitment_statement" className="text-sm font-normal leading-tight">
                    I agree to the{' '}
                    <a href="https://docs.google.com/document/d/1MXJWnULGRBDNQb5r8gYCfUbRBqhCGsxqpSm3DW3aVsU/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Commitment Statement
                    </a>
                    <span className="block text-xs text-gray-500">Saya setuju dengan Pernyataan Komitmen</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acknowledgment_agreement_authorization"
                    checked={formData.acknowledgment_agreement_authorization}
                    onCheckedChange={(checked) => setFormData({ ...formData, acknowledgment_agreement_authorization: checked as boolean })}
                  />
                  <Label htmlFor="acknowledgment_agreement_authorization" className="text-sm font-normal leading-tight">
                    I agree to the{' '}
                    <a href="https://docs.google.com/document/d/1MXJWnULGRBDNQb5r8gYCfUbRBqhCGsxqpSm3DW3aVsU/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Acknowledgment, Agreement and Authorization
                    </a>
                    <span className="block text-xs text-gray-500">Saya setuju dengan Pengakuan, Persetujuan dan Otorisasi</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="risks_release_indemnity_agreement"
                    checked={formData.risks_release_indemnity_agreement}
                    onCheckedChange={(checked) => setFormData({ ...formData, risks_release_indemnity_agreement: checked as boolean })}
                  />
                  <Label htmlFor="risks_release_indemnity_agreement" className="text-sm font-normal leading-tight">
                    I agree to the{' '}
                    <a href="https://docs.google.com/document/d/1MXJWnULGRBDNQb5r8gYCfUbRBqhCGsxqpSm3DW3aVsU/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Risks, Release and Indemnity Agreement
                    </a>
                    <span className="block text-xs text-gray-500">Saya setuju dengan Perjanjian Risiko, Pembebasan dan Ganti Rugi</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="media_release_agreement"
                    checked={formData.media_release_agreement}
                    onCheckedChange={(checked) => setFormData({ ...formData, media_release_agreement: checked as boolean })}
                  />
                  <Label htmlFor="media_release_agreement" className="text-sm font-normal leading-tight">
                    I agree to the{' '}
                    <a href="https://docs.google.com/document/d/1MXJWnULGRBDNQb5r8gYCfUbRBqhCGsxqpSm3DW3aVsU/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Media Release Agreement
                    </a>
                    <span className="block text-xs text-gray-500">Saya setuju dengan Perjanjian Rilis Media</span>
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">
                  Signature
                  <span className="block text-xs text-gray-500 font-normal">Tanda Tangan</span>
                </Label>
                <Input
                  id="signature"
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature_date">
                  Signature Date
                  <span className="block text-xs text-gray-500 font-normal">Tanggal Tanda Tangan</span>
                </Label>
                <Input
                  id="signature_date"
                  type="date"
                  value={formData.signature_date}
                  onChange={(e) => setFormData({ ...formData, signature_date: e.target.value })}
                />
              </div>
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

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
                          onClick={() => router.push(`/volunteer/participants/${participant.id}`)}
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
