import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, Skeleton } from '@uikit'
import { Kanban } from 'lucide-react'
import type { PipelineViewDto, LeadCardDto, StageWithLeadsDto } from '@/types/crm'
import { useMoveLeadStage } from '@/portal-app/crm/queries'
import { LeadCard } from './LeadCard'
import { StageColumnHeader } from './StageColumnHeader'
import { WonLostColumns } from './WonLostColumns'

interface PipelineKanbanProps {
  pipelineView: PipelineViewDto | undefined
  isLoading: boolean
  showClosedDeals: boolean
  onLeadClick: (lead: LeadCardDto) => void
}

export const PipelineKanban = ({ pipelineView, isLoading, showClosedDeals, onLeadClick }: PipelineKanbanProps) => {
  const { t } = useTranslation('common')
  const moveLeadStageMutation = useMoveLeadStage()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const allLeads = pipelineView?.stages.flatMap(s => s.leads) ?? []
  const activeLead = activeId ? allLeads.find(l => l.id === activeId) : null

  const wonLeads = allLeads.filter(l => l.status === 'Won')
  const lostLeads = allLeads.filter(l => l.status === 'Lost')

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !pipelineView) return

    const leadId = String(active.id)
    const overId = String(over.id)

    // Find which stage the lead was dragged to
    let targetStage: StageWithLeadsDto | undefined

    for (const stage of pipelineView.stages) {
      // Check if dropped on a lead in this stage
      if (stage.leads.some(l => l.id === overId)) {
        targetStage = stage
        break
      }
      // Check if dropped on the stage container itself
      if (stage.id === overId) {
        targetStage = stage
        break
      }
    }

    if (!targetStage) return

    // Find original stage
    const originalStage = pipelineView.stages.find(s => s.leads.some(l => l.id === leadId))
    if (!originalStage) return

    // If same stage and same position, do nothing
    if (originalStage.id === targetStage.id && leadId === overId) return

    // Calculate new sort order
    const targetLeads = targetStage.leads.filter(l => l.id !== leadId)
    const overIndex = targetLeads.findIndex(l => l.id === overId)

    let newSortOrder: number
    if (targetLeads.length === 0) {
      newSortOrder = 1
    } else if (overIndex === -1) {
      // Dropped on stage container, put at end
      newSortOrder = targetLeads[targetLeads.length - 1].sortOrder + 1
    } else if (overIndex === 0) {
      newSortOrder = targetLeads[0].sortOrder / 2
    } else {
      newSortOrder = (targetLeads[overIndex - 1].sortOrder + targetLeads[overIndex].sortOrder) / 2
    }

    moveLeadStageMutation.mutate(
      { leadId, newStageId: targetStage.id, newSortOrder },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }, [pipelineView, moveLeadStageMutation, t])

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

  if (!pipelineView || pipelineView.stages.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        title={t('crm.pipeline.noPipelines')}
        description={t('crm.pipeline.noPipelinesDescription')}
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
        {pipelineView.stages.map((stage) => {
          const stageActiveLeads = stage.leads.filter(l => l.status === 'Active')
          const stageActiveValue = stageActiveLeads.reduce((sum, l) => sum + l.value, 0)

          return (
            <div key={stage.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
              <div className="bg-muted/30 rounded-lg border border-border/50">
                <StageColumnHeader
                  name={stage.name}
                  color={stage.color}
                  totalValue={stageActiveValue}
                  leadCount={stageActiveLeads.length}
                />
                <SortableContext
                  items={stageActiveLeads.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                  id={stage.id}
                >
                  <div className="space-y-2 p-2 min-h-[100px]" data-stage-id={stage.id}>
                    {stageActiveLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={onLeadClick}
                        isDraggable
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
          )
        })}

        {showClosedDeals && (wonLeads.length > 0 || lostLeads.length > 0) && (
          <WonLostColumns
            wonLeads={wonLeads}
            lostLeads={lostLeads}
            onLeadClick={onLeadClick}
          />
        )}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="w-[280px]">
            <LeadCard lead={activeLead} onClick={() => {}} isDraggable={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
