import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageSquare, User, CheckSquare } from 'lucide-react'
import { Badge, Card, CardContent } from '@uikit'
import { getStatusBadgeClasses } from '@/utils/statusBadge'
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext'
import type { TaskCardDto, TaskPriority } from '@/types/pm'

const priorityColorMap: Record<TaskPriority, 'gray' | 'blue' | 'orange' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}

interface TaskCardProps {
  task: TaskCardDto
  onClick: (task: TaskCardDto) => void
  isDraggable?: boolean
}

export const TaskCard = ({ task, onClick, isDraggable = true }: TaskCardProps) => {
  const { formatDate } = useRegionalSettings()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
    >
      <Card
        className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-border/50"
        onClick={() => onClick(task)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-block h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-medium line-clamp-2">{task.title}</p>

          {/* Task number + Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{task.taskNumber}</span>
            <Badge variant="outline" className={getStatusBadgeClasses(priorityColorMap[task.priority])}>
              {task.priority}
            </Badge>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.assigneeName && (
              <div className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{task.assigneeName}</span>
              </div>
            )}
            {task.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>

          {/* Bottom row: subtasks + comments */}
          {(task.subtaskCount > 0 || task.commentCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {task.subtaskCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>{task.completedSubtaskCount}/{task.subtaskCount}</span>
                </div>
              )}
              {task.commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{task.commentCount}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
