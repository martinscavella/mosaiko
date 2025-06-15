import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const assetType = searchParams.get('type') || 'Stock'

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  try {
    console.log(`🔍 Fetching price for ${symbol} (${assetType})`)
    
    // Determina quale API usare basandosi sul simbolo/tipo
    let priceData = null
    
    // 1. CRYPTO - usa CoinGecko
    if (isCryptoSymbol(symbol)) {
      priceData = await getCryptoPrice(symbol)
    }    // 2. AZIONI/ETF - usa Yahoo Finance
    else if (isStockOrETF(symbol, assetType)) {
      priceData = await getStockPrice(symbol)
    }
    // 3. BUONI FRUTTIFERI - nessun prezzo
    else if (assetType.toLowerCase().includes('buono') || assetType.toLowerCase().includes('fruttifero')) {
      return NextResponse.json({ error: 'Buoni Fruttiferi have no market price' }, { status: 404 })
    }    // 4. FALLBACK - usa dati mock
    else {
      priceData = await getMockPrice()
    }

    if (!priceData) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    return NextResponse.json({
      price: priceData.price,
      currency: priceData.currency,
      change24h: priceData.change24h,
      lastUpdate: priceData.lastUpdate
    })
  } catch (error) {
    console.error('Errore nel recupero del prezzo:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Funzioni helper
function isCryptoSymbol(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'USDT', 'BNB', 'XRP', 'DOGE']
  return cryptoSymbols.includes(symbol.toUpperCase())
}

function isStockOrETF(symbol: string, assetType: string): boolean {
  return assetType.toLowerCase().includes('stock') || 
         assetType.toLowerCase().includes('etf') || 
         assetType.toLowerCase().includes('investment') ||
         symbol.includes('.')  // Simboli con exchange (es. IWDA.AS)
}

// API CoinGecko per crypto
async function getCryptoPrice(symbol: string) {
  try {
    const cryptoId = getCoinGeckoId(symbol)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=eur&include_24hr_change=true`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // Cache per 5 minuti
      }
    )
    
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`)
    
    const data = await response.json()
    const coinData = data[cryptoId]
    
    if (!coinData) return null
    
    return {
      price: coinData.eur,
      currency: 'EUR',
      change24h: coinData.eur_24h_change || 0,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Errore CoinGecko:', error)
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
    'MATIC': 'polygon'
  }
  return mapping[symbol.toUpperCase()] || 'bitcoin'
}

// API Yahoo Finance per azioni/ETF
async function getStockPrice(symbol: string) {
  try {
    // Mappa simboli generici a simboli Yahoo Finance
    const mappedSymbol = mapToYahooSymbol(symbol)
    
    console.log(`📈 Fetching from Yahoo Finance: ${mappedSymbol}`)
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${mappedSymbol}?interval=1d&range=2d`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 }
      }
    )
    
    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`)
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) return null
    
    const prices = result.indicators?.quote?.[0]
    const currentPrice = prices?.close?.[prices.close.length - 1]
    const previousPrice = prices?.close?.[prices.close.length - 2]
    
    if (currentPrice === undefined) return null
    
    const change24h = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
    
    return {
      price: currentPrice,
      currency: 'EUR',
      change24h,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Errore Yahoo Finance:', error)
    return null
  }
}

// Mappa simboli a Yahoo Finance
function mapToYahooSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    'IWDA': 'IWDA.AS',
    'MSCI_WORLD': 'IWDA.AS',
    'CORE_MSCI_WORLD_USD_ACC': 'IWDA.AS',
    'SP500': 'SPY',
    'NASDAQ': 'QQQ'
  }
  
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  return mapping[cleanSymbol] || mapping[symbol.toUpperCase()] || symbol
}

// Fallback con dati mock
async function getMockPrice() {
  const basePrice = 100 + Math.random() * 100
  const change24h = (Math.random() - 0.5) * 10
  
  return {
    price: basePrice,
    currency: 'EUR',
    change24h,
    lastUpdate: new Date().toISOString()
  }
}
