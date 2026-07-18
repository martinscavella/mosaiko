import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }
  
  try {
    console.log(`🔍 Fetching price for symbol: ${symbol}`)
    
    const priceData = await fetchYahooPrice(symbol)
    
    if (!priceData) {
      return NextResponse.json({ error: 'Price not found for symbol: ' + symbol }, { status: 404 })
    }

    console.log(`📊 Returning price data:`, priceData)
    
    return NextResponse.json(priceData)
  } catch (error) {
    console.error('Errore nel recupero del prezzo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Funzione per ottenere il prezzo direttamente da Yahoo Finance
async function fetchYahooPrice(symbol: string) {
  try {
    console.log(`📡 Fetching from Yahoo Finance: ${symbol}`)
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // Cache per 5 minuti
      }
    )
    
    if (!response.ok) {
      console.log(`⚠️ Yahoo Finance returned status ${response.status} for ${symbol}`)
      return null
    }
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) {
      console.log(`⚠️ No chart data found for ${symbol}`)
      return null
    }
    
    const meta = result.meta || {}
    const prices = result.indicators?.quote?.[0] || {}
    
    // Ottieni l'ultimo prezzo disponibile
    let currentPrice = prices.close?.[prices.close.length - 1]
    if (currentPrice === undefined || currentPrice === null) {
      currentPrice = meta.regularMarketPrice || meta.previousClose
    }
    
    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) {
      console.log(`⚠️ No valid price found for ${symbol}`)
      return null
    }
    
    // Ottieni il prezzo del giorno precedente se disponibile
    const previousPrice = prices.close?.[prices.close.length - 2] || currentPrice
    
    // Calcola la variazione percentuale
    const change24h = previousPrice > 0 
      ? ((currentPrice - previousPrice) / previousPrice) * 100 
      : 0
    
    // Ottieni la valuta dalle informazioni meta o default a EUR
    const currency = meta.currency || 'EUR'
    
    console.log(`✅ Yahoo Finance price for ${symbol}: ${currentPrice} ${currency}`)
    
    return {
      price: parseFloat(currentPrice.toFixed(2)),
      currency: currency,
      change24h: parseFloat(change24h.toFixed(2)),
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error(`❌ Error fetching Yahoo Finance data for ${symbol}:`, error)
    return null
  }
}
