import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getProjects, getProjectById } from '@/services/pm'
import type { GetProjectsParams } from '@/types/pm'
import { pmProjectKeys } from './queryKeys'

export const useProjectsQuery = (params: GetProjectsParams) =>
  useQuery({
    queryKey: pmProjectKeys.list(params),
    queryFn: () => getProjects(params),
    placeholderData: keepPreviousData,
  })

export const useProjectQuery = (id: string | undefined) =>
  useQuery({
    queryKey: pmProjectKeys.detail(id!),
    queryFn: () => getProjectById(id!),
    enabled: !!id,
  })
