'use client'

// Interfacce per i dati di mercato
export interface MarketPrice {
  symbol: string
  price: number
  currency: string
  change24h: number
  lastUpdate: string
}

export interface PriceHistory {
  date: string
  price: number
}

// Cache per evitare troppe chiamate API
const priceCache = new Map<string, { data: MarketPrice; timestamp: number }>()
const historyCache = new Map<string, { data: PriceHistory[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minuti

/**
 * Recupera il prezzo attuale di un asset dal mercato
 * Per ora usa dati mock, ma può essere esteso con API reali
 */
export async function getCurrentMarketPrice(
  assetType: string,
  symbol: string,
  externalId?: string
): Promise<MarketPrice | null> {
  // Per i Buoni Fruttiferi, non c'è un prezzo di mercato
  if (assetType === 'buono_fruttifero') {
    return null
  }

  const cacheKey = `${assetType}_${symbol}_${externalId || 'default'}`
  const cached = priceCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Simula chiamata API - sostituire con API reali
    const mockPrice = await getMockMarketPrice(assetType, symbol)
    
    if (mockPrice) {
      priceCache.set(cacheKey, { data: mockPrice, timestamp: Date.now() })
    }
    
    return mockPrice
  } catch (error) {
    console.error('Errore nel recuperare il prezzo di mercato:', error)
    return null
  }
}

/**
 * Recupera lo storico prezzi di un asset
 */
export async function getPriceHistory(
  assetType: string,
  symbol: string,
  days: number = 30,
  externalId?: string
): Promise<PriceHistory[]> {
  // Per i Buoni Fruttiferi, non c'è storico di mercato
  if (assetType === 'buono_fruttifero') {
    return []
  }

  const cacheKey = `history_${assetType}_${symbol}_${days}_${externalId || 'default'}`
  const cached = historyCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Simula chiamata API - sostituire con API reali
    const mockHistory = await getMockPriceHistory(assetType, symbol, days)
    
    historyCache.set(cacheKey, { data: mockHistory, timestamp: Date.now() })
    return mockHistory
  } catch (error) {
    console.error('Errore nel recuperare lo storico prezzi:', error)
    return []
  }
}

/**
 * Dati reali di mercato tramite API esterne
 */
async function getMockMarketPrice(assetType: string, symbol: string): Promise<MarketPrice | null> {
  try {
    // 1. CRYPTO - usa CoinGecko API (gratuita)
    if (assetType.toLowerCase().includes('crypto') || isCryptoSymbol(symbol)) {
      return await getCryptoPrice(symbol)
    }

    // 2. AZIONI/ETF - usa Alpha Vantage o Yahoo Finance alternative
    if (assetType.toLowerCase().includes('stock') || assetType.toLowerCase().includes('etf') || 
        assetType.toLowerCase().includes('investment') || isStockSymbol(symbol)) {
      return await getStockPrice(symbol)
    }

    // 3. MATERIE PRIME - usa Commodities API
    if (assetType.toLowerCase().includes('commodity') || isCommoditySymbol(symbol)) {
      return await getCommodityPrice(symbol)
    }

    // 4. BUONI FRUTTIFERI - nessun prezzo di mercato
    if (assetType.toLowerCase().includes('buono') || assetType.toLowerCase().includes('fruttifero')) {
      return null
    }

    // 5. FALLBACK - per ETF generici come MSCI World, usa Yahoo Finance alternative
    return await getGenericAssetPrice(symbol)
    
  } catch (error) {
    console.error(`Errore nel recuperare prezzo per ${symbol}:`, error)
    // Fallback ai dati mock in caso di errore
    return await getOriginalMockPrice(assetType, symbol)
  }
}

// Funzione per riconoscere simboli crypto
function isCryptoSymbol(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'USDT', 'BNB', 'XRP', 'DOGE']
  return cryptoSymbols.includes(symbol.toUpperCase())
}

// Funzione per riconoscere simboli azionari
function isStockSymbol(symbol: string): boolean {
  const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'SPY', 'VTI', 'QQQ']
  return stockSymbols.includes(symbol.toUpperCase())
}

// Funzione per riconoscere simboli commodities
function isCommoditySymbol(symbol: string): boolean {
  const commoditySymbols = ['GOLD', 'SILVER', 'OIL', 'WHEAT', 'CORN']
  return commoditySymbols.includes(symbol.toUpperCase())
}

// API per criptovalute (CoinGecko - gratuita)
async function getCryptoPrice(symbol: string): Promise<MarketPrice | null> {
  try {
    const cryptoId = getCoinGeckoId(symbol)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=eur&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const coinData = data[cryptoId]
    
    if (!coinData) return null
    
    return {
      symbol,
      price: coinData.eur,
      currency: 'EUR',
      change24h: coinData.eur_24h_change || 0,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Errore CoinGecko API:', error)
    return null
  }
}

// Mappa simboli crypto a IDs CoinGecko
function getCoinGeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'SOL': 'solana',
    'DOT': 'polkadot',
    'MATIC': 'polygon',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'DOGE': 'dogecoin'
  }
  return mapping[symbol.toUpperCase()] || 'bitcoin'
}

// API per azioni/ETF (usando Yahoo Finance alternative o Alpha Vantage)
async function getStockPrice(symbol: string): Promise<MarketPrice | null> {
  try {
    // Usa Yahoo Finance alternative (gratuita)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) return null
    
    const prices = result.indicators?.quote?.[0]
    const currentPrice = prices?.close?.[prices.close.length - 1]
    const previousPrice = prices?.close?.[prices.close.length - 2]
    
    if (currentPrice === undefined) return null
    
    const change24h = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
    
    return {
      symbol,
      price: currentPrice,
      currency: 'EUR', // Converti se necessario
      change24h,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Errore Yahoo Finance API:', error)
    return null
  }
}

// API per materie prime
async function getCommodityPrice(symbol: string): Promise<MarketPrice | null> {
  try {
    // Per le materie prime, usa Alpha Vantage (richiede API key)
    // Per ora usa dati mock, ma struttura per API reale
    const commodityPrices: Record<string, number> = {
      'GOLD': 2000 + (Math.random() - 0.5) * 100,
      'SILVER': 25 + (Math.random() - 0.5) * 2,
      'OIL': 75 + (Math.random() - 0.5) * 10
    }
    
    const price = commodityPrices[symbol.toUpperCase()]
    if (!price) return null
    
    return {
      symbol,
      price,
      currency: 'EUR',
      change24h: (Math.random() - 0.5) * 4,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Errore Commodities API:', error)
    return null
  }
}

// API generica per ETF e altri asset (Yahoo Finance)
async function getGenericAssetPrice(symbol: string): Promise<MarketPrice | null> {
  try {
    // Mappatura simboli generici a simboli Yahoo Finance
    const symbolMapping: Record<string, string> = {
      'MSCI_WORLD': 'SWDA.MI',
      'IWDA': 'IWDA.AS', 
      'CORE_MSCI_WORLD_USD_ACC': 'SWDA.MI',
      'SP500': 'SPY',
      'S&P_500': 'SPY',
      'VANGUARD_TOTAL': 'VTI',
      'NASDAQ': 'QQQ',
      'EUROSTOXX50': 'SX5E.DE',
      'DAX': '^GDAXI',
      'FTSE100': 'VFEA.MI',
      'FTSE_EMERGING_MARKETS_USD_ACC': 'VFEA.MI'
    }
    
    // Pulisce il simbolo e cerca una mappatura
    const cleanSymbol = symbol.toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/\s+/g, '_')
    
    const yahooSymbol = symbolMapping[cleanSymbol] || 
                       symbolMapping[symbol.toUpperCase()] || 
                       symbol
    
    console.log(`🔄 Mapping symbol: ${symbol} -> ${yahooSymbol}`)
    
    return await getStockPrice(yahooSymbol)
  } catch (error) {
    console.error('Errore Generic Asset API:', error)
    return null
  }
}

// Funzione originale mock come fallback
async function getOriginalMockPrice(assetType: string, symbol: string): Promise<MarketPrice | null> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

  const basePrice = getBasePriceForAsset(assetType, symbol)
  const volatility = getVolatilityForAssetType(assetType)
  
  const changePercent = (Math.random() - 0.5) * volatility * 2
  const currentPrice = basePrice * (1 + changePercent / 100)
  
  return {
    symbol,
    price: Math.max(0.01, currentPrice),
    currency: 'EUR',
    change24h: changePercent,
    lastUpdate: new Date().toISOString()
  }
}

async function getMockPriceHistory(assetType: string, symbol: string, days: number): Promise<PriceHistory[]> {
  try {
    // 1. CRYPTO - usa CoinGecko per storico
    if (assetType.toLowerCase().includes('crypto') || isCryptoSymbol(symbol)) {
      return await getCryptoPriceHistory(symbol, days)
    }

    // 2. AZIONI/ETF - usa Yahoo Finance per storico
    if (assetType.toLowerCase().includes('stock') || assetType.toLowerCase().includes('etf') || 
        assetType.toLowerCase().includes('investment') || isStockSymbol(symbol)) {
      return await getStockPriceHistory(symbol, days)
    }

    // 3. FALLBACK - usa dati mock
    return await getOriginalMockHistory(assetType, symbol, days)
    
  } catch (error) {
    console.error(`Errore nel recuperare storico per ${symbol}:`, error)
    return await getOriginalMockHistory(assetType, symbol, days)
  }
}

// Storico prezzi crypto da CoinGecko
async function getCryptoPriceHistory(symbol: string, days: number): Promise<PriceHistory[]> {
  try {
    const cryptoId = getCoinGeckoId(symbol)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=eur&days=${days}&interval=daily`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const prices = data.prices || []
    
    return prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price: price
    }))
  } catch (error) {
    console.error('Errore CoinGecko History API:', error)
    return []
  }
}

// Storico prezzi azioni da Yahoo Finance
async function getStockPriceHistory(symbol: string, days: number): Promise<PriceHistory[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${Math.floor(startDate.getTime()/1000)}&period2=${Math.floor(endDate.getTime()/1000)}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) return []
    
    const timestamps = result.timestamp || []
    const prices = result.indicators?.quote?.[0]?.close || []
      return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      price: prices[index] || 0
    })).filter((item: PriceHistory) => item.price > 0)
    
  } catch (error) {
    console.error('Errore Yahoo Finance History API:', error)
    return []
  }
}

// Funzione originale mock come fallback per lo storico
async function getOriginalMockHistory(assetType: string, symbol: string, days: number): Promise<PriceHistory[]> {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

  const basePrice = getBasePriceForAsset(assetType, symbol)
  const volatility = getVolatilityForAssetType(assetType)
  const history: PriceHistory[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const trendFactor = Math.sin((i / days) * Math.PI) * 0.1
    const randomFactor = (Math.random() - 0.5) * volatility / 100
    const price = basePrice * (1 + trendFactor + randomFactor)
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(0.01, price)
    })
  }
  
  return history
}

/**
 * Prezzi base per diversi tipi di asset (simulati)
 */
function getBasePriceForAsset(assetType: string, symbol: string): number {
  const prices: Record<string, Record<string, number>> = {
    crypto: {
      'BTC': 45000,
      'ETH': 2800,
      'ADA': 0.45,
      'SOL': 95,
      'DOT': 12,
      'MATIC': 0.85,
      'default': 100
    },
    investment: {
      'AAPL': 185,
      'GOOGL': 135,
      'AMZ': 145,
      'TSLA': 210,
      'SPY': 420,
      'VTI': 240,
      'default': 50
    },
    commodity: {
      'GOLD': 2000,
      'SILVER': 25,
      'OIL': 75,
      'WHEAT': 550,
      'default': 100
    },
    real_estate: {
      'default': 200000
    },
    vehicle: {
      'default': 25000
    },
    electronics: {
      'default': 800
    },
    art: {
      'default': 5000
    },
    other: {
      'default': 1000
    }
  }

  return prices[assetType]?.[symbol] || prices[assetType]?.['default'] || 100
}

/**
 * Volatilità tipica per tipo di asset (percentuale)
 */
function getVolatilityForAssetType(assetType: string): number {
  const volatilities: Record<string, number> = {
    crypto: 8,        // 8% volatilità giornaliera
    investment: 3,    // 3% per azioni
    commodity: 4,     // 4% per materie prime
    real_estate: 0.5, // 0.5% per immobili
    vehicle: 1,       // 1% per veicoli
    electronics: 2,   // 2% per elettronica
    art: 3,          // 3% per arte
    other: 2         // 2% per altri
  }

  return volatilities[assetType] || 2
}

/**
 * Determina se un asset ha un mercato attivo
 */
export function hasActiveMarket(assetType: string): boolean {
  const marketableTypes = ['crypto', 'investment', 'commodity']
  return marketableTypes.includes(assetType)
}

/**
 * Calcola la performance di un asset basata su transazioni e prezzi di mercato
 */
export interface AssetPerformanceData {
  totalInvested: number
  totalQuantity: number
  averageCost: number
  currentValue: number
  totalGainLoss: number
  percentageGainLoss: number
  hasMarketData: boolean
}

export function calculateAssetPerformance(
  transactions: Array<{
    current_amount: number
    asset_quantity?: number | null
    transaction_date: string
  }>,
  currentMarketPrice: number | null,
  assetType: string
): AssetPerformanceData {
  // Calcola totali dalle transazioni
  const totalInvested = transactions.reduce((sum, t) => sum + Math.abs(t.current_amount), 0)
  const totalQuantity = transactions.reduce((sum, t) => sum + (t.asset_quantity || 0), 0)
  const averageCost = totalQuantity > 0 ? totalInvested / totalQuantity : 0

  // Per Buoni Fruttiferi, usa il valore nominale + interessi
  if (assetType === 'buono_fruttifero') {
    return {
      totalInvested,
      totalQuantity,
      averageCost,
      currentValue: totalInvested, // Per ora uguale all'investito (gli interessi si aggiungeranno a scadenza)
      totalGainLoss: 0,
      percentageGainLoss: 0,
      hasMarketData: false
    }
  }

  // Per asset con mercato attivo
  if (currentMarketPrice && totalQuantity > 0) {
    const currentValue = totalQuantity * currentMarketPrice
    const totalGainLoss = currentValue - totalInvested
    const percentageGainLoss = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

    return {
      totalInvested,
      totalQuantity,
      averageCost,
      currentValue,
      totalGainLoss,
      percentageGainLoss,
      hasMarketData: true
    }
  }

  // Fallback se non ci sono dati di mercato
  return {
    totalInvested,
    totalQuantity,
    averageCost,
    currentValue: totalInvested, // Usa il costo come valore corrente
    totalGainLoss: 0,
    percentageGainLoss: 0,
    hasMarketData: false
  }
}
