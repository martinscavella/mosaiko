import { describe, it, expect } from 'vitest'
import jsPDF from 'jspdf'

// Verifica che la sequenza di chiamate usata in TransactionDetailsModal.tsx
// per generare la ricevuta PDF resti valida dopo il bump di jspdf 3.x -> 4.2.1
// (fix della CVE critica GHSA-wfv2-pwc8-crg5, CVSS 9.6).
describe('jsPDF receipt generation API (used by TransactionDetailsModal)', () => {
  it('builds a document with the same calls used for the transaction receipt', () => {
    const doc = new jsPDF()
    expect(() => {
      doc.setFontSize(18)
      doc.text('Ricevuta Transazione', 14, 18)
      doc.setFontSize(12)
      doc.text('Importo: 42€', 14, 32)
      doc.text('Tipo: expense', 14, 40)
      doc.text('Data: 04/07/2026', 14, 48)
      doc.text('Da: Conto Corrente', 14, 56)
      doc.text('Descrizione: Test', 14, 64)
      doc.text('Categoria: Nessuna', 14, 72)
      doc.text('Sottocategoria: Nessuna', 14, 80)
    }).not.toThrow()

    // .output() renders the document to a blob/string without triggering a
    // browser download, giving us a real assertion that generation succeeded.
    const output = doc.output('datauristring')
    expect(output).toMatch(/^data:application\/pdf/)
  })
})
