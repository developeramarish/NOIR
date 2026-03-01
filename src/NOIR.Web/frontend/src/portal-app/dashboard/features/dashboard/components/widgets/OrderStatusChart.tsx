import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton } from '@uikit'
import type { OrderCounts } from '@/services/dashboard'

interface OrderStatusChartProps {
  orderCounts: OrderCounts
  isLoading: boolean
}

const STATUS_CHART_COLORS: Record<string, string> = {
  pending: 'hsl(var(--chart-1))',
  confirmed: 'hsl(var(--chart-2))',
  processing: 'hsl(var(--chart-3))',
  shipped: 'hsl(var(--chart-4))',
  delivered: 'hsl(var(--chart-5))',
  completed: 'hsl(var(--chart-1))',
  cancelled: 'hsl(var(--chart-2))',
  refunded: 'hsl(var(--chart-3))',
  returned: 'hsl(var(--chart-4))',
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--card-foreground))',
}

export const OrderStatusChart = ({ orderCounts, isLoading }: OrderStatusChartProps) => {
  const { t } = useTranslation('common')

  const chartData = useMemo(() =>
    Object.entries(orderCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        status: t(`orders.status.${status}`, status),
        count,
        key: status,
      })),
    [orderCounts, t]
  )

  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.orderStatusDistribution')}</CardTitle>
        <CardDescription>{t('dashboard.orderStatusDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title={t('dashboard.noOrderData')}
            description={t('dashboard.noOrderDataDesc')}
            className="border-0 rounded-none px-4 py-12"
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <RechartsTooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => [Number(value ?? 0).toLocaleString(), t('dashboard.orders')]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_CHART_COLORS[entry.key] ?? 'hsl(var(--chart-1))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
