'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { User, InstitutionMember, InstitutionRole } from '@/types/database'

type MemberWithUser = InstitutionMember & {
  user: User
}

type MembersResponse = {
  members: MemberWithUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InstitutionRole>('student')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Edit role dialog state
  const [editingMember, setEditingMember] = useState<MemberWithUser | null>(null)
  const [newRole, setNewRole] = useState<InstitutionRole>('student')
  const [savingRole, setSavingRole] = useState(false)

  // Remove dialog state
  const [removingMember, setRemovingMember] = useState<MemberWithUser | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    })

    if (roleFilter !== 'all') {
      params.set('role', roleFilter)
    }

    const response = await fetch(`/api/admin/users?${params}`)

    if (response.status === 403) {
      router.push('/dashboard')
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to load users')
      setLoading(false)
      return
    }

    const data: MembersResponse = await response.json()
    setMembers(data.members)
    setPagination(data.pagination)
    setLoading(false)
  }, [pagination.page, pagination.limit, roleFilter, router])

  useEffect(() => {
    // Check if user is admin
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: membership } = await supabase
        .from('institution_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (!membership) {
        router.push('/dashboard')
        return
      }

      loadMembers()
    }

    checkAdmin()
  }, [router, loadMembers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setInviting(true)

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setInviteError(data.error || 'Failed to add user')
      if (data.suggestion) {
        setInviteError(`${data.error} ${data.suggestion}`)
      }
    } else {
      setInviteSuccess('User added successfully')
      setInviteEmail('')
      setInviteRole('student')
      loadMembers()
    }

    setInviting(false)
  }

  async function handleRoleChange() {
    if (!editingMember) return

    setSavingRole(true)

    const response = await fetch(`/api/admin/users/${editingMember.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    if (response.ok) {
      setMembers(prev =>
        prev.map(m =>
          m.id === editingMember.id ? { ...m, role: newRole } : m
        )
      )
      setEditingMember(null)
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to update role')
    }

    setSavingRole(false)
  }

  async function handleRemove() {
    if (!removingMember) return

    setRemoving(true)

    const response = await fetch(`/api/admin/users/${removingMember.user_id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setMembers(prev => prev.filter(m => m.id !== removingMember.id))
      setRemovingMember(null)
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to remove user')
    }

    setRemoving(false)
  }

  function openEditDialog(member: MemberWithUser) {
    setEditingMember(member)
    setNewRole(member.role as InstitutionRole)
  }

  const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    admin: 'default',
    teacher: 'secondary',
    ta: 'outline',
    student: 'outline',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage users in your institution
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Add User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
          <CardDescription>
            Add an existing user to your institution by their email address.
            The user must have already signed up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                required
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as InstitutionRole)}
                disabled={inviting}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="ta">TA</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Adding...' : 'Add User'}
            </Button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-destructive">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">{inviteSuccess}</p>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label htmlFor="filter">Filter by role:</Label>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          <SelectTrigger id="filter" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="ta">TA</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Institution Members</CardTitle>
          <CardDescription>
            {pagination.total} total members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.user?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleColors[member.role] || 'outline'}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                        >
                          Change Role
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemovingMember(member)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingMember?.user?.full_name || editingMember?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newRole">New Role</Label>
            <Select
              value={newRole}
              onValueChange={(value) => setNewRole(value as InstitutionRole)}
            >
              <SelectTrigger id="newRole" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="ta">TA</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={savingRole}>
              {savingRole ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removingMember?.user?.full_name || removingMember?.user?.email} from the institution?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? 'Removing...' : 'Remove User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
