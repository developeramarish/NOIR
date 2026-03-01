import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePageContext } from '@/hooks/usePageContext'
import { useUrlDialog } from '@/hooks/useUrlDialog'
import { useUrlEditDialog } from '@/hooks/useUrlEditDialog'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@uikit'
import { useDepartmentsQuery, useDeleteDepartment } from '@/portal-app/hr/queries'
import type { DepartmentTreeNodeDto } from '@/types/hr'
import { getStatusBadgeClasses } from '@/utils/statusBadge'
import { DepartmentFormDialog } from '../../components/DepartmentFormDialog'

// Flatten tree for useUrlEditDialog
const flattenTree = (nodes: DepartmentTreeNodeDto[]): DepartmentTreeNodeDto[] =>
  nodes.flatMap(node => [node, ...flattenTree(node.children)])

interface DepartmentTreeNodeProps {
  node: DepartmentTreeNodeDto
  level: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, options?: any) => string
  onEdit: (node: DepartmentTreeNodeDto) => void
  onAddChild: (parentId: string) => void
  onDelete: (node: DepartmentTreeNodeDto) => void
}

const DepartmentTreeNode = ({ node, level, t, onEdit, onAddChild, onDelete }: DepartmentTreeNodeProps) => {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors rounded-lg group"
        style={{ paddingLeft: `${level * 24 + 16}px` }}
      >
        {/* Expand/Collapse */}
        <button
          type="button"
          className={`h-5 w-5 flex items-center justify-center cursor-pointer ${hasChildren ? '' : 'invisible'}`}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? t('labels.collapse', 'Collapse') : t('labels.expand', 'Expand')}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Department Icon */}
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>

        {/* Name and Code */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{node.name}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {node.code}
            </Badge>
            {!node.isActive && (
              <Badge variant="outline" className={getStatusBadgeClasses('gray')}>
                {t('labels.inactive', 'Inactive')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {node.managerName && <span>{t('hr.manager')}: {node.managerName}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t('hr.employeeCount', { count: node.employeeCount })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-pointer"
            aria-label={t('hr.editDepartment')}
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-pointer"
            aria-label={t('hr.addSubDepartment')}
            onClick={() => onAddChild(node.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive"
            aria-label={t('labels.delete', 'Delete')}
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 border-l-2 border-border/50"
            style={{ left: `${level * 24 + 28}px` }}
          />
          {node.children.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              t={t}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const DepartmentsPage = () => {
  const { t } = useTranslation('common')
  usePageContext('Departments')

  const { data: departments, isLoading: loading } = useDepartmentsQuery()
  const deleteMutation = useDeleteDepartment()

  const { isOpen: isCreateOpen, open: openCreate, onOpenChange: onCreateOpenChange } = useUrlDialog({ paramValue: 'create-department' })

  const flatDepartments = useMemo(() => departments ? flattenTree(departments) : [], [departments])
  const { editItem: departmentToEdit, openEdit: openEditDepartment, closeEdit: closeEditDepartment } = useUrlEditDialog<DepartmentTreeNodeDto>(flatDepartments)

  const [parentIdForCreate, setParentIdForCreate] = useState<string | null>(null)
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentTreeNodeDto | null>(null)

  const handleEdit = (node: DepartmentTreeNodeDto) => {
    openEditDepartment(node)
  }

  const handleAddChild = (parentId: string) => {
    setParentIdForCreate(parentId)
    openCreate()
  }

  const handleDeleteConfirm = async () => {
    if (!departmentToDelete) return
    try {
      await deleteMutation.mutateAsync(departmentToDelete.id)
      toast.success(t('hr.departmentDeleted', 'Department deleted'))
      setDepartmentToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.generic', 'An error occurred'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title={t('hr.departments')}
        description={t('hr.departmentsDescription', 'Manage your organization\'s department hierarchy')}
        responsive
        action={
          <Button className="group transition-all duration-300 cursor-pointer" onClick={() => { setParentIdForCreate(null); openCreate() }}>
            <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90 duration-300" />
            {t('hr.createDepartment')}
          </Button>
        }
      />

      <Card className="shadow-sm hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('hr.departmentHierarchy', 'Department Hierarchy')}</CardTitle>
          <CardDescription>
            {t('hr.departmentHierarchyDescription', 'View and manage your organizational structure')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : !departments || departments.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t('hr.noDepartmentsFound')}
              description={t('hr.noDepartmentsDescription')}
              action={{
                label: t('hr.createDepartment'),
                onClick: () => { setParentIdForCreate(null); openCreate() },
              }}
              className="border-0 rounded-none px-4 py-12"
            />
          ) : (
            <div className="divide-y divide-border/30">
              {departments.map((node) => (
                <DepartmentTreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  t={t}
                  onEdit={handleEdit}
                  onAddChild={handleAddChild}
                  onDelete={setDepartmentToDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Department Dialog */}
      <DepartmentFormDialog
        open={isCreateOpen || !!departmentToEdit}
        onOpenChange={(open) => {
          if (!open) {
            if (isCreateOpen) onCreateOpenChange(false)
            if (departmentToEdit) closeEditDepartment()
            setParentIdForCreate(null)
          }
        }}
        department={departmentToEdit}
        parentDepartmentId={!departmentToEdit ? parentIdForCreate : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Credenza open={!!departmentToDelete} onOpenChange={(open) => !open && setDepartmentToDelete(null)}>
        <CredenzaContent className="border-destructive/30">
          <CredenzaHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CredenzaTitle>{t('hr.deleteDepartmentTitle', 'Delete Department')}</CredenzaTitle>
                <CredenzaDescription>
                  {t('hr.deleteConfirmation')}
                </CredenzaDescription>
              </div>
            </div>
          </CredenzaHeader>
          <CredenzaBody />
          <CredenzaFooter>
            <Button
              variant="outline"
              onClick={() => setDepartmentToDelete(null)}
              disabled={deleteMutation.isPending}
              className="cursor-pointer"
            >
              {t('labels.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="cursor-pointer bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              {t('labels.delete', 'Delete')}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}

export default DepartmentsPage
