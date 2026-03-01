/**
 * CustomerImportExport Component
 *
 * Provides CSV import/export and Excel export functionality for customers.
 * Follows the ProductImportExport pattern.
 */
import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
  ScrollArea,
} from '@uikit'

import { exportCustomers, bulkImportCustomers, type ImportCustomerDto } from '@/services/customers'
import { parseCSV, downloadCsv } from '@/lib/csv'
import { toast } from 'sonner'

export interface CustomerImportExportProps {
  totalCount?: number
  onImportComplete?: () => void
}

interface ImportResult {
  success: number
  errors: { row: number; message: string }[]
}

const REQUIRED_HEADERS = ['email', 'firstname', 'lastname']

const TEMPLATE_HEADERS = 'email,firstName,lastName,phone,tags'
const TEMPLATE_ROWS = [
  'john@example.com,John,Doe,+84123456789,"vip,newsletter"',
  'jane@example.com,Jane,Smith,,returning',
].join('\n')

export const CustomerImportExport = ({
  totalCount,
  onImportComplete,
}: CustomerImportExportProps) => {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Export customers as CSV
  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      await exportCustomers({ format: 'CSV' })
      toast.success(t('customers.export.success', 'Customers exported successfully'))
    } catch {
      toast.error(t('customers.export.failed', 'Failed to export customers'))
    } finally {
      setIsExporting(false)
    }
  }

  // Export customers as Excel
  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await exportCustomers({ format: 'Excel' })
      toast.success(t('customers.export.success', 'Customers exported successfully'))
    } catch {
      toast.error(t('customers.export.failed', 'Failed to export customers'))
    } finally {
      setIsExporting(false)
    }
  }

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = [TEMPLATE_HEADERS, TEMPLATE_ROWS].join('\n')
    downloadCsv(csvContent, 'customers-import-template.csv')
    toast.success(t('customers.import.templateDownloaded', 'Template downloaded'))
  }

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  // Parse and import CSV file
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input
    event.target.value = ''

    setIsImporting(true)
    setImportProgress(0)
    setImportResult(null)
    setShowImportDialog(true)

    try {
      const text = await file.text()
      const { headers, rows } = parseCSV(text)

      if (rows.length === 0) {
        throw new Error(t('customers.import.invalidFile', 'CSV file must have at least a header row and one data row'))
      }

      // Validate required fields
      const lowerHeaders = headers.map(h => h.toLowerCase())
      const missingFields = REQUIRED_HEADERS.filter(f => !lowerHeaders.includes(f))
      if (missingFields.length > 0) {
        throw new Error(t('customers.import.missingFields', { fields: missingFields.join(', '), defaultValue: `Missing required fields: ${missingFields.join(', ')}` }))
      }

      // Map column indexes
      const columnMap = new Map<string, number>()
      lowerHeaders.forEach((h, i) => columnMap.set(h, i))

      // Convert rows to ImportCustomerDto
      const customers: ImportCustomerDto[] = rows.map(row => {
        const getValue = (field: string): string | undefined => {
          const index = columnMap.get(field.toLowerCase())
          return index !== undefined ? row[index]?.trim() || undefined : undefined
        }

        return {
          email: getValue('email') || '',
          firstName: getValue('firstname') || '',
          lastName: getValue('lastname') || '',
          phone: getValue('phone'),
          tags: getValue('tags'),
        }
      })

      setImportProgress(50)

      // Call the API to import customers
      const result = await bulkImportCustomers(customers)

      setImportProgress(100)
      setImportResult({
        success: result.success,
        errors: result.errors,
      })

      if (result.success > 0) {
        toast.success(t('customers.import.success', { count: result.success, defaultValue: `${result.success} customers imported` }))
        onImportComplete?.()
      }

      if (result.errors.length > 0) {
        toast.warning(t('customers.import.failed', 'Failed to import customers'))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('customers.import.failed', 'Failed to import customers')
      toast.error(message)
      setShowImportDialog(false)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t('customers.importExport', 'Import/Export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t('reports.exportCsv', 'Export as CSV')}
            {totalCount != null && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {totalCount}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            {t('reports.exportExcel', 'Export as Excel')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleFileSelect}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('customers.import.button', 'Import CSV')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleDownloadTemplate}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-muted-foreground" />
            {t('customers.import.downloadTemplate', 'Download Template')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Import Progress Dialog */}
      <Credenza open={showImportDialog} onOpenChange={setShowImportDialog}>
        <CredenzaContent className="sm:max-w-[500px]">
          <CredenzaHeader>
            <CredenzaTitle>
              {isImporting
                ? t('customers.import.importing', 'Importing Customers...')
                : t('customers.import.complete', 'Import Complete')}
            </CredenzaTitle>
            <CredenzaDescription>
              {isImporting
                ? t('customers.import.pleaseWait', 'Please wait while we process your file.')
                : t('customers.import.summary', 'Here is a summary of the import.')}
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody>
            <div className="space-y-4">
              {isImporting ? (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {importProgress}%
                  </p>
                </div>
              ) : importResult ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 flex-1">
                      <Check className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-600">
                          {importResult.success}
                        </p>
                        <p className="text-xs text-emerald-600/80">
                          {t('customers.import.successLabel', 'Imported')}
                        </p>
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 flex-1">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-medium text-destructive">
                            {importResult.errors.length}
                          </p>
                          <p className="text-xs text-destructive/80">
                            {t('customers.import.errorsLabel', 'Errors')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t('customers.import.errorDetails', 'Error Details:')}
                      </p>
                      <ScrollArea className="h-[150px] rounded-md border p-2">
                        {importResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className="text-sm py-1 border-b last:border-0"
                          >
                            <span className="text-muted-foreground">
                              Row {error.row}:
                            </span>{' '}
                            <span className="text-destructive">{error.message}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </CredenzaBody>

          <CredenzaFooter>
            <Button
              onClick={() => setShowImportDialog(false)}
              disabled={isImporting}
              className="cursor-pointer"
            >
              {isImporting ? t('buttons.cancel', 'Cancel') : t('buttons.close', 'Close')}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  )
}
