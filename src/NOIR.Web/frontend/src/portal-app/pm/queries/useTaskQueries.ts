import { useQuery } from '@tanstack/react-query'
import { getKanbanBoard, getTaskById } from '@/services/pm'
import { pmBoardKeys, pmTaskKeys } from './queryKeys'

export const useKanbanBoardQuery = (projectId: string | undefined) =>
  useQuery({
    queryKey: pmBoardKeys.board(projectId!),
    queryFn: () => getKanbanBoard(projectId!),
    enabled: !!projectId,
  })

export const useTaskQuery = (taskId: string | undefined) =>
  useQuery({
    queryKey: pmTaskKeys.detail(taskId!),
    queryFn: () => getTaskById(taskId!),
    enabled: !!taskId,
  })
