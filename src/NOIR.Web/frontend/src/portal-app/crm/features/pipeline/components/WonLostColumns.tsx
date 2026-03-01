import { useTranslation } from 'react-i18next'
import { Trophy, XCircle } from 'lucide-react'
import { Card, CardContent } from '@uikit'
import type { LeadCardDto } from '@/types/crm'

interface WonLostColumnsProps {
  wonLeads: LeadCardDto[]
  lostLeads: LeadCardDto[]
  onLeadClick: (lead: LeadCardDto) => void
}

export const WonLostColumns = ({ wonLeads, lostLeads, onLeadClick }: WonLostColumnsProps) => {
  const { t } = useTranslation('common')

  const formatValue = (value: number, currency: string) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  const wonTotal = wonLeads.reduce((sum, l) => sum + l.value, 0)
  const lostTotal = lostLeads.reduce((sum, l) => sum + l.value, 0)

  return (
    <div className="flex gap-4 min-w-[500px]">
      {/* Won Column */}
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center justify-between p-3 rounded-t-lg border-t-[3px] border-t-green-500 bg-green-50/50 dark:bg-green-900/10">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">{t('crm.pipeline.won')}</h3>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {wonLeads.length}
            </span>
          </div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            {formatValue(wonTotal, wonLeads[0]?.currency || 'USD')}
          </span>
        </div>
        <div className="space-y-2 p-2 bg-green-50/30 dark:bg-green-900/5 rounded-b-lg min-h-[100px]">
          {wonLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-green-200/50 dark:border-green-800/30"
              onClick={() => onLeadClick(lead)}
            >
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-medium">{lead.title}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatValue(lead.value, lead.currency)}
                </p>
                <p className="text-xs text-muted-foreground">{lead.contactName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lost Column */}
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center justify-between p-3 rounded-t-lg border-t-[3px] border-t-red-500 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">{t('crm.pipeline.lost')}</h3>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {lostLeads.length}
            </span>
          </div>
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {formatValue(lostTotal, lostLeads[0]?.currency || 'USD')}
          </span>
        </div>
        <div className="space-y-2 p-2 bg-red-50/30 dark:bg-red-900/5 rounded-b-lg min-h-[100px]">
          {lostLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-red-200/50 dark:border-red-800/30"
              onClick={() => onLeadClick(lead)}
            >
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-medium">{lead.title}</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {formatValue(lead.value, lead.currency)}
                </p>
                <p className="text-xs text-muted-foreground">{lead.contactName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
