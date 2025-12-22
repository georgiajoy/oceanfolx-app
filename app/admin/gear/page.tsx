'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, GearType, GearInventory } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface GearInventoryWithType extends GearInventory {
  gear_types: GearType;
}

export default function AdminGearManagement() {
  const [language, setLanguage] = useState<Language>('en');
  const [gearTypes, setGearTypes] = useState<GearType[]>([]);
  const [inventory, setInventory] = useState<GearInventoryWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [editingInventory, setEditingInventory] = useState<GearInventoryWithType | null>(null);
  const t = useTranslation(language);

  const [newType, setNewType] = useState({
    name: '',
    sponsor_name: '',
    description: '',
  });

  const [newInventory, setNewInventory] = useState({
    gear_type_id: '',
    size: '',
    quantity_total: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const profile = await getUserProfile(user.id);
      if (profile) {
        setLanguage(profile.preferred_language);
      }

      const { data: typesData, error: typesError } = await supabase
        .from('gear_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;
      setGearTypes(typesData || []);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gear_inventory')
        .select('*, gear_types(*)')
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGearType() {
    try {
      const { error } = await supabase
        .from('gear_types')
        .insert([newType]);

      if (error) throw error;

      setNewType({ name: '', sponsor_name: '', description: '' });
      setShowTypeDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding gear type:', error);
    }
  }

  async function handleAddInventory() {
    try {
      const { error } = await supabase
        .from('gear_inventory')
        .insert([{
          ...newInventory,
          quantity_available: newInventory.quantity_total,
        }]);

      if (error) throw error;

      setNewInventory({ gear_type_id: '', size: '', quantity_total: 0, notes: '' });
      setShowInventoryDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding inventory:', error);
    }
  }

  async function handleUpdateInventory() {
    if (!editingInventory) return;

    try {
      const { error } = await supabase
        .from('gear_inventory')
        .update({
          quantity_total: editingInventory.quantity_total,
          quantity_available: editingInventory.quantity_available,
          notes: editingInventory.notes,
        })
        .eq('id', editingInventory.id);

      if (error) throw error;

      setEditingInventory(null);
      loadData();
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#443837]">Gear Management</h2>
          <p className="mt-2 text-sm text-[#443837]/70">Manage gear inventory and types</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Gear Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Gear Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Gear Name</Label>
                  <Input
                    id="name"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="e.g., Rashguard, Swim Cap"
                  />
                </div>
                <div>
                  <Label htmlFor="sponsor">Sponsor Name</Label>
                  <Input
                    id="sponsor"
                    value={newType.sponsor_name}
                    onChange={(e) => setNewType({ ...newType, sponsor_name: e.target.value })}
                    placeholder="e.g., RipCurl"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <Button onClick={handleAddGearType} className="w-full">
                  Add Gear Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Add Inventory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="gear_type">Gear Type</Label>
                  <select
                    id="gear_type"
                    className="w-full border rounded-md p-2"
                    value={newInventory.gear_type_id}
                    onChange={(e) => setNewInventory({ ...newInventory, gear_type_id: e.target.value })}
                  >
                    <option value="">Select gear type</option>
                    {gearTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.sponsor_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={newInventory.size}
                    onChange={(e) => setNewInventory({ ...newInventory, size: e.target.value })}
                    placeholder="e.g., S, M, L, XL, 6, 7"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newInventory.quantity_total}
                    onChange={(e) => setNewInventory({ ...newInventory, quantity_total: parseInt(e.target.value) || 0 })}
                    placeholder="Total quantity received"
                  />
                </div>
                <div>
                  <Label htmlFor="inv_notes">Notes</Label>
                  <Textarea
                    id="inv_notes"
                    value={newInventory.notes}
                    onChange={(e) => setNewInventory({ ...newInventory, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
                <Button onClick={handleAddInventory} className="w-full">
                  Add Inventory
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear Type</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const assigned = item.quantity_total - item.quantity_available;
                const percentAvailable = (item.quantity_available / item.quantity_total) * 100;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.gear_types.name}</TableCell>
                    <TableCell>{item.gear_types.sponsor_name}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.quantity_total}</TableCell>
                    <TableCell>{item.quantity_available}</TableCell>
                    <TableCell>{assigned}</TableCell>
                    <TableCell>
                      {percentAvailable > 50 ? (
                        <Badge variant="default" className="bg-green-500">In Stock</Badge>
                      ) : percentAvailable > 20 ? (
                        <Badge variant="default" className="bg-yellow-500">Low Stock</Badge>
                      ) : percentAvailable > 0 ? (
                        <Badge variant="default" className="bg-orange-500">Very Low</Badge>
                      ) : (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingInventory(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingInventory && (
        <Dialog open={!!editingInventory} onOpenChange={() => setEditingInventory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Gear Type</Label>
                <p className="text-sm text-gray-600">
                  {editingInventory.gear_types.name} - Size {editingInventory.size}
                </p>
              </div>
              <div>
                <Label htmlFor="edit_total">Total Quantity</Label>
                <Input
                  id="edit_total"
                  type="number"
                  value={editingInventory.quantity_total}
                  onChange={(e) => setEditingInventory({
                    ...editingInventory,
                    quantity_total: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit_available">Available Quantity</Label>
                <Input
                  id="edit_available"
                  type="number"
                  value={editingInventory.quantity_available}
                  onChange={(e) => setEditingInventory({
                    ...editingInventory,
                    quantity_available: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editingInventory.notes}
                  onChange={(e) => setEditingInventory({
                    ...editingInventory,
                    notes: e.target.value
                  })}
                />
              </div>
              <Button onClick={handleUpdateInventory} className="w-full">
                Update Inventory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
