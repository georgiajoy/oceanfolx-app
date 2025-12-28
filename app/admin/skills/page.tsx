'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase, Language, Level, Skill } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SkillWithLevel extends Skill {
  level?: Level;
}

export default function SkillsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [levels, setLevels] = useState<Level[]>([]);
  const [skills, setSkills] = useState<SkillWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false);
  const [isEditLevelDialogOpen, setIsEditLevelDialogOpen] = useState(false);
  const [isEditSkillDialogOpen, setIsEditSkillDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editingSkill, setEditingSkill] = useState<SkillWithLevel | null>(null);
  const [error, setError] = useState('');
  const [levelFormData, setLevelFormData] = useState({
    name_en: '',
    name_id: '',
    description_en: '',
    description_id: '',
    order_number: 1,
  });
  const [skillFormData, setSkillFormData] = useState({
    level_id: '',
    name_en: '',
    name_id: '',
    description_en: '',
    description_id: '',
    order_number: 1,
  });
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
    loadData();
  }, []);

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

  async function loadData() {
    try {
      setLoading(true);
      const [levelsResult, skillsResult] = await Promise.all([
        supabase.from('levels').select('*').order('order_number'),
        supabase.from('skills').select('*, level:levels(*)').order('order_number'),
      ]);

      if (levelsResult.error) throw levelsResult.error;
      if (skillsResult.error) throw skillsResult.error;

      setLevels(levelsResult.data || []);
      setSkills(skillsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLevel(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('levels')
        .insert(levelFormData);

      if (insertError) throw insertError;

      setLevelFormData({
        name_en: '',
        name_id: '',
        description_en: '',
        description_id: '',
        order_number: levels.length + 1,
      });
      setIsLevelDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create level');
    }
  }

  async function handleCreateSkill(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('skills')
        .insert(skillFormData);

      if (insertError) throw insertError;

      setSkillFormData({
        level_id: '',
        name_en: '',
        name_id: '',
        description_en: '',
        description_id: '',
        order_number: 1,
      });
      setIsSkillDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create skill');
    }
  }

  function handleEditLevelClick(level: Level) {
    setEditingLevel(level);
    setIsEditLevelDialogOpen(true);
  }

  async function handleUpdateLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLevel) return;
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('levels')
        .update({
          name_en: editingLevel.name_en,
          name_id: editingLevel.name_id,
          description_en: editingLevel.description_en,
          description_id: editingLevel.description_id,
          order_number: editingLevel.order_number,
        })
        .eq('id', editingLevel.id);

      if (updateError) throw updateError;

      setIsEditLevelDialogOpen(false);
      setEditingLevel(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update level');
    }
  }

  async function handleDeleteLevel(levelId: string) {
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('levels')
        .delete()
        .eq('id', levelId);

      if (deleteError) throw deleteError;

      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete level');
    }
  }

  function handleEditSkillClick(skill: SkillWithLevel) {
    setEditingSkill(skill);
    setIsEditSkillDialogOpen(true);
  }

  async function handleUpdateSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSkill) return;
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('skills')
        .update({
          level_id: editingSkill.level_id,
          name_en: editingSkill.name_en,
          name_id: editingSkill.name_id,
          description_en: editingSkill.description_en,
          description_id: editingSkill.description_id,
          order_number: editingSkill.order_number,
        })
        .eq('id', editingSkill.id);

      if (updateError) throw updateError;

      setIsEditSkillDialogOpen(false);
      setEditingSkill(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update skill');
    }
  }

  async function handleDeleteSkill(skillId: string) {
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (deleteError) throw deleteError;

      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete skill');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#443837]">{t('manage_skills')}</h2>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_level')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('add_level')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateLevel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_en">Name (English)</Label>
                    <Input
                      id="name_en"
                      value={levelFormData.name_en}
                      onChange={(e) => setLevelFormData({ ...levelFormData, name_en: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_id">Name (Indonesian)</Label>
                    <Input
                      id="name_id"
                      value={levelFormData.name_id}
                      onChange={(e) => setLevelFormData({ ...levelFormData, name_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_en">Description (English)</Label>
                    <Textarea
                      id="description_en"
                      value={levelFormData.description_en}
                      onChange={(e) => setLevelFormData({ ...levelFormData, description_en: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_id">Description (Indonesian)</Label>
                    <Textarea
                      id="description_id"
                      value={levelFormData.description_id}
                      onChange={(e) => setLevelFormData({ ...levelFormData, description_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order_number">Order</Label>
                    <Input
                      id="order_number"
                      type="number"
                      min="1"
                      value={levelFormData.order_number}
                      onChange={(e) => setLevelFormData({ ...levelFormData, order_number: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">{t('create')}</Button>
                    <Button type="button" variant="outline" onClick={() => setIsLevelDialogOpen(false)}>
                      {t('cancel')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>English Name</TableHead>
                        <TableHead>Indonesian Name</TableHead>
                        <TableHead>English Description</TableHead>
                        <TableHead>Indonesian Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {levels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {t('no_data')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      levels.map((level) => (
                        <TableRow key={level.id}>
                          <TableCell>{level.order_number}</TableCell>
                          <TableCell className="font-medium">{level.name_en}</TableCell>
                          <TableCell className="font-medium">{level.name_id}</TableCell>
                          <TableCell className="text-sm text-gray-600">{level.description_en}</TableCell>
                          <TableCell className="text-sm text-gray-600">{level.description_id}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditLevelClick(level)}
                              >
                                <Pencil className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('edit')}</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('delete')}</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Level?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this level? This will also affect all associated skills.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLevel(level.id)}>
                                      {t('delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={levels.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_skill')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('add_skill')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSkill} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="level_id">Level</Label>
                    <select
                      id="level_id"
                      value={skillFormData.level_id}
                      onChange={(e) => setSkillFormData({ ...skillFormData, level_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="">Select a level</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name_en} / {level.name_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_name_en">Name (English)</Label>
                    <Input
                      id="skill_name_en"
                      value={skillFormData.name_en}
                      onChange={(e) => setSkillFormData({ ...skillFormData, name_en: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_name_id">Name (Indonesian)</Label>
                    <Input
                      id="skill_name_id"
                      value={skillFormData.name_id}
                      onChange={(e) => setSkillFormData({ ...skillFormData, name_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_description_en">Description (English)</Label>
                    <Textarea
                      id="skill_description_en"
                      value={skillFormData.description_en}
                      onChange={(e) => setSkillFormData({ ...skillFormData, description_en: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_description_id">Description (Indonesian)</Label>
                    <Textarea
                      id="skill_description_id"
                      value={skillFormData.description_id}
                      onChange={(e) => setSkillFormData({ ...skillFormData, description_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill_order_number">Order</Label>
                    <Input
                      id="skill_order_number"
                      type="number"
                      min="1"
                      value={skillFormData.order_number}
                      onChange={(e) => setSkillFormData({ ...skillFormData, order_number: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">{t('create')}</Button>
                    <Button type="button" variant="outline" onClick={() => setIsSkillDialogOpen(false)}>
                      {t('cancel')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>English Name</TableHead>
                        <TableHead>Indonesian Name</TableHead>
                        <TableHead>English Description</TableHead>
                        <TableHead>Indonesian Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {skills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {t('no_data')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      skills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="font-medium">
                            {skill.level?.name_en || '-'}
                          </TableCell>
                          <TableCell>{skill.order_number}</TableCell>
                          <TableCell className="font-medium">{skill.name_en}</TableCell>
                          <TableCell className="font-medium">{skill.name_id}</TableCell>
                          <TableCell className="text-sm text-gray-600">{skill.description_en}</TableCell>
                          <TableCell className="text-sm text-gray-600">{skill.description_id}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSkillClick(skill)}
                              >
                                <Pencil className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('edit')}</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('delete')}</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Skill?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this skill? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSkill(skill.id)}>
                                      {t('delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Level Dialog */}
      <Dialog open={isEditLevelDialogOpen} onOpenChange={setIsEditLevelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit')} Level</DialogTitle>
          </DialogHeader>
          {editingLevel && (
            <form onSubmit={handleUpdateLevel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name_en">Name (English)</Label>
                <Input
                  id="edit-name_en"
                  value={editingLevel.name_en}
                  onChange={(e) => setEditingLevel({ ...editingLevel, name_en: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name_id">Name (Indonesian)</Label>
                <Input
                  id="edit-name_id"
                  value={editingLevel.name_id}
                  onChange={(e) => setEditingLevel({ ...editingLevel, name_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description_en">Description (English)</Label>
                <Textarea
                  id="edit-description_en"
                  value={editingLevel.description_en}
                  onChange={(e) => setEditingLevel({ ...editingLevel, description_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description_id">Description (Indonesian)</Label>
                <Textarea
                  id="edit-description_id"
                  value={editingLevel.description_id}
                  onChange={(e) => setEditingLevel({ ...editingLevel, description_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order_number">Order</Label>
                <Input
                  id="edit-order_number"
                  type="number"
                  min="1"
                  value={editingLevel.order_number}
                  onChange={(e) => setEditingLevel({ ...editingLevel, order_number: parseInt(e.target.value) })}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{t('update')}</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditLevelDialogOpen(false);
                    setEditingLevel(null);
                    setError('');
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={isEditSkillDialogOpen} onOpenChange={setIsEditSkillDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit')} Skill</DialogTitle>
          </DialogHeader>
          {editingSkill && (
            <form onSubmit={handleUpdateSkill} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-level_id">Level</Label>
                <select
                  id="edit-level_id"
                  value={editingSkill.level_id}
                  onChange={(e) => setEditingSkill({ ...editingSkill, level_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select a level</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name_en} / {level.name_id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill_name_en">Name (English)</Label>
                <Input
                  id="edit-skill_name_en"
                  value={editingSkill.name_en}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name_en: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill_name_id">Name (Indonesian)</Label>
                <Input
                  id="edit-skill_name_id"
                  value={editingSkill.name_id}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill_description_en">Description (English)</Label>
                <Textarea
                  id="edit-skill_description_en"
                  value={editingSkill.description_en}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill_description_id">Description (Indonesian)</Label>
                <Textarea
                  id="edit-skill_description_id"
                  value={editingSkill.description_id}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill_order_number">Order</Label>
                <Input
                  id="edit-skill_order_number"
                  type="number"
                  min="1"
                  value={editingSkill.order_number}
                  onChange={(e) => setEditingSkill({ ...editingSkill, order_number: parseInt(e.target.value) })}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{t('update')}</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditSkillDialogOpen(false);
                    setEditingSkill(null);
                    setError('');
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
