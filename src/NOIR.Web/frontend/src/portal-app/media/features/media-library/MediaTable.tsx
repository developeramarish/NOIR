import { useTranslation } from 'react-i18next'
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilePreviewTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uikit'
import type { MediaFileListItem } from '@/types'
import { formatFileSize, extractFolderName } from './media-utils'

interface MediaTableProps {
  items: MediaFileListItem[]
  selectedIds: Set<string>
  isAllSelected: boolean
  onSelectAll: () => void
  onSelectNone: () => void
  onToggleSelect: (id: string) => void
  onOpenDetail: (item: MediaFileListItem) => void
  onRename: (item: MediaFileListItem) => void
  onDelete: (item: MediaFileListItem) => void
}

export const MediaTable = ({
  items,
  selectedIds,
  isAllSelected,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onOpenDetail,
  onRename,
  onDelete,
}: MediaTableProps) => {
  const { t } = useTranslation('common')

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] sticky left-0 z-10 bg-background" />
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => {
                  if (checked) onSelectAll()
                  else onSelectNone()
                }}
                aria-label={t('labels.selectAll', 'Select all')}
                className="cursor-pointer"
              />
            </TableHead>
            <TableHead className="w-[60px]">{t('labels.preview', 'Preview')}</TableHead>
            <TableHead className="font-semibold">{t('labels.name', 'Name')}</TableHead>
            <TableHead className="font-semibold">{t('media.folder', 'Folder')}</TableHead>
            <TableHead className="font-semibold">{t('media.type', 'Type')}</TableHead>
            <TableHead className="text-right font-semibold">{t('media.size', 'Size')}</TableHead>
            <TableHead className="font-semibold">{t('labels.uploaded', 'Uploaded')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={`group transition-all duration-200 hover:bg-muted/30 cursor-pointer ${
                selectedIds.has(item.id) ? 'bg-primary/5' : ''
              }`}
              onClick={() => onOpenDetail(item)}
            >
              <TableCell className="sticky left-0 z-10 bg-background" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8 w-8 p-0 transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                      aria-label={t('labels.actionsFor', { name: item.originalFileName, defaultValue: `Actions for ${item.originalFileName}` })}
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => onRename(item)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('media.rename', 'Rename')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('labels.delete', 'Delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => onToggleSelect(item.id)}
                  aria-label={t('labels.selectItem', { name: item.originalFileName, defaultValue: `Select ${item.originalFileName}` })}
                  className="cursor-pointer"
                />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <FilePreviewTrigger
                  file={{
                    url: item.defaultUrl,
                    name: item.originalFileName,
                  }}
                  thumbnailWidth={40}
                  thumbnailHeight={40}
                  className="rounded-lg"
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate max-w-[300px] group-hover:text-primary transition-colors duration-200">
                    {item.originalFileName}
                  </span>
                  {item.width > 0 && item.height > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {item.width} x {item.height}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{item.folder ? extractFolderName(item.folder) : '\u2014'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm uppercase">{item.format}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm">{formatFileSize(item.sizeBytes)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
