import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePost, deleteCategory, deleteTag, reorderBlogCategories, bulkPublishPosts, bulkUnpublishPosts, bulkDeletePosts } from '@/services/blog'
import type { ReorderBlogCategoriesRequest } from '@/services/blog'
import { blogPostKeys, blogCategoryKeys, blogTagKeys } from './queryKeys'
import { optimisticListDelete, optimisticArrayDelete } from '@/hooks/useOptimisticMutation'

export const useDeleteBlogPostMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    ...optimisticListDelete(queryClient, blogPostKeys.lists(), blogPostKeys.all),
  })
}

export const useDeleteBlogCategoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    ...optimisticArrayDelete(queryClient, blogCategoryKeys.lists(), blogCategoryKeys.all),
  })
}

export const useReorderBlogCategoriesMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ReorderBlogCategoriesRequest) => reorderBlogCategories(request),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: blogCategoryKeys.all })
    },
  })
}

export const useDeleteBlogTagMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    ...optimisticArrayDelete(queryClient, blogTagKeys.lists(), blogTagKeys.all),
  })
}

export const useBulkPublishPosts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkPublishPosts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.all })
    },
  })
}

export const useBulkUnpublishPosts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkUnpublishPosts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.all })
    },
  })
}

export const useBulkDeletePosts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeletePosts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.all })
    },
  })
}
