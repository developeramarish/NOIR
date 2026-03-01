import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { Plus, Kanban } from 'lucide-react'
import { Button, EmptyState, Skeleton } from '@uikit'
import { useKanbanBoardQuery, useMoveTask } from '@/portal-app/pm/queries'
import type { TaskCardDto, KanbanColumnDto } from '@/types/pm'
import { TaskCard } from './TaskCard'

interface KanbanBoardProps {
  projectId: string
  onCreateTask?: (columnId: string) => void
}

export const KanbanBoard = ({ projectId, onCreateTask }: KanbanBoardProps) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: board, isLoading } = useKanbanBoardQuery(projectId)
  const moveTaskMutation = useMoveTask()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const allTasks = board?.columns.flatMap(c => c.tasks) ?? []
  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null

  const handleTaskClick = useCallback((task: TaskCardDto) => {
    navigate(`/portal/tasks/${task.id}`)
  }, [navigate])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !board) return

    const taskId = String(active.id)
    const overId = String(over.id)

    // Find target column
    let targetColumn: KanbanColumnDto | undefined

    for (const column of board.columns) {
      if (column.tasks.some(t => t.id === overId)) {
        targetColumn = column
        break
      }
      if (column.id === overId) {
        targetColumn = column
        break
      }
    }

    if (!targetColumn) return

    // Find original column
    const originalColumn = board.columns.find(c => c.tasks.some(t => t.id === taskId))
    if (!originalColumn) return

    // Same column + same position = no-op
    if (originalColumn.id === targetColumn.id && taskId === overId) return

    // Calculate new sort order using float-based positioning
    const targetTasks = targetColumn.tasks.filter(t => t.id !== taskId)
    const overIndex = targetTasks.findIndex(t => t.id === overId)

    let newSortOrder: number
    if (targetTasks.length === 0) {
      newSortOrder = 1
    } else if (overIndex === -1) {
      newSortOrder = targetTasks[targetTasks.length - 1].sortOrder + 1
    } else if (overIndex === 0) {
      newSortOrder = targetTasks[0].sortOrder / 2
    } else {
      newSortOrder = (targetTasks[overIndex - 1].sortOrder + targetTasks[overIndex].sortOrder) / 2
    }

    moveTaskMutation.mutate(
      { id: taskId, request: { columnId: targetColumn.id, sortOrder: newSortOrder } },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }, [board, moveTaskMutation, t])

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[280px] space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (!board || board.columns.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        title={t('pm.noTasksFound')}
        description={t('pm.createTask')}
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => {
          const wipExceeded = column.wipLimit != null && column.tasks.length > column.wipLimit

          return (
            <div key={column.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
              <div className="bg-muted/30 rounded-lg border border-border/50">
                {/* Column header */}
                <div className="flex items-center justify-between p-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    {column.color && (
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
                    )}
                    <h3 className="text-sm font-semibold">{column.name}</h3>
                    <span className={`text-xs ${wipExceeded ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                      {column.tasks.length}
                      {column.wipLimit != null && `/${column.wipLimit}`}
                    </span>
                  </div>
                  {onCreateTask && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      onClick={() => onCreateTask(column.id)}
                      aria-label={`${t('pm.createTask')} - ${column.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Tasks */}
                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={column.id}
                >
                  <div className="space-y-2 p-2 min-h-[100px]" data-column-id={column.id}>
                    {column.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={handleTaskClick}
                        isDraggable
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[280px]">
            <TaskCard task={activeTask} onClick={() => {}} isDraggable={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
