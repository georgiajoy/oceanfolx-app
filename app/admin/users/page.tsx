'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { deleteUserAction } from './actions';
import { supabase, Language, UserProfile, UserRole } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRoleLabel } from './role-utils';

export default function UsersManagementPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [participantIdByUserId, setParticipantIdByUserId] = useState<Record<string, string>>({});
  const t = useTranslation(language);

  useEffect(() => {
    loadLanguage();
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
    } catch (loadError) {
      console.error('Error loading language:', loadError);
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

      let usersWithResolvedRoles = (usersData || []) as UserProfile[];
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role_id, is_active')
        .eq('is_active', true);

      if (userRolesData) {
        const roleByUserId = new Map<string, UserRole>();
        userRolesData.forEach((row: any) => {
          if (row?.user_id && row?.role_id) {
            roleByUserId.set(row.user_id, row.role_id as UserRole);
          }
        });

        usersWithResolvedRoles = usersWithResolvedRoles.map((user) => ({
          ...user,
          role: roleByUserId.get(user.id) || user.role,
        }));
      }

      setUsers(usersWithResolvedRoles);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('id, user_id');

      const map: Record<string, string> = {};
      (participantsData || []).forEach((participant: any) => {
        if (participant?.user_id && participant?.id) {
          map[participant.user_id] = participant.id;
        }
      });
      setParticipantIdByUserId(map);
    } catch (loadError) {
      console.error('Error loading users:', loadError);
      setError('Failed to load users');
    } finally {
      setLoading(false);
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
      setSuccessMessage('User deleted successfully');
      await loadUsers();
    } catch (deleteError: any) {
      setError(deleteError.message || 'Failed to delete user');
    }
  }

  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.phone?.toLowerCase().includes(searchTermLower) ||
      user.full_name?.toLowerCase().includes(searchTermLower) ||
      user.role.toLowerCase().includes(searchTermLower)
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
            <p className="text-xs sm:text-sm text-[#443837]/70 mt-1">All users are managed through dedicated detail pages</p>
          </div>
          <Button onClick={() => router.push('/admin/users/new')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </Button>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by phone, name, or role..."
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {t('no_data')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || '—'}</TableCell>
                        <TableCell className="font-medium">{user.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.preferred_language.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const participantId = participantIdByUserId[user.id];
                              if (participantId) {
                                router.push(`/admin/participants/${participantId}`);
                                return;
                              }
                              router.push(`/admin/users/${user.id}`);
                            }}
                            className="text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                          >
                            <Info className="h-4 w-4" />
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
                                  Are you sure you want to delete this user ({user.phone})? This action cannot be undone.
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
                    ))
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
