'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createUserAction, saveUserFormSubmissionsAction } from '../actions';
import { UserRole } from '@/lib/supabase';
import { BusinessRole, fetchRequiredForms, isParticipantRole, ROLE_OPTIONS, RequiredForm } from '../role-utils';

interface CreateUserFormState {
  phone: string;
  password: string;
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

const defaultFormState: CreateUserFormState = {
  phone: '',
  password: '',
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

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<CreateUserFormState>(defaultFormState);
  const [requiredForms, setRequiredForms] = useState<RequiredForm[]>([]);
  const [formAcceptances, setFormAcceptances] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoleRequirements(formState.role);
  }, [formState.role]);

  async function loadRoleRequirements(role: BusinessRole) {
    try {
      setLoadingRequirements(true);
      const forms = await fetchRequiredForms(role);
      setRequiredForms(forms);
      setFormAcceptances((prev) => {
        const next: Record<string, boolean> = {};
        forms.forEach((form) => {
          next[form.id] = prev[form.id] ?? false;
        });
        return next;
      });
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load role requirements');
    } finally {
      setLoadingRequirements(false);
    }
  }

  const showParticipantFields = useMemo(() => isParticipantRole(formState.role), [formState.role]);

  function setField<K extends keyof CreateUserFormState>(key: K, value: CreateUserFormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function getCoreFormAccepted(formId: string) {
    return Boolean(formAcceptances[formId]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!formState.phone.trim() || !formState.password.trim() || !formState.full_name.trim()) {
      setError('Phone, password, and full name are required.');
      return;
    }

    setSubmitting(true);

    try {
      const createResult = await createUserAction(
        formState.phone,
        formState.password,
        formState.role as UserRole,
        formState.full_name,
        formState.emergency_contact_name,
        formState.emergency_contact_phone,
        formState.role === 'participant' ? 'id' : 'en',
        formState.preferred_name,
        formState.birthday,
        formState.allergies,
        formState.bpjs_number,
        undefined,
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
        getCoreFormAccepted('commitment_statement'),
        getCoreFormAccepted('indemnity_agreement'),
        getCoreFormAccepted('media_consent'),
        formState.hijab_photo_preference,
        formState.signature,
        formState.signature_date
      );

      if (!createResult.success || !createResult.userId) {
        throw new Error('User creation failed.');
      }

      const submissions = requiredForms.map((form) => ({
        form_id: form.id,
        accepted: Boolean(formAcceptances[form.id]),
        signed_at: formState.signature_date || null,
      }));

      await saveUserFormSubmissionsAction(createResult.userId, submissions);
      router.push(`/admin/users/${createResult.userId}`);
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#443837]">Create User</h1>
          <p className="text-sm text-[#443837]/70 mt-1">Role-driven forms update live. File uploads are managed after user creation on the user detail page.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
          Back to Users
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={formState.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+62812345678" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={6} value={formState.password} onChange={(e) => setField('password', e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formState.role}
                onChange={(e) => setField('role', e.target.value as BusinessRole)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={formState.full_name} onChange={(e) => setField('full_name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input id="preferred_name" value={formState.preferred_name} onChange={(e) => setField('preferred_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input id="birthday" type="date" value={formState.birthday} onChange={(e) => setField('birthday', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bpjs_number">BPJS Number</Label>
              <Input id="bpjs_number" value={formState.bpjs_number} onChange={(e) => setField('bpjs_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" value={formState.allergies} onChange={(e) => setField('allergies', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formState.notes} onChange={(e) => setField('notes', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input id="emergency_contact_name" value={formState.emergency_contact_name} onChange={(e) => setField('emergency_contact_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input id="emergency_contact_phone" value={formState.emergency_contact_phone} onChange={(e) => setField('emergency_contact_phone', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {showParticipantFields && (
          <Card>
            <CardHeader>
              <CardTitle>Participant-Specific Fields</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shoe_size">Shoe Size</Label>
                <Input id="shoe_size" value={formState.shoe_size} onChange={(e) => setField('shoe_size', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clothing_size">Clothing Size</Label>
                <Input id="clothing_size" value={formState.clothing_size} onChange={(e) => setField('clothing_size', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" value={formState.age} onChange={(e) => setField('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input id="village" value={formState.village} onChange={(e) => setField('village', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_children">Number of Children</Label>
                <Input id="number_of_children" value={formState.number_of_children} onChange={(e) => setField('number_of_children', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_dietary_requirements">Medical Dietary Requirements</Label>
                <Input id="medical_dietary_requirements" value={formState.medical_dietary_requirements} onChange={(e) => setField('medical_dietary_requirements', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Required Forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRequirements ? (
              <p className="text-sm text-gray-500">Loading requirements...</p>
            ) : requiredForms.length === 0 ? (
              <p className="text-sm text-gray-500">No forms required for this role.</p>
            ) : (
              requiredForms.map((form) => (
                <div key={form.id} className="flex items-start space-x-3 rounded-md border p-3">
                  <Checkbox
                    id={`form-${form.id}`}
                    checked={Boolean(formAcceptances[form.id])}
                    onCheckedChange={(checked) => {
                      setFormAcceptances((prev) => ({ ...prev, [form.id]: Boolean(checked) }));
                    }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`form-${form.id}`} className="font-medium">
                      {form.label}
                    </Label>
                    <p className="text-xs text-gray-500">Category: {form.category.replaceAll('_', ' ')}</p>
                  </div>
                </div>
              ))
            )}

            {requiredForms.some((form) => form.id === 'hijab_photo_preference') && (
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
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <Input id="signature" value={formState.signature} onChange={(e) => setField('signature', e.target.value)} placeholder="Type full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature_date">Signature Date</Label>
                <Input id="signature_date" type="date" value={formState.signature_date} onChange={(e) => setField('signature_date', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={submitting} className="sm:w-auto">
            {submitting ? 'Creating...' : 'Create User'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
