'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { createUserAction, deleteUserAction, updateUserAction } from './actions';
import { supabase, Language, UserProfile, UserRole } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Trash2, Edit3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UsersManagementPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const defaultFormData = {
    phone: '',
    password: '',
    role: 'participant' as UserRole,
    full_name: '',
    preferred_name: '',
    birthday: '',
    allergies: '',
    bpjs_number: '',
    profile_photo_url: '',
    notes: '',
    code_of_conduct_url: '',
    safeguarding_policy_url: '',
    indemnity_agreement_url: '',
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
    medications: 'Type of Medication (Jenis Obat): \nReason for Medication (Alasan Mengonsumsi Obat): \nDosage (Dosis): \nFrequency (Frekuensi): \nSide Effects (Efek Samping): \nEffects of Missed Dose (Efek jika Dosis Terlewat):',
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
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState<Array<{ id: string; name_en: string; name_id: string }>>([]);
  const [usersWithLevels, setUsersWithLevels] = useState<Array<UserProfile & { highest_level?: string }>>([]);
  const t = useTranslation(language);
  const isEditing = Boolean(editingUser);

  function getPolicyUrlsForRole(role: UserRole) {
    if (role === 'local_leader') {
      return {
        code_of_conduct_url: 'https://docs.google.com/document/d/1yoosDEv4FWcuuPkQAyGOjmuv35mJpVAL',
        safeguarding_policy_url: 'https://docs.google.com/document/d/1bJEFsidVXBV7r-69Z9MtCkwCITKsMLEq',
        indemnity_agreement_url: 'https://docs.google.com/document/d/14bXajnXp_FwSqob-v81_sdGbylUYh6r9',
      };
    }

    if (role === 'admin' || role === 'intern') {
      return {
        code_of_conduct_url: 'https://docs.google.com/document/d/131Px2JzGfkSwPalBCs8L-',
        safeguarding_policy_url: 'https://docs.google.com/document/d/1bGdLmOJsBYk2OKpYUrMYIheRooHCKyeO',
        indemnity_agreement_url: '',
      };
    }

    return {
      code_of_conduct_url: '',
      safeguarding_policy_url: '',
      indemnity_agreement_url: '',
    };
  }

  function openCreateUserDialog() {
    setEditingUser(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  }

  async function openEditUserDialog(user: UserProfile) {
    setEditingUser(user);

    let participantData: any = null;
    if (user.role === 'participant') {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading participant row for edit:', error);
      } else {
        participantData = data;
      }
    }

    setFormData({
      ...defaultFormData,
      phone: user.phone || '',
      role: user.role,
      full_name: user.full_name || '',
      preferred_name: user.preferred_name || '',
      birthday: user.birthday || '',
      allergies: user.allergies || '',
      bpjs_number: user.bpjs_number || '',
      profile_photo_url: user.profile_photo_url || '',
      notes: user.notes || '',
      code_of_conduct_url: user.code_of_conduct_url || '',
      safeguarding_policy_url: user.safeguarding_policy_url || '',
      indemnity_agreement_url: user.indemnity_agreement_url || '',
      emergency_contact_name: participantData?.emergency_contact_name ?? user.emergency_contact_name ?? '',
      emergency_contact_phone: participantData?.emergency_contact_phone ?? user.emergency_contact_phone ?? '',
      shoe_size: participantData?.shoe_size ?? user.shoe_size ?? '',
      clothing_size: participantData?.clothing_size ?? user.clothing_size ?? '',
      age: participantData?.age ?? user.age ?? '',
      village: participantData?.village ?? user.village ?? '',
      number_of_children: participantData?.number_of_children ?? user.number_of_children ?? '',
      respiratory_issues: participantData?.respiratory_issues ?? user.respiratory_issues ?? '',
      diabetes: participantData?.diabetes ?? user.diabetes ?? '',
      neurological_conditions: participantData?.neurological_conditions ?? user.neurological_conditions ?? '',
      chronic_illnesses: participantData?.chronic_illnesses ?? user.chronic_illnesses ?? '',
      head_injuries: participantData?.head_injuries ?? user.head_injuries ?? '',
      hospitalizations: participantData?.hospitalizations ?? user.hospitalizations ?? '',
      medications: participantData?.medications ?? user.medications ?? defaultFormData.medications,
      medications_not_taking_during_program: participantData?.medications_not_taking_during_program ?? user.medications_not_taking_during_program ?? '',
      medical_dietary_requirements: participantData?.medical_dietary_requirements ?? user.medical_dietary_requirements ?? '',
      religious_personal_dietary_restrictions: participantData?.religious_personal_dietary_restrictions ?? user.religious_personal_dietary_restrictions ?? '',
      swim_ability_calm: participantData?.swim_ability_calm ?? user.swim_ability_calm ?? 'none',
      swim_ability_moving: participantData?.swim_ability_moving ?? user.swim_ability_moving ?? 'none',
      surfing_experience: participantData?.surfing_experience ?? user.surfing_experience ?? 'none',
      commitment_statement: participantData?.commitment_statement ?? Boolean(user.commitment_statement),
      risks_release_indemnity_agreement: participantData?.risks_release_indemnity_agreement ?? Boolean(user.risks_release_indemnity_agreement),
      media_release_agreement: participantData?.media_release_agreement ?? Boolean(user.media_release_agreement),
      hijab_photo_preference: participantData?.hijab_photo_preference ?? user.hijab_photo_preference ?? 'with_or_without',
      signature: participantData?.signature ?? user.signature ?? '',
      signature_date: participantData?.signature_date ?? user.signature_date ?? '',
    });
    setIsDialogOpen(true);
  }

  useEffect(() => {
    loadLanguage();
    loadLevels();
    loadUsers();
  }, []);

  async function loadLanguage() {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
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
      const { data, error } = await supabase
        .from('levels')
        .select('id, name_en, name_id')
        .order('order_number');

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch highest level for each participant
      const usersWithLevelData = await Promise.all(
        (usersData || []).map(async (user) => {
          if (user.role !== 'participant') {
            return { ...user, highest_level: undefined };
          }

          try {
            const { data: participantData } = await supabase
              .from('participants')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (!participantData) {
              return { ...user, highest_level: undefined };
            }

            const { data: progressData } = await supabase
              .from('participant_progress')
              .select('level:levels(id, name_en, name_id)')
              .eq('participant_id', participantData.id)
              .not('level_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (progressData && progressData.level) {
              const levelData = progressData.level as any;
              return { ...user, highest_level: levelData.id, highest_level_name: levelData };
            }
            return { ...user, highest_level: undefined };
          } catch (error) {
            console.error('Error fetching level for user:', user.id, error);
            return { ...user, highest_level: undefined };
          }
        })
      );

      setUsersWithLevels(usersWithLevelData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.phone || !formData.password) {
      setError('Phone number and password are required');
      return;
    }

    try {
      // Use server action to create user (uses service role, bypasses RLS)
      // Default participants to Indonesian, others to English
      const userLanguage = formData.role === 'participant' ? 'id' : 'en';
      
      const result = await createUserAction(
        formData.phone,
        formData.password,
        formData.role,
        formData.full_name,
        formData.emergency_contact_name,
        formData.emergency_contact_phone,
        userLanguage,
        formData.preferred_name,
        formData.birthday,
        formData.allergies,
        formData.bpjs_number,
        formData.profile_photo_url,
        formData.notes,
        formData.code_of_conduct_url,
        formData.safeguarding_policy_url,
        formData.indemnity_agreement_url,
        // New participant fields
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
        // Acknowledgment and agreement fields
        formData.commitment_statement,
        formData.risks_release_indemnity_agreement,
        formData.media_release_agreement,
        formData.hijab_photo_preference,
        formData.signature,
        formData.signature_date
      );

      if (result.success) {
        setEditingUser(null);
        setFormData(defaultFormData);
        setIsDialogOpen(false);
        setSuccessMessage('User created successfully!');
        loadUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccessMessage('');

    try {
      const userLanguage = editingUser.preferred_language || (formData.role === 'participant' ? 'id' : 'en');

      const result = await updateUserAction(
        editingUser.id,
        formData.phone,
        formData.role,
        formData.full_name,
        formData.emergency_contact_name,
        formData.emergency_contact_phone,
        userLanguage,
        formData.preferred_name,
        formData.birthday,
        formData.allergies,
        formData.bpjs_number,
        formData.profile_photo_url,
        formData.notes,
        formData.code_of_conduct_url,
        formData.safeguarding_policy_url,
        formData.indemnity_agreement_url,
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
        formData.risks_release_indemnity_agreement,
        formData.media_release_agreement,
        formData.hijab_photo_preference,
        formData.signature,
        formData.signature_date
      );

      if (result.success) {
        setEditingUser(null);
        setFormData(defaultFormData);
        setIsDialogOpen(false);
        setSuccessMessage('User updated successfully!');
        loadUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  }

  async function handleDeleteUser(userId: string) {
    setError('');
    setSuccessMessage('');

    if (userId === currentUserId) {
      setError('You cannot delete your own account');
      return;
    }

    try {
      await deleteUserAction(userId);

      setSuccessMessage('User deleted successfully!');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  }

  const filteredUsers = usersWithLevels.filter(u => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      u.phone?.toLowerCase().includes(searchTermLower) ||
      u.role.toLowerCase().includes(searchTermLower) ||
      u.full_name?.toLowerCase().includes(searchTermLower)
    );
  });

  function getRoleBadgeVariant(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'intern':
        return 'default' as const;
      case 'participant':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">User Management</h2>
            <p className="text-xs sm:text-sm text-[#443837]/70 mt-1">Manage all users in the system</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
              setFormData(defaultFormData);
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
                <Button onClick={openCreateUserDialog} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add User</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>
            <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="space-y-4 overflow-y-auto flex-1 pr-2">
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
                <p className="text-xs text-gray-500">Include country code (e.g., +62 for Indonesia)</p>
              </div>
              {!isEditing ? (
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
              ) : (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <p className="text-sm text-gray-500">Password cannot be updated here.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="participant">Participant</option>
                  <option value="intern">Intern</option>
                  <option value="local_leader">Local Leader</option>
                  <option value="admin">Admin</option>
                </select>
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
                <Label htmlFor="preferred_name">
                  Preferred Name
                  <span className="block text-xs text-gray-500 font-normal">Nama Panggilan</span>
                </Label>
                <Input
                  id="preferred_name"
                  value={formData.preferred_name}
                  onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">
                  Birthday
                  <span className="block text-xs text-gray-500 font-normal">Tanggal Lahir</span>
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">
                  Allergies
                  <span className="block text-xs text-gray-500 font-normal">Alergi</span>
                </Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g., Peanuts, Shellfish"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjs_number">
                  BPJS Number
                  <span className="block text-xs text-gray-500 font-normal">Nomor BPJS</span>
                </Label>
                <Input
                  id="bpjs_number"
                  value={formData.bpjs_number}
                  onChange={(e) => setFormData({ ...formData, bpjs_number: e.target.value })}
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
                    <Label htmlFor="swim_ability_calm">
                      Swim Ability (Calm Water)
                      <span className="block text-xs text-gray-500 font-normal">Kemampuan Berenang (Air Tenang)</span>
                    </Label>
                    <select
                      id="swim_ability_calm"
                      value={formData.swim_ability_calm}
                      onChange={(e) => setFormData({ ...formData, swim_ability_calm: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
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
                      Swim Ability (Moving Water)
                      <span className="block text-xs text-gray-500 font-normal">Kemampuan Berenang (Air Bergerak)</span>
                    </Label>
                    <select
                      id="swim_ability_moving"
                      value={formData.swim_ability_moving}
                      onChange={(e) => setFormData({ ...formData, swim_ability_moving: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
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
                      onChange={(e) => setFormData({ ...formData, surfing_experience: e.target.value as 'none' | 'poor' | 'competent' | 'advanced' })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="none">None</option>
                      <option value="poor">Poor</option>
                      <option value="competent">Competent</option>
                      <option value="advanced">Advanced</option>
                    </select>
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
                      placeholder="e.g., Asthma"
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
                      <span className="block text-xs text-gray-500 font-normal">Rawat Inap di Rumah Sakit</span>
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
                      className="text-sm"
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
                      placeholder="Medications participant will not take during program"
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
                  
                  {/* Acknowledgment and Agreement Checkboxes */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm">Acknowledgments & Agreements</h3>

                    {(formData.role === 'admin' || formData.role === 'intern' || formData.role === 'local_leader') && (
                      <>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="policy_code_of_conduct" />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="policy_code_of_conduct"
                              className="text-sm font-medium leading-none"
                            >
                              Code of Conduct{' '}
                              <a
                                href={getPolicyUrlsForRole(formData.role).code_of_conduct_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                (View Document)
                              </a>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Checkbox id="policy_safeguarding" />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="policy_safeguarding"
                              className="text-sm font-medium leading-none"
                            >
                              Safeguarding Policy{' '}
                              <a
                                href={getPolicyUrlsForRole(formData.role).safeguarding_policy_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                (View Document)
                              </a>
                            </label>
                          </div>
                        </div>

                        {formData.role === 'local_leader' && (
                          <div className="flex items-start space-x-2">
                            <Checkbox id="policy_indemnity" />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor="policy_indemnity"
                                className="text-sm font-medium leading-none"
                              >
                                Indemnity Agreement{' '}
                                <a
                                  href={getPolicyUrlsForRole(formData.role).indemnity_agreement_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  (View Document)
                                </a>
                              </label>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="commitment_statement"
                        checked={formData.commitment_statement}
                        onCheckedChange={(checked) => setFormData({ ...formData, commitment_statement: checked as boolean })}
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

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="risks_release_indemnity_agreement"
                        checked={formData.risks_release_indemnity_agreement}
                        onCheckedChange={(checked) => setFormData({ ...formData, risks_release_indemnity_agreement: checked as boolean })}
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

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="media_release_agreement"
                        checked={formData.media_release_agreement}
                        onCheckedChange={(checked) => setFormData({ ...formData, media_release_agreement: checked as boolean })}
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

                    <div className="space-y-2">
                      <Label htmlFor="hijab_photo_preference">
                        Hijab Photo Preference
                        <span className="block text-xs text-gray-500 font-normal">Preferensi Foto Hijab</span>
                      </Label>
                      <select
                        id="hijab_photo_preference"
                        value={formData.hijab_photo_preference}
                        onChange={(e) => setFormData({ ...formData, hijab_photo_preference: e.target.value as 'with_or_without' | 'only_with' })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="with_or_without">I am comfortable being photographed with or without my hijab</option>
                        <option value="only_with">I am only comfortable being photographed with my hijab</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signature" className="block">
                        <span className="text-sm font-medium">Signature Agreement</span>
                        <span className="block text-xs text-gray-600 mt-1 leading-relaxed">
                          By typing my name below I acknowledge I have read and agree to all the above agreements and understand there is inherent risk associated with the program and I agree to release and not sue Oceanfolx for any claims arising from participation in the Activities and to indemnify and hold harmless Oceanfolx from claims. My typed name signifies my signature and understanding.
                        </span>
                        <span className="block text-xs text-gray-500 mt-1">
                          Dengan mengetikkan nama saya di bawah ini, saya mengakui bahwa saya telah membaca dan menyetujui semua perjanjian di atas dan memahami bahwa ada risiko yang melekat terkait dengan program ini dan saya setuju untuk melepaskan dan tidak menuntut Oceanfolx atas klaim apa pun yang timbul dari partisipasi dalam Kegiatan dan untuk mengganti rugi dan membebaskan Oceanfolx dari klaim. Nama yang saya ketik menandakan tanda tangan dan pemahaman saya.
                        </span>
                      </Label>
                      <Input
                        id="signature"
                        placeholder="Type your full name / Ketik nama lengkap Anda"
                        value={formData.signature}
                        onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signature_date">Date of Signature</Label>
                      <Input
                        id="signature_date"
                        type="date"
                        value={formData.signature_date}
                        onChange={(e) => setFormData({ ...formData, signature_date: e.target.value })}
                      />
                    </div>
                  </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{isEditing ? 'Update' : t('create')}</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="mt-4">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone, name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
                    <TableHead>Full Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Highest Level</TableHead>
                    <TableHead>Hijab Preference</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {t('no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const userLevel = levels.find(l => l.id === (user as any).highest_level);
                    const levelName = userLevel ? (language === 'en' ? userLevel.name_en : userLevel.name_id) : '—';
                    const hijabLabel = user.hijab_photo_preference === 'only_with' ? 'With Hijab' : user.hijab_photo_preference === 'with_or_without' ? 'With/Without' : '—';
                    return (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '—'}</TableCell>
                      <TableCell className="font-medium">{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{levelName}</TableCell>
                      <TableCell className="text-sm">{hijabLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.preferred_language.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditUserDialog(user)}
                          className="text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={user.id === currentUserId}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this user ({user.phone})? This action cannot be undone and will remove all associated data including participant records, attendance, and progress.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </TableCell>
                    </TableRow>
                    );
                  })
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
