interface StageColumnHeaderProps {
  name: string
  color: string
  totalValue: number
  leadCount: number
  currency?: string
}

export const StageColumnHeader = ({ name, color, totalValue, leadCount, currency = 'USD' }: StageColumnHeaderProps) => {
  const formattedValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(totalValue)

  return (
    <div className="flex items-center justify-between p-3 rounded-t-lg" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
          {leadCount}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{formattedValue}</span>
    </div>
  )
}
