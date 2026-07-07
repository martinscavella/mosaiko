import { useMemo, useState } from 'react';
import { Tooltip, ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers/format';
import { chartTooltipStyle, chartAxisTick, chartColors } from '@/lib/chartTheme';

interface Transaction {
  transaction_date: Date | string;
  current_amount: number;
  account_name?: string;
  asset_id?: string | null;
}

interface Account {
  name: string;
  initial_balance: number;
  current_balance: number;
}

interface Asset {
  value: number;
  created_at: Date | string;
}

interface TotalBalanceChartProps {
  data: {
    transactions: Transaction[];
    accounts: Account[];
    assets: Asset[];
  } | null;
  className?: string;
}

interface BalancePoint {
  date: string; // YYYY-MM-DD
  balance: number;
}

type Range = '1M' | '3M' | '6M' | '1A' | 'Tutto';

const RANGES: { id: Range; months: number | null }[] = [
  { id: '1M', months: 1 },
  { id: '3M', months: 3 },
  { id: '6M', months: 6 },
  { id: '1A', months: 12 },
  { id: 'Tutto', months: null },
];

// Utility per validare una data
const isValidDate = (date: Date | string | null | undefined): date is string => {
  if (!date || typeof date !== 'string' || date.length < 8) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

// Storia giornaliera del saldo: un punto per giorno con transazioni (ultimo valore del giorno)
const computeDailyBalanceHistory = (
  transactions: Transaction[],
  accounts: Account[]
): BalancePoint[] => {
  const validTransactions = transactions
    .filter(t => isValidDate(t.transaction_date))
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
    .map(t => ({
      ...t,
      // Transazioni asset non influenzano il saldo (solo cambio di forma del capitale)
      current_amount: t.asset_id ? 0 : Number(t.current_amount || 0)
    }));

  if (validTransactions.length === 0) return [];

  const initialBalance = accounts.reduce((sum, account) => sum + (account.initial_balance || 0), 0);

  const history: BalancePoint[] = [];
  let currentBalance = initialBalance;

  for (const transaction of validTransactions) {
    currentBalance += transaction.current_amount;
    const day = (transaction.transaction_date as string).slice(0, 10);
    const last = history[history.length - 1];
    if (last && last.date === day) {
      last.balance = currentBalance;
    } else {
      history.push({ date: day, balance: currentBalance });
    }
  }

  return history;
};

// Riduce a un punto per mese (ultimo saldo del mese) per i periodi lunghi
const groupByMonth = (history: BalancePoint[]): BalancePoint[] => {
  const grouped: BalancePoint[] = [];
  for (const point of history) {
    const monthKey = point.date.slice(0, 7) + '-01';
    const last = grouped[grouped.length - 1];
    if (last && last.date === monthKey) {
      last.balance = point.balance;
    } else {
      grouped.push({ date: monthKey, balance: point.balance });
    }
  }
  return grouped;
};

const compactCurrency = (value: number) =>
  Math.abs(value) >= 1000
    ? `€${(value / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`
    : `€${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;

export default function TotalBalanceChart({ data, className = '' }: TotalBalanceChartProps) {
  const [range, setRange] = useState<Range>('1A');

  const dailyHistory = useMemo(() => {
    if (!data?.transactions?.length || !data?.accounts) return [];
    return computeDailyBalanceHistory(data.transactions, data.accounts);
  }, [data?.transactions, data?.accounts]);

  const chartData = useMemo(() => {
    if (!dailyHistory.length) return [];
    const months = RANGES.find(r => r.id === range)?.months ?? null;
    if (months === null) return groupByMonth(dailyHistory);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    // Punto di partenza: ultimo saldo noto prima del periodo, così la curva non parte da zero
    const before = dailyHistory.filter(p => p.date < cutoffKey);
    const inRange = dailyHistory.filter(p => p.date >= cutoffKey);
    const points = before.length
      ? [{ date: cutoffKey, balance: before[before.length - 1].balance }, ...inRange]
      : inRange;

    return months >= 6 ? groupByMonth(points) : points;
  }, [dailyHistory, range]);

  const periodDelta = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].balance;
    const last = chartData[chartData.length - 1].balance;
    const diff = last - first;
    const pct = first !== 0 ? (diff / Math.abs(first)) * 100 : null;
    return { diff, pct, last };
  }, [chartData]);

  const formatLabel = (value: string) =>
    new Date(value).toLocaleDateString('it-IT', range === '1M' || range === '3M'
      ? { day: 'numeric', month: 'short' }
      : { month: 'short', year: '2-digit' });

  return (
    <div className={`bg-surface border border-edge shadow-card rounded-lg p-5 flex flex-col h-full min-h-[320px] ${className}`}>
      {/* Header: titolo, valore attuale + delta periodo, selettore range */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Patrimonio</h3>
            {periodDelta ? (
              <p className="text-sm">
                <span className="font-amount font-semibold text-ink">{formatCurrency(periodDelta.last)}</span>{' '}
                <span className={clsx(
                  'font-amount',
                  periodDelta.diff >= 0 ? 'text-success-strong' : 'text-danger'
                )}>
                  {periodDelta.diff >= 0 ? '+' : ''}{formatCurrency(periodDelta.diff)}
                  {periodDelta.pct !== null && ` (${periodDelta.pct >= 0 ? '+' : ''}${periodDelta.pct.toFixed(1)}%)`}
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">Andamento del tuo patrimonio</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-inset rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                range === r.id
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-muted hover:text-ink-secondary'
              )}
            >
              {r.id}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-ink-muted">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={chartAxisTick}
                tickFormatter={formatLabel}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={chartAxisTick}
                tickFormatter={compactCurrency}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  ...chartTooltipStyle,
                  fontWeight: 500,
                  fontSize: 14,
                  padding: 8
                }}
                itemStyle={{ color: 'var(--color-primary)', fontWeight: 500 }}
                formatter={(value) => [formatCurrency(Number(value)), 'Patrimonio']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#colorBalance)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: 'var(--color-bg-surface)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
