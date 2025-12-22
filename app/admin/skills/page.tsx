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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#443837]">{t('manage_skills')}</h2>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>English Name</TableHead>
                      <TableHead>Indonesian Name</TableHead>
                      <TableHead>English Description</TableHead>
                      <TableHead>Indonesian Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>English Name</TableHead>
                      <TableHead>Indonesian Name</TableHead>
                      <TableHead>English Description</TableHead>
                      <TableHead>Indonesian Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
