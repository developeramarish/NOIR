import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ListTodo } from 'lucide-react'
import {
  Badge,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uikit'
import { getStatusBadgeClasses } from '@/utils/statusBadge'
import { useKanbanBoardQuery } from '@/portal-app/pm/queries'
import type { ProjectTaskStatus, TaskPriority } from '@/types/pm'

const statusColorMap: Record<ProjectTaskStatus, 'blue' | 'purple' | 'green' | 'gray'> = {
  Todo: 'gray',
  InProgress: 'blue',
  InReview: 'purple',
  Done: 'green',
  Cancelled: 'gray',
}

const priorityColorMap: Record<TaskPriority, 'gray' | 'blue' | 'orange' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}

/** Convert PascalCase status to camelCase i18n key */
const toStatusKey = (status: string) =>
  `${status.charAt(0).toLowerCase()}${status.slice(1)}`

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

interface TaskListViewProps {
  projectId: string
}

export const TaskListView = ({ projectId }: TaskListViewProps) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: board, isLoading } = useKanbanBoardQuery(projectId)

  const tasks = useMemo(
    () => board?.columns.flatMap((c) => c.tasks) ?? [],
    [board],
  )

  const handleRowClick = useCallback(
    (taskId: string) => {
      navigate(`/portal/tasks/${taskId}`)
    },
    [navigate],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title={t('pm.noTasksFound')}
        description={t('pm.createTask')}
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('pm.taskNumber')}</TableHead>
          <TableHead>{t('pm.taskTitle')}</TableHead>
          <TableHead>{t('pm.status')}</TableHead>
          <TableHead>{t('pm.priority')}</TableHead>
          <TableHead>{t('pm.assignee')}</TableHead>
          <TableHead>{t('pm.dueDate')}</TableHead>
          <TableHead>{t('pm.labels')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow
            key={task.id}
            className="cursor-pointer"
            onClick={() => handleRowClick(task.id)}
          >
            <TableCell className="font-mono text-xs text-muted-foreground">
              {task.taskNumber}
            </TableCell>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>
              <Badge variant="outline" className={getStatusBadgeClasses(statusColorMap[task.status])}>
                {t(`statuses.${toStatusKey(task.status)}`, { defaultValue: task.status })}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={getStatusBadgeClasses(priorityColorMap[task.priority])}>
                {t(`priorities.${task.priority.toLowerCase()}`, { defaultValue: task.priority })}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {task.assigneeName ?? '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(task.dueDate)}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {task.labels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
                    style={{
                      backgroundColor: `${label.color}20`,
                      borderColor: `${label.color}40`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
