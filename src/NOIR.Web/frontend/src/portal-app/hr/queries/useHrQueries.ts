import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  getEmployees,
  getEmployeeById,
  searchEmployees,
  getDepartments,
  getDepartmentById,
} from '@/services/hr'
import type { GetEmployeesParams } from '@/types/hr'
import { employeeKeys, departmentKeys } from './queryKeys'

export const useEmployeesQuery = (params: GetEmployeesParams) =>
  useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => getEmployees(params),
    placeholderData: keepPreviousData,
  })

export const useEmployeeQuery = (id: string | undefined) =>
  useQuery({
    queryKey: employeeKeys.detail(id!),
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
  })

export const useEmployeeSearchQuery = (query: string) =>
  useQuery({
    queryKey: employeeKeys.search(query),
    queryFn: () => searchEmployees(query),
    enabled: query.length >= 2,
  })

export const useDepartmentsQuery = () =>
  useQuery({
    queryKey: departmentKeys.list(),
    queryFn: () => getDepartments(),
  })

export const useDepartmentQuery = (id: string | undefined) =>
  useQuery({
    queryKey: departmentKeys.detail(id!),
    queryFn: () => getDepartmentById(id!),
    enabled: !!id,
  })
