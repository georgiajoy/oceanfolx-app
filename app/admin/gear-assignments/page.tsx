'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, GearInventory, GearType, Participant, GearAssignment } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface GearInventoryWithType extends GearInventory {
  gear_types: GearType;
}

interface GearAssignmentWithDetails extends GearAssignment {
  participants: Participant;
  gear_inventory: GearInventoryWithType;
}

export default function GearAssignmentsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inventory, setInventory] = useState<GearInventoryWithType[]>([]);
  const [assignments, setAssignments] = useState<GearAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const t = useTranslation(language);

  const [newAssignment, setNewAssignment] = useState({
    participant_id: '',
    gear_inventory_id: '',
    notes: '',
  });

  const selectedParticipant = participants.find(p => p.id === newAssignment.participant_id);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const profile = await getUserProfile(user.id);
      if (profile) {
        setLanguage(profile.preferred_language);
      }

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*, user:users(full_name)');

      if (participantsError) throw participantsError;
      const mapped = (participantsData || []).map((p: any) => ({ ...p, full_name: p.user?.full_name || p.full_name || '' }));
      mapped.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
      setParticipants(mapped || []);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gear_inventory')
        .select('*, gear_types(*)')
        .gt('quantity_available', 0)
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gear_assignments')
        .select('*, participants(*, user:users(full_name)), gear_inventory(*, gear_types(*))')
        .order('assigned_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      const mappedAssignments = (assignmentsData || []).map((a: any) => ({
        ...a,
        participants: {
          ...a.participants,
          full_name: a.participants?.user?.full_name || a.participants?.full_name || '',
        },
      }));
      setAssignments(mappedAssignments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignGear() {
    if (!newAssignment.participant_id || !newAssignment.gear_inventory_id) {
      alert('Please select both participant and gear item');
      return;
    }

    try {
      const selectedInventory = inventory.find(i => i.id === newAssignment.gear_inventory_id);
      if (!selectedInventory || selectedInventory.quantity_available <= 0) {
        alert('This item is out of stock');
        return;
      }

      const { error: assignError } = await supabase
        .from('gear_assignments')
        .insert([{
          ...newAssignment,
          assigned_by_user_id: currentUserId,
        }]);

      if (assignError) throw assignError;

      const { error: updateError } = await supabase
        .from('gear_inventory')
        .update({
          quantity_available: selectedInventory.quantity_available - 1
        })
        .eq('id', newAssignment.gear_inventory_id);

      if (updateError) throw updateError;

      setNewAssignment({ participant_id: '', gear_inventory_id: '', notes: '' });
      setShowAssignDialog(false);
      loadData();
    } catch (error) {
      console.error('Error assigning gear:', error);
      alert('Failed to assign gear. Please try again.');
    }
  }

  async function handleRemoveAssignment(assignment: GearAssignmentWithDetails) {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('gear_assignments')
        .delete()
        .eq('id', assignment.id);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('gear_inventory')
        .update({
          quantity_available: assignment.gear_inventory.quantity_available + 1
        })
        .eq('id', assignment.gear_inventory_id);

      if (updateError) throw updateError;

      loadData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Failed to remove assignment. Please try again.');
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">Gear Assignments</h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#443837]/70">Assign gear to participants</p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Assign Gear</span>
              <span className="sm:hidden">Assign</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Gear to Participant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="participant">Participant</Label>
                <select
                  id="participant"
                  className="w-full border rounded-md p-2"
                  value={newAssignment.participant_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, participant_id: e.target.value })}
                >
                  <option value="">Select participant</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.full_name}
                    </option>
                  ))}
                </select>
                {selectedParticipant && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">Participant Sizes:</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Shoe Size:</span> {selectedParticipant.shoe_size || 'Not provided'}
                      </p>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Clothing Size:</span> {selectedParticipant.clothing_size || 'Not provided'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="gear">Gear Item</Label>
                <select
                  id="gear"
                  className="w-full border rounded-md p-2"
                  value={newAssignment.gear_inventory_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, gear_inventory_id: e.target.value })}
                >
                  <option value="">Select gear item</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.gear_types.name} ({item.gear_types.sponsor_name}) - Size {item.size} - Available: {item.quantity_available}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAssignment.notes}
                  onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                  placeholder="Optional notes about this assignment"
                />
              </div>
              <Button onClick={handleAssignGear} className="w-full">
                Assign Gear
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Gear Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Shoe Size</TableHead>
                <TableHead>Clothing Size</TableHead>
                <TableHead>Gear Type</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Assigned Size</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.participants.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{assignment.participants.shoe_size || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{assignment.participants.clothing_size || '-'}</Badge>
                  </TableCell>
                  <TableCell>{assignment.gear_inventory.gear_types.name}</TableCell>
                  <TableCell>{assignment.gear_inventory.gear_types.sponsor_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.gear_inventory.size}</Badge>
                  </TableCell>
                  <TableCell>{new Date(assignment.assigned_date).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs truncate">{assignment.notes || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
