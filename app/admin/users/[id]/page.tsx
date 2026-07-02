'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Edit, Save, X, Upload } from 'lucide-react';
import { supabase, UserProfile, UserRole } from '@/lib/supabase';
import { saveUserFileUploadsAction, saveUserFormSubmissionsAction, updateUserAction } from '../actions';
import {
  BusinessRole,
  getFormDocumentUrl,
  getRequiredFilesForRole,
  getRequiredFormsForRole,
  getRoleLabel,
  normalizeBusinessRole,
  ROLE_OPTIONS,
  RequiredFile,
  RequiredForm,
} from '../role-utils';
import { UserProfilePhotoUpload } from '../UserProfilePhotoUpload';

interface UserDetailFormState {
  phone: string;
  role: BusinessRole;
  full_name: string;
  preferred_name: string;
  birthday: string;
  allergies: string;
  bpjs_number: string;
  notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  shoe_size: string;
  clothing_size: string;
  age: string;
  village: string;
  number_of_children: string;
  respiratory_issues: string;
  diabetes: string;
  neurological_conditions: string;
  chronic_illnesses: string;
  head_injuries: string;
  hospitalizations: string;
  medications: string;
  medications_not_taking_during_program: string;
  medical_dietary_requirements: string;
  religious_personal_dietary_restrictions: string;
  swim_ability_calm: 'none' | 'poor' | 'competent' | 'advanced';
  swim_ability_moving: 'none' | 'poor' | 'competent' | 'advanced';
  surfing_experience: 'none' | 'poor' | 'competent' | 'advanced';
  hijab_photo_preference: 'with_or_without' | 'only_with';
  signature: string;
  signature_date: string;
}

const defaultFormState: UserDetailFormState = {
  phone: '',
  role: 'participant',
  full_name: '',
  preferred_name: '',
  birthday: '',
  allergies: '',
  bpjs_number: '',
  notes: '',
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
  swim_ability_calm: 'none',
  swim_ability_moving: 'none',
  surfing_experience: 'none',
  hijab_photo_preference: 'with_or_without',
  signature: '',
  signature_date: '',
};

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const userId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [formState, setFormState] = useState<UserDetailFormState>(defaultFormState);

  const [requiredForms, setRequiredForms] = useState<RequiredForm[]>([]);
  const [requiredFiles, setRequiredFiles] = useState<RequiredFile[]>([]);
  const [formAcceptances, setFormAcceptances] = useState<Record<string, boolean>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, { file_url: string; notes: string }>>({});
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadRoleRequirements = useCallback(async (role: BusinessRole) => {
    const forms = getRequiredFormsForRole(role);
    const files = getRequiredFilesForRole(role);

    setRequiredForms(forms);
    setRequiredFiles(files);

    setFormAcceptances((prev) => {
      const next: Record<string, boolean> = {};
      forms.forEach((form) => {
        next[form.id] = prev[form.id] ?? false;
      });
      return next;
    });

    setFileUploads((prev) => {
      const next: Record<string, { file_url: string; notes: string }> = {};
      files.forEach((file) => {
        next[file.id] = prev[file.id] ?? { file_url: '', notes: '' };
      });
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !userData) throw new Error('User not found');

      let role = normalizeBusinessRole(userData.role as string);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (roleData?.role_id) {
        role = normalizeBusinessRole(roleData.role_id as string);
      }

      const { data: participantData } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (role === 'participant' && participantData?.id) {
        router.replace(`/admin/participants/${participantData.id}`);
        return;
      }

      const { data: userFormsData } = await supabase
        .from('user_form_submissions')
        .select('form_id, accepted')
        .eq('user_id', userId);

      const { data: userFilesData } = await supabase
        .from('user_file_uploads')
        .select('file_id, file_url, notes, uploaded_at')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      setUser({ ...userData, role } as UserProfile);
      setProfilePhotoUrl(userData.profile_photo_url || participantData?.profile_photo_url || '');
      setFormState({
        phone: userData.phone || '',
        role,
        full_name: userData.full_name || '',
        preferred_name: userData.preferred_name || '',
        birthday: userData.birthday || '',
        allergies: userData.allergies || '',
        bpjs_number: userData.bpjs_number || '',
        notes: participantData?.notes || userData.notes || '',
        emergency_contact_name: participantData?.emergency_contact_name || userData.emergency_contact_name || '',
        emergency_contact_phone: participantData?.emergency_contact_phone || userData.emergency_contact_phone || '',
        shoe_size: participantData?.shoe_size || userData.shoe_size || '',
        clothing_size: participantData?.clothing_size || userData.clothing_size || '',
        age: participantData?.age || userData.age || '',
        village: participantData?.village || userData.village || '',
        number_of_children: participantData?.number_of_children || userData.number_of_children || '',
        respiratory_issues: participantData?.respiratory_issues || userData.respiratory_issues || '',
        diabetes: participantData?.diabetes || userData.diabetes || '',
        neurological_conditions: participantData?.neurological_conditions || userData.neurological_conditions || '',
        chronic_illnesses: participantData?.chronic_illnesses || userData.chronic_illnesses || '',
        head_injuries: participantData?.head_injuries || userData.head_injuries || '',
        hospitalizations: participantData?.hospitalizations || userData.hospitalizations || '',
        medications: participantData?.medications || userData.medications || '',
        medications_not_taking_during_program: participantData?.medications_not_taking_during_program || userData.medications_not_taking_during_program || '',
        medical_dietary_requirements: participantData?.medical_dietary_requirements || userData.medical_dietary_requirements || '',
        religious_personal_dietary_restrictions: participantData?.religious_personal_dietary_restrictions || userData.religious_personal_dietary_restrictions || '',
        swim_ability_calm: participantData?.swim_ability_calm || userData.swim_ability_calm || 'none',
        swim_ability_moving: participantData?.swim_ability_moving || userData.swim_ability_moving || 'none',
        surfing_experience: participantData?.surfing_experience || userData.surfing_experience || 'none',
        hijab_photo_preference: participantData?.hijab_photo_preference || userData.hijab_photo_preference || 'with_or_without',
        signature: participantData?.signature || userData.signature || '',
        signature_date: participantData?.signature_date || userData.signature_date || '',
      });

      await loadRoleRequirements(role);

      const nextAcceptances: Record<string, boolean> = {};
      (userFormsData || []).forEach((submission: any) => {
        nextAcceptances[submission.form_id] = Boolean(submission.accepted);
      });
      setFormAcceptances((prev) => ({ ...prev, ...nextAcceptances }));

      const latestUploads: Record<string, { file_url: string; notes: string }> = {};
      (userFilesData || []).forEach((row: any) => {
        if (!latestUploads[row.file_id]) {
          latestUploads[row.file_id] = { file_url: row.file_url || '', notes: row.notes || '' };
        }
      });
      setFileUploads((prev) => ({ ...prev, ...latestUploads }));
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [loadRoleRequirements, router, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRoleRequirements(formState.role).catch((loadError: any) => {
      setError(loadError.message || 'Failed to load role requirements');
    });
  }, [formState.role, loadRoleRequirements]);

  function setField<K extends keyof UserDetailFormState>(key: K, value: UserDetailFormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRoleFileUpload(fileId: string, file: File) {
    if (!file) return;

    try {
      setError('');
      setUploadingFileId(fileId);

      const fileExt = file.name.split('.').pop() || 'bin';
      const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${fileId}/${Date.now()}_${safeBaseName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('user-files').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setFileUploads((prev) => ({
        ...prev,
        [fileId]: {
          ...(prev[fileId] || { file_url: '', notes: '' }),
          file_url: publicUrl,
        },
      }));
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload file');
    } finally {
      setUploadingFileId(null);
      if (fileInputRefs.current[fileId]) {
        fileInputRefs.current[fileId]!.value = '';
      }
    }
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateUserAction(
        user.id,
        formState.phone,
        formState.role as UserRole,
        formState.full_name,
        formState.emergency_contact_name,
        formState.emergency_contact_phone,
        user.preferred_language || (formState.role === 'participant' ? 'id' : 'en'),
        formState.preferred_name,
        formState.birthday,
        formState.allergies,
        formState.bpjs_number,
        profilePhotoUrl || undefined,
        formState.notes,
        undefined,
        undefined,
        undefined,
        formState.shoe_size,
        formState.clothing_size,
        formState.age,
        formState.village,
        formState.number_of_children,
        formState.respiratory_issues,
        formState.diabetes,
        formState.neurological_conditions,
        formState.chronic_illnesses,
        formState.head_injuries,
        formState.hospitalizations,
        formState.medications,
        formState.medications_not_taking_during_program,
        formState.medical_dietary_requirements,
        formState.religious_personal_dietary_restrictions,
        formState.swim_ability_calm,
        formState.swim_ability_moving,
        formState.surfing_experience,
        Boolean(formAcceptances.commitment_statement),
        Boolean(formAcceptances.indemnity_agreement),
        Boolean(formAcceptances.media_consent),
        formState.hijab_photo_preference,
        formState.signature,
        formState.signature_date
      );

      await saveUserFormSubmissionsAction(
        user.id,
        requiredForms.map((form) => ({
          form_id: form.id,
          accepted: Boolean(formAcceptances[form.id]),
          signed_at: formState.signature_date || null,
        }))
      );

      await saveUserFileUploadsAction(
        user.id,
        requiredFiles.map((file) => ({
          file_id: file.id,
          file_url: fileUploads[file.id]?.file_url || '',
          notes: fileUploads[file.id]?.notes || '',
        }))
      );

      setMessage('User updated successfully.');
      setEditingInfo(false);
      await loadData();
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'preferred_name', label: 'Preferred Name' },
    { key: 'birthday', label: 'Birthday', type: 'date' },
    { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
    { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
    { key: 'shoe_size', label: 'Shoe Size' },
    { key: 'clothing_size', label: 'Clothing Size' },
    { key: 'age', label: 'Age' },
    { key: 'village', label: 'Village' },
    { key: 'number_of_children', label: 'Number of Children' },
    { key: 'allergies', label: 'Allergies' },
    { key: 'bpjs_number', label: 'BPJS Number' },
    { key: 'respiratory_issues', label: 'Respiratory Issues' },
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'neurological_conditions', label: 'Neurological Conditions' },
    { key: 'chronic_illnesses', label: 'Chronic Illnesses' },
    { key: 'head_injuries', label: 'Head Injuries' },
    { key: 'hospitalizations', label: 'Hospitalizations' },
    { key: 'medical_dietary_requirements', label: 'Medical Dietary Requirements' },
    { key: 'religious_personal_dietary_restrictions', label: 'Religious/Personal Dietary Restrictions' },
  ] as const;

  const notesFields = useMemo(
    () => [
      { key: 'medications', label: 'Medications' },
      { key: 'medications_not_taking_during_program', label: 'Medications Not Taking During Program' },
      { key: 'notes', label: 'Notes' },
    ] as const,
    []
  );

  if (loading) return <div className="text-center py-8 text-gray-500">Loading user...</div>;
  if (!user) return <div className="text-center py-8 text-red-600">User not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">{formState.full_name || 'User'}</h2>
        <p className="mt-1 text-xs sm:text-sm text-[#443837]/70">Role: {getRoleLabel(formState.role)}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            {!editingInfo ? (
              <Button size="sm" variant="outline" onClick={() => setEditingInfo(true)} className="w-full sm:w-auto">
                <Edit className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit Info</span>
                <span className="sm:hidden ml-1">Edit</span>
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" onClick={() => setEditingInfo(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <UserProfilePhotoUpload
              userId={user.id}
              currentPhotoUrl={profilePhotoUrl}
              onPhotoUpdate={setProfilePhotoUrl}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Role</Label>
              {editingInfo ? (
                <select
                  value={formState.role}
                  onChange={(e) => setField('role', e.target.value as BusinessRole)}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-medium mt-1">{getRoleLabel(formState.role)}</div>
              )}
            </div>

            {fields.map((field) => (
              <div key={field.key}>
                <Label className="text-sm text-gray-600">{field.label}</Label>
                {editingInfo ? (
                  <Input
                    type={'type' in field ? field.type : 'text'}
                    value={(formState[field.key] as string) || ''}
                    onChange={(e) => setField(field.key, e.target.value as any)}
                    className="mt-1"
                  />
                ) : (
                  <div className="font-medium mt-1">{(formState[field.key] as string) || 'Not specified'}</div>
                )}
              </div>
            ))}

            <div>
              <Label className="text-sm text-gray-600">Swim Ability (Calm Water)</Label>
              {editingInfo ? (
                <select
                  value={formState.swim_ability_calm}
                  onChange={(e) => setField('swim_ability_calm', e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{formState.swim_ability_calm || 'Not specified'}</div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">Swim Ability (Moving Water)</Label>
              {editingInfo ? (
                <select
                  value={formState.swim_ability_moving}
                  onChange={(e) => setField('swim_ability_moving', e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{formState.swim_ability_moving || 'Not specified'}</div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">Surfing Experience</Label>
              {editingInfo ? (
                <select
                  value={formState.surfing_experience}
                  onChange={(e) => setField('surfing_experience', e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="competent">Competent</option>
                  <option value="advanced">Advanced</option>
                </select>
              ) : (
                <div className="font-medium mt-1 capitalize">{formState.surfing_experience || 'Not specified'}</div>
              )}
            </div>

            {notesFields.map((field) => (
              <div key={field.key} className="md:col-span-2">
                <Label className="text-sm text-gray-600">{field.label}</Label>
                {editingInfo ? (
                  <Textarea
                    value={(formState[field.key] as string) || ''}
                    onChange={(e) => setField(field.key, e.target.value as any)}
                    rows={3}
                    className="mt-1"
                  />
                ) : (
                  <div className="font-medium mt-1 whitespace-pre-wrap">{(formState[field.key] as string) || 'Not specified'}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acknowledgments and Agreements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requiredForms.length === 0 ? (
            <p className="text-sm text-gray-500">No forms required for this role.</p>
          ) : (
            requiredForms.map((form) => (
              <div key={form.id} className="flex items-start space-x-3 rounded-md border p-3">
                <Checkbox
                  id={`required-form-${form.id}`}
                  checked={Boolean(formAcceptances[form.id])}
                  onCheckedChange={(checked) => {
                    setFormAcceptances((prev) => ({ ...prev, [form.id]: Boolean(checked) }));
                  }}
                />
                <div>
                  <Label htmlFor={`required-form-${form.id}`}>{form.label}</Label>
                  {getFormDocumentUrl(form.id) && (
                    <a
                      href={getFormDocumentUrl(form.id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 hover:underline mt-1"
                    >
                      View Document
                    </a>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hijab_photo_preference">Hijab Photo Preference</Label>
              <select
                id="hijab_photo_preference"
                value={formState.hijab_photo_preference}
                onChange={(e) => setField('hijab_photo_preference', e.target.value as 'with_or_without' | 'only_with')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="with_or_without">With or without hijab</option>
                <option value="only_with">Only with hijab</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature_date">Signature Date</Label>
              <Input
                id="signature_date"
                type="date"
                value={formState.signature_date}
                onChange={(e) => setField('signature_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">Signature</Label>
            <Input
              id="signature"
              value={formState.signature}
              onChange={(e) => setField('signature', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Required File Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredFiles.length === 0 ? (
            <p className="text-sm text-gray-500">No files required for this role.</p>
          ) : (
            requiredFiles.map((file) => (
              <div key={file.id} className="rounded-md border p-4 space-y-3">
                <div className="font-medium">{file.label}</div>
                {file.description && <div className="text-xs text-gray-500">{file.description}</div>}

                <input
                  ref={(el) => {
                    fileInputRefs.current[file.id] = el;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleRoleFileUpload(file.id, selected);
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRefs.current[file.id]?.click()}
                  disabled={uploadingFileId === file.id}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFileId === file.id ? 'Uploading...' : `Upload ${file.label}`}
                </Button>

                <div className="space-y-2">
                  <Label htmlFor={`file-url-${file.id}`}>File URL</Label>
                  <Input
                    id={`file-url-${file.id}`}
                    value={fileUploads[file.id]?.file_url || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFileUploads((prev) => ({
                        ...prev,
                        [file.id]: { ...(prev[file.id] || { file_url: '', notes: '' }), file_url: value },
                      }));
                    }}
                    placeholder="https://..."
                  />
                  {fileUploads[file.id]?.file_url && (
                    <a
                      href={fileUploads[file.id].file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Open uploaded file
                    </a>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`file-notes-${file.id}`}>Notes</Label>
                  <Textarea
                    id={`file-notes-${file.id}`}
                    rows={2}
                    value={fileUploads[file.id]?.notes || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFileUploads((prev) => ({
                        ...prev,
                        [file.id]: { ...(prev[file.id] || { file_url: '', notes: '' }), notes: value },
                      }));
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
          Back to Users
        </Button>
      </div>
    </div>
  );
}
