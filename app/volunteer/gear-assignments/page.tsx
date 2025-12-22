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
import { Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface GearInventoryWithType extends GearInventory {
  gear_types: GearType;
}

interface GearAssignmentWithDetails extends GearAssignment {
  participants: Participant;
  gear_inventory: GearInventoryWithType;
}

export default function VolunteerGearAssignmentsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inventory, setInventory] = useState<GearInventoryWithType[]>([]);
  const [assignments, setAssignments] = useState<GearAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
        .select('*')
        .order('full_name');

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gear_inventory')
        .select('*, gear_types(*)')
        .gt('quantity_available', 0)
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gear_assignments')
        .select('*, participants(*), gear_inventory(*, gear_types(*))')
        .order('assigned_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
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

  const filteredAssignments = assignments.filter(assignment =>
    assignment.participants.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.gear_inventory.gear_types.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#443837]">Gear Assignments</h2>
          <p className="mt-2 text-sm text-[#443837]/70">View and assign gear to participants</p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Assign Gear
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Participants with Gear</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(assignments.map(a => a.participant_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {inventory.reduce((sum, item) => sum + item.quantity_available, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Gear Assignments</CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Search by participant name or gear type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No assignments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
