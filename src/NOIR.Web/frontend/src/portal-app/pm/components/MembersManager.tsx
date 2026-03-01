import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { UserPlus, Trash2, Loader2 } from 'lucide-react'
import {
  Button,
  Badge,
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@uikit'
import { getStatusBadgeClasses } from '@/utils/statusBadge'
import { useAddMember, useRemoveMember, useChangeMemberRole } from '@/portal-app/pm/queries'
import type { ProjectMemberDto, ProjectMemberRole } from '@/types/pm'

const roleColorMap: Record<ProjectMemberRole, 'purple' | 'blue' | 'green' | 'gray'> = {
  Owner: 'purple',
  Manager: 'blue',
  Member: 'green',
  Viewer: 'gray',
}

interface MembersManagerProps {
  projectId: string
  members: ProjectMemberDto[]
}

export const MembersManager = ({ projectId, members }: MembersManagerProps) => {
  const { t } = useTranslation('common')
  const addMemberMutation = useAddMember()
  const removeMemberMutation = useRemoveMember()
  const changeMemberRoleMutation = useChangeMemberRole()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newRole, setNewRole] = useState<ProjectMemberRole>('Member')
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleAddMember = () => {
    if (!newEmployeeId.trim()) return
    addMemberMutation.mutate(
      { projectId, request: { employeeId: newEmployeeId, role: newRole } },
      {
        onSuccess: () => {
          toast.success(t('pm.addMember'))
          setAddDialogOpen(false)
          setNewEmployeeId('')
          setNewRole('Member')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(
      { projectId, memberId },
      {
        onSuccess: () => {
          toast.success(t('pm.removeMember'))
          setConfirmRemoveId(null)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }

  const handleRoleChange = (memberId: string, role: ProjectMemberRole) => {
    changeMemberRoleMutation.mutate(
      { projectId, memberId, role },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('pm.members')}</h3>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => setAddDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('pm.addMember')}
        </Button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {member.employeeName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{member.employeeName}</p>
                <Badge variant="outline" className={getStatusBadgeClasses(roleColorMap[member.role])}>
                  {t(`memberRoles.${member.role.toLowerCase()}`)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.role !== 'Owner' && (
                <>
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value as ProjectMemberRole)}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs cursor-pointer" aria-label={`${t('pm.memberRole')} - ${member.employeeName}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager" className="cursor-pointer">{t('memberRoles.manager')}</SelectItem>
                      <SelectItem value="Member" className="cursor-pointer">{t('memberRoles.member')}</SelectItem>
                      <SelectItem value="Viewer" className="cursor-pointer">{t('memberRoles.viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 cursor-pointer"
                    onClick={() => setConfirmRemoveId(member.id)}
                    aria-label={`${t('pm.removeMember')} ${member.employeeName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add member dialog */}
      <Credenza open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>{t('pm.addMember')}</CredenzaTitle>
            <CredenzaDescription>{t('pm.addMember')}</CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('pm.assignee')}</label>
              <Input
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                placeholder={t('pm.assignee')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('pm.memberRole')}</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as ProjectMemberRole)}>
                <SelectTrigger className="mt-1 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manager" className="cursor-pointer">{t('memberRoles.manager')}</SelectItem>
                  <SelectItem value="Member" className="cursor-pointer">{t('memberRoles.member')}</SelectItem>
                  <SelectItem value="Viewer" className="cursor-pointer">{t('memberRoles.viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CredenzaBody>
          <CredenzaFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="cursor-pointer">{t('buttons.cancel')}</Button>
            <Button onClick={handleAddMember} disabled={addMemberMutation.isPending} className="cursor-pointer">
              {addMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pm.addMember')}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>

      {/* Remove confirmation dialog */}
      <Credenza open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <CredenzaContent className="border-destructive/30">
          <CredenzaHeader>
            <CredenzaTitle>{t('pm.removeMember')}</CredenzaTitle>
            <CredenzaDescription>{t('pm.removeMember')}</CredenzaDescription>
          </CredenzaHeader>
          <CredenzaFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveId(null)} className="cursor-pointer">{t('buttons.cancel')}</Button>
            <Button
              variant="destructive"
              className="cursor-pointer bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => confirmRemoveId && handleRemoveMember(confirmRemoveId)}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pm.removeMember')}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}
