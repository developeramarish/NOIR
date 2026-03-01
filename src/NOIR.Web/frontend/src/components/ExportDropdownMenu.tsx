/**
 * Reusable Export Dropdown Menu component.
 * Provides CSV and Excel export options with loading state.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@uikit'
import { toast } from 'sonner'

export interface ExportDropdownMenuProps {
  onExport: (format: 'CSV' | 'Excel') => Promise<void>
  disabled?: boolean
}

export const ExportDropdownMenu = ({ onExport, disabled }: ExportDropdownMenuProps) => {
  const { t } = useTranslation('common')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'CSV' | 'Excel') => {
    setIsExporting(true)
    try {
      await onExport(format)
      toast.success(t('buttons.exportSuccess', 'Export completed'))
    } catch {
      toast.error(t('buttons.exportFailed', 'Export failed'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting} className="cursor-pointer">
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          {t('buttons.export', 'Export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('CSV')} className="cursor-pointer">
          {t('reports.exportCsv', 'Export as CSV')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('Excel')} className="cursor-pointer">
          {t('reports.exportExcel', 'Export as Excel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
