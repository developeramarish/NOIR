import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Button,
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uikit'
import { useCreateTask } from '@/portal-app/pm/queries'
import type { ProjectColumnDto, ProjectMemberDto } from '@/types/pm'

const createTaskSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z.object({
    title: z.string().min(1, t('validation.required')).max(500, t('validation.maxLength', { count: 500 })),
    description: z.string().max(5000, t('validation.maxLength', { count: 5000 })).optional().or(z.literal('')),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
    assigneeId: z.string().optional().or(z.literal('')),
    dueDate: z.string().optional().or(z.literal('')),
    estimatedHours: z.coerce.number().min(0).optional().or(z.literal(0)),
    columnId: z.string().optional().or(z.literal('')),
  })

type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  columns: ProjectColumnDto[]
  members: ProjectMemberDto[]
  defaultColumnId?: string
}

export const TaskDialog = ({ open, onOpenChange, projectId, columns, members, defaultColumnId }: TaskDialogProps) => {
  const { t } = useTranslation('common')
  const createMutation = useCreateTask()

  const form = useForm<TaskFormData>({
    resolver: zodResolver(createTaskSchema(t)) as unknown as Resolver<TaskFormData>,
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: '',
      priority: 'Medium',
      assigneeId: '',
      dueDate: '',
      estimatedHours: 0,
      columnId: defaultColumnId ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        priority: 'Medium',
        assigneeId: '',
        dueDate: '',
        estimatedHours: 0,
        columnId: defaultColumnId ?? columns[0]?.id ?? '',
      })
    }
  }, [open, form, defaultColumnId, columns])

  const onSubmit = async (data: TaskFormData) => {
    createMutation.mutate(
      {
        projectId,
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        dueDate: data.dueDate || undefined,
        estimatedHours: data.estimatedHours || undefined,
        columnId: data.columnId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('pm.createTask'))
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      },
    )
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>{t('pm.createTask')}</CredenzaTitle>
          <CredenzaDescription>{t('pm.createTask')}</CredenzaDescription>
        </CredenzaHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CredenzaBody className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pm.taskTitle')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('pm.taskTitle')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pm.taskDescription')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('pm.taskDescription')} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.priority')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low" className="cursor-pointer">{t('priorities.low')}</SelectItem>
                          <SelectItem value="Medium" className="cursor-pointer">{t('priorities.medium')}</SelectItem>
                          <SelectItem value="High" className="cursor-pointer">{t('priorities.high')}</SelectItem>
                          <SelectItem value="Urgent" className="cursor-pointer">{t('priorities.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="columnId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.columns')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id} className="cursor-pointer">
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.assignee')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t('pm.assignee')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.employeeId} value={member.employeeId} className="cursor-pointer">
                              {member.employeeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.dueDate')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pm.estimatedHours')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step={0.5} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CredenzaBody>
            <CredenzaFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                {t('buttons.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="cursor-pointer">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('buttons.create')}
              </Button>
            </CredenzaFooter>
          </form>
        </Form>
      </CredenzaContent>
    </Credenza>
  )
}
