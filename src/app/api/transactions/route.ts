import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const assetId = searchParams.get('asset_id')

  if (!assetId) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 })
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Recupera le transazioni dell'asset dal database
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        asset_id,
        transaction_type,
        asset_quantity,
        initial_amount,
        transaction_date
      `)
      .eq('asset_id', assetId)
      .not('asset_quantity', 'is', null)
      .order('transaction_date', { ascending: true })

    if (error) {
      console.error('Errore database:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero delle transazioni' },
        { status: 500 }
      )
    }    // Trasforma i dati per il formato richiesto dal componente
    console.log('🔍 Raw transactions from DB:', transactions)
    
    const formattedTransactions = transactions.map(t => {
      console.log('Processing transaction:', {
        id: t.id,
        type: t.transaction_type,
        amount: t.initial_amount,
        quantity: t.asset_quantity
      })
      
      // Per gli investimenti, se c'è asset_quantity positiva, è un acquisto
      // indipendentemente dal transaction_type nel database
      const isAcquisition = (t.asset_quantity || 0) > 0
      
      return {
        id: t.id,
        asset_id: t.asset_id,
        transaction_type: isAcquisition ? 'buy' : 'sell' as 'buy' | 'sell',
        quantity: Math.abs(t.asset_quantity || 0),
        unit_price: Math.abs(t.initial_amount) / Math.abs(t.asset_quantity || 1),
        transaction_date: t.transaction_date
      }
    })

    console.log('✅ Formatted transactions:', formattedTransactions)

    return NextResponse.json(formattedTransactions)
  } catch (error) {
    console.error('Errore nel recupero delle transazioni:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
