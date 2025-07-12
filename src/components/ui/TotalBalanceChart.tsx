import { useMemo } from 'react';
import { Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from '@/lib/helpers/format';

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
  date: string;
  balance: number;
}

// Utility per validare una data
const isValidDate = (date: Date | string | null | undefined): date is string => {
  if (!date || typeof date !== 'string' || date.length < 8) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

// Calcola il saldo totale cumulativo nel tempo
const computeTotalBalanceHistory = (
  transactions: Transaction[],
  accounts: Account[]
): BalancePoint[] => {
  // Filtra e ordina transazioni valide
  const validTransactions = transactions
    .filter(t => isValidDate(t.transaction_date))
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
    .map(t => ({
      ...t,
      // Transazioni asset non influenzano il saldo (solo cambio di forma del capitale)
      current_amount: t.asset_id ? 0 : Number(t.current_amount || 0)
    }));

  if (validTransactions.length === 0) return [];

  // Bilancio iniziale da tutti gli account
  const initialBalance = accounts.reduce((sum, account) => sum + (account.initial_balance || 0), 0);

  // Costruisci la timeline
  const balanceHistory: BalancePoint[] = [];
  let currentBalance = initialBalance;

  // Punto iniziale
  balanceHistory.push({
    date: validTransactions[0].transaction_date as string,
    balance: currentBalance
  });

  // Processa tutte le transazioni
  for (const transaction of validTransactions) {
    currentBalance += transaction.current_amount;
    balanceHistory.push({
      date: transaction.transaction_date as string,
      balance: currentBalance
    });
  }

  return balanceHistory;
};

export default function TotalBalanceChart({ data, className = '' }: TotalBalanceChartProps) {
  // Memoizza il calcolo della cronologia del saldo
  const chartData = useMemo(() => {
    if (!data?.transactions?.length || !data?.accounts) return [];
    return computeTotalBalanceHistory(data.transactions, data.accounts);
  }, [data?.transactions, data?.accounts]);

  // Early return se non ci sono dati
  if (!chartData.length) {
    return (
      <div className={`group relative ${className}`}>
        <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6 transition-all duration-300">
          <div className="h-[170px] flex items-center justify-center text-gray-500">
            Nessun dato disponibile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      {/* Floating gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300" />
      
      {/* Main container - coerente con FinanceWidget */}
      <div className="relative bg-white/95 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/98 hover:border-white/70 hover:-translate-y-1">
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ 
                borderRadius: 8, 
                background: '#fff', 
                border: '1px solid #e5e7eb', 
                color: '#2563eb', 
                fontWeight: 500, 
                fontSize: 14, 
                boxShadow: 'none',
                padding: 8 
              }}
              itemStyle={{ color: '#2563eb', fontWeight: 500 }}
              formatter={(value) => formatCurrency(Number(value))}
              labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
            />
            <Area
              type="natural"
              dataKey="balance"
              stroke="#2563eb"
              strokeWidth={1.5}
              fill="url(#colorBalance)"
              dot={false}
              activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
