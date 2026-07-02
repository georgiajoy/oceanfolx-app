'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, SessionStaffAttendance } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, UserCheck, UserPlus, Users } from 'lucide-react';

export interface StaffAttendanceWithUser extends SessionStaffAttendance {
  user?: {
    full_name?: string | null;
  };
}

interface StaffCandidate {
  user_id: string;
  role_id: string;
  user?: {
    full_name?: string | null;
  };
}

interface StaffAttendanceSectionProps {
  sessionId: string;
  currentUserId: string;
  staffAttendance: StaffAttendanceWithUser[];
  onUpdated: () => Promise<void> | void;
}

function getStatusBadge(status: string) {
  if (status === 'present') {
    return <Badge className="bg-green-100 text-green-800">Present</Badge>;
  }

  return <Badge variant="secondary">Signed Up</Badge>;
}

export function StaffAttendanceSection({ sessionId, currentUserId, staffAttendance, onUpdated }: StaffAttendanceSectionProps) {
  const [saving, setSaving] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [eligibleStaff, setEligibleStaff] = useState<StaffCandidate[]>([]);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState('');
  const myEntry = staffAttendance.find((entry) => entry.user_id === currentUserId);

  useEffect(() => {
    loadEligibleStaff();
  }, [currentUserId, staffAttendance]);

  async function loadEligibleStaff() {
    try {
      setLoadingCandidates(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role_id, user:users(full_name)')
        .eq('is_active', true)
        .in('role_id', [
          'admin',
          'intern',
          'local_leader',
          'remote_foreign_staff',
          'in_person_facilitator',
          'non_program_foreign_staff',
          'in_person_foreign_staff',
          'remote_volunteer',
        ])
        .order('role_id');

      if (error) throw error;

      const activeStaff = (data || []) as StaffCandidate[];
      const filteredStaff = activeStaff
        .filter((staff) => staff.user_id !== currentUserId)
        .filter((staff) => !staffAttendance.some((entry) => entry.user_id === staff.user_id));

      setEligibleStaff(filteredStaff);
      setSelectedStaffUserId((current) => {
        if (current && filteredStaff.some((staff) => staff.user_id === current)) {
          return current;
        }

        return filteredStaff[0]?.user_id || '';
      });
    } catch (error) {
      console.error('Error loading eligible staff:', error);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function upsertMyStaffAttendance(status: 'signed_up' | 'present') {
    if (!currentUserId) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const { error } = await supabase.from('session_staff_attendance').upsert(
        {
          session_id: sessionId,
          user_id: currentUserId,
          status,
          signed_up_at: myEntry?.signed_up_at || now,
          marked_at: status === 'present' ? now : myEntry?.marked_at || null,
        },
        { onConflict: 'session_id,user_id' }
      );

      if (error) throw error;
      await Promise.resolve(onUpdated());
    } catch (error) {
      console.error('Error updating staff attendance:', error);
    } finally {
      setSaving(false);
    }
  }

  async function addSelectedStaffMember() {
    if (!selectedStaffUserId) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const { error } = await supabase.from('session_staff_attendance').insert({
        session_id: sessionId,
        user_id: selectedStaffUserId,
        status: 'signed_up',
        signed_up_at: now,
      });

      if (error) throw error;

      setSelectedStaffUserId('');
      await Promise.resolve(onUpdated());
      await loadEligibleStaff();
    } catch (error) {
      console.error('Error adding staff member:', error);
    } finally {
      setSaving(false);
    }
  }

  const selectedStaffLabel = useMemo(() => {
    const selectedStaff = eligibleStaff.find((staff) => staff.user_id === selectedStaffUserId);
    return selectedStaff?.user?.full_name || 'Select staff member';
  }, [eligibleStaff, selectedStaffUserId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Staff Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            size="sm"
            variant="outline"
            disabled={saving || Boolean(myEntry)}
            onClick={() => upsertMyStaffAttendance('signed_up')}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Me as Staff
          </Button>
          <Button
            size="sm"
            disabled={saving || myEntry?.status === 'present'}
            onClick={() => upsertMyStaffAttendance('present')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark Myself Present
          </Button>
          {myEntry && getStatusBadge(myEntry.status)}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
          <div className="flex-1">
            <Select value={selectedStaffUserId} onValueChange={setSelectedStaffUserId} disabled={loadingCandidates}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCandidates ? 'Loading staff...' : 'Add another staff member'}>
                  {selectedStaffLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {eligibleStaff.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No eligible staff available
                  </SelectItem>
                ) : (
                  eligibleStaff.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.user?.full_name || 'Unnamed staff'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || loadingCandidates || !selectedStaffUserId}
            onClick={addSelectedStaffMember}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Staff Member
          </Button>
        </div>

        {staffAttendance.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No staff have added themselves to this lesson yet.
          </div>
        ) : (
          <div className="space-y-3">
            {staffAttendance.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">{entry.user?.full_name || 'Unnamed staff'}</div>
                    <div className="text-xs text-gray-500">
                      {entry.user_id === currentUserId ? 'You' : 'Staff member'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">{getStatusBadge(entry.status)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}