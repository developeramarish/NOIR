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
import { useCreateProject, useUpdateProject } from '@/portal-app/pm/queries'
import type { ProjectDto, ProjectVisibility } from '@/types/pm'

const createProjectSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z.object({
    name: z.string().min(1, t('validation.required')).max(200, t('validation.maxLength', { count: 200 })),
    description: z.string().max(2000, t('validation.maxLength', { count: 2000 })).optional().or(z.literal('')),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    dueDate: z.string().optional().or(z.literal('')),
    budget: z.coerce.number().min(0).optional().or(z.literal(0)),
    currency: z.string().max(3).optional().or(z.literal('')),
    color: z.string().optional().or(z.literal('')),
    visibility: z.enum(['Private', 'Internal', 'Public']).default('Private'),
  })

type ProjectFormData = z.infer<ReturnType<typeof createProjectSchema>>

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectDto | null
}

export const ProjectDialog = ({ open, onOpenChange, project }: ProjectDialogProps) => {
  const { t } = useTranslation('common')
  const isEdit = !!project
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(createProjectSchema(t)) as unknown as Resolver<ProjectFormData>,
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      dueDate: '',
      budget: 0,
      currency: '',
      color: '',
      visibility: 'Private' as ProjectVisibility,
    },
  })

  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          description: project.description ?? '',
          startDate: project.startDate?.split('T')[0] ?? '',
          endDate: project.endDate?.split('T')[0] ?? '',
          dueDate: project.dueDate?.split('T')[0] ?? '',
          budget: project.budget ?? 0,
          currency: project.currency ?? '',
          color: project.color ?? '',
          visibility: project.visibility,
        })
      } else {
        form.reset({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          dueDate: '',
          budget: 0,
          currency: '',
          color: '',
          visibility: 'Private',
        })
      }
    }
  }, [open, project, form])

  const onSubmit = async (data: ProjectFormData) => {
    const request = {
      name: data.name,
      description: data.description || undefined,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      dueDate: data.dueDate || undefined,
      budget: data.budget || undefined,
      currency: data.currency || undefined,
      color: data.color || undefined,
      visibility: data.visibility,
    }

    if (isEdit && project) {
      updateMutation.mutate(
        { id: project.id, request },
        {
          onSuccess: () => {
            toast.success(t('pm.editProject'))
            onOpenChange(false)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : t('errors.unknown'))
          },
        },
      )
    } else {
      createMutation.mutate(request, {
        onSuccess: () => {
          toast.success(t('pm.createProject'))
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('errors.unknown'))
        },
      })
    }
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>{isEdit ? t('pm.editProject') : t('pm.createProject')}</CredenzaTitle>
          <CredenzaDescription>
            {isEdit ? t('pm.editProject') : t('pm.createProject')}
          </CredenzaDescription>
        </CredenzaHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CredenzaBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pm.projectName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('pm.projectName')} />
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
                    <FormLabel>{t('pm.projectDescription')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('pm.projectDescription')} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.startDate')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.budget')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.currency')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="USD" maxLength={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.color')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" className="h-10 cursor-pointer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pm.visibility')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Private" className="cursor-pointer">{t('pm.visibilityPrivate', { defaultValue: 'Private' })}</SelectItem>
                          <SelectItem value="Internal" className="cursor-pointer">{t('pm.visibilityInternal', { defaultValue: 'Internal' })}</SelectItem>
                          <SelectItem value="Public" className="cursor-pointer">{t('pm.visibilityPublic', { defaultValue: 'Public' })}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CredenzaBody>
            <CredenzaFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                {t('buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? t('buttons.save') : t('buttons.create')}
              </Button>
            </CredenzaFooter>
          </form>
        </Form>
      </CredenzaContent>
    </Credenza>
  )
}
