import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  reorderDepartments,
} from '@/services/hr'
import type {
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeStatus,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  ReorderDepartmentsRequest,
} from '@/types/hr'
import { employeeKeys, departmentKeys } from './queryKeys'

export const useCreateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateEmployeeRequest) => createEmployee(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateEmployeeRequest }) => updateEmployee(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export const useDeactivateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EmployeeStatus }) => deactivateEmployee(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export const useReactivateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export const useCreateDepartment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateDepartmentRequest) => createDepartment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateDepartmentRequest }) => updateDepartment(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}

export const useReorderDepartments = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ReorderDepartmentsRequest) => reorderDepartments(request),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}
