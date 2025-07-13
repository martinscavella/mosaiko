import { useMemo } from 'react';
import { Tooltip, ResponsiveContainer, Area, AreaChart, XAxis } from 'recharts';
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

// Raggruppa i punti per mese e usa il primo giorno del mese come punto sull'asse X
const groupByMonth = (balanceHistory: BalancePoint[]): BalancePoint[] => {
  const grouped: BalancePoint[] = [];

  balanceHistory.forEach(point => {
    const date = new Date(point.date);
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10); // Calcola il primo giorno del mese
    const lastGroup = grouped[grouped.length - 1];

    if (lastGroup && lastGroup.date === firstOfMonth) {
      lastGroup.balance += point.balance - (lastGroup.balance || 0);
    } else {
      grouped.push({ date: firstOfMonth, balance: point.balance });
    }
  });

  return grouped;
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
  const balanceHistory = [];
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

  return groupByMonth(balanceHistory);
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
        <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 mb-4 min-h-[300px] max-h-[300px]">
          <div className="h-full flex items-center justify-center text-gray-500">
            Nessun dato disponibile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-6 mb-4 min-h-[300px] max-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h11M9 21V3m12 7h-7m4 4-4-4m0 0 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Andamento Saldo Totale</h3>
              <p className="text-sm text-gray-600 font-medium">Visualizza il saldo totale aggiornato</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(chartData[chartData.length - 1].balance)}</p>
            <p className="text-sm text-gray-500">Saldo attuale</p>
          </div>
        </div>
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
            <XAxis dataKey="date" hide />
            <Area
              type="basis"
              dataKey="balance"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#colorBalance)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
