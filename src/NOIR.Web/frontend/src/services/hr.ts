/**
 * HR API Service
 *
 * Provides methods for managing employees and departments.
 */
import { apiClient } from './apiClient'
import type {
  EmployeeDto,
  EmployeePagedResult,
  EmployeeSearchDto,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeStatus,
  DepartmentDto,
  DepartmentTreeNodeDto,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  ReorderDepartmentsRequest,
  GetEmployeesParams,
} from '@/types/hr'

// ─── Employee endpoints ────────────────────────────────────────────────────

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<EmployeePagedResult> => {
  const queryParams = new URLSearchParams()
  if (params.page != null) queryParams.append('page', params.page.toString())
  if (params.pageSize != null) queryParams.append('pageSize', params.pageSize.toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.status) queryParams.append('status', params.status)
  if (params.employmentType) queryParams.append('employmentType', params.employmentType)
  if (params.orderBy) queryParams.append('orderBy', params.orderBy)
  if (params.isDescending != null) queryParams.append('isDescending', params.isDescending.toString())

  const query = queryParams.toString()
  return apiClient<EmployeePagedResult>(`/hr/employees${query ? `?${query}` : ''}`)
}

export const getEmployeeById = async (id: string): Promise<EmployeeDto> => {
  return apiClient<EmployeeDto>(`/hr/employees/${id}`)
}

export const searchEmployees = async (query: string): Promise<EmployeeSearchDto[]> => {
  const queryParams = new URLSearchParams()
  queryParams.append('query', query)
  return apiClient<EmployeeSearchDto[]>(`/hr/employees/search?${queryParams}`)
}

export const createEmployee = async (request: CreateEmployeeRequest): Promise<EmployeeDto> => {
  return apiClient<EmployeeDto>('/hr/employees', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export const updateEmployee = async (id: string, request: UpdateEmployeeRequest): Promise<EmployeeDto> => {
  return apiClient<EmployeeDto>(`/hr/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export const deactivateEmployee = async (id: string, status: EmployeeStatus): Promise<void> => {
  await apiClient(`/hr/employees/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export const reactivateEmployee = async (id: string): Promise<void> => {
  await apiClient(`/hr/employees/${id}/reactivate`, {
    method: 'POST',
  })
}

export const linkEmployeeToUser = async (id: string, userId: string): Promise<void> => {
  await apiClient(`/hr/employees/${id}/link-user`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

// ─── Department endpoints ──────────────────────────────────────────────────

export const getDepartments = async (): Promise<DepartmentTreeNodeDto[]> => {
  return apiClient<DepartmentTreeNodeDto[]>('/hr/departments')
}

export const getDepartmentById = async (id: string): Promise<DepartmentDto> => {
  return apiClient<DepartmentDto>(`/hr/departments/${id}`)
}

export const createDepartment = async (request: CreateDepartmentRequest): Promise<DepartmentDto> => {
  return apiClient<DepartmentDto>('/hr/departments', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export const updateDepartment = async (id: string, request: UpdateDepartmentRequest): Promise<DepartmentDto> => {
  return apiClient<DepartmentDto>(`/hr/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export const deleteDepartment = async (id: string): Promise<void> => {
  await apiClient(`/hr/departments/${id}`, {
    method: 'DELETE',
  })
}

export const reorderDepartments = async (request: ReorderDepartmentsRequest): Promise<void> => {
  await apiClient('/hr/departments/reorder', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
