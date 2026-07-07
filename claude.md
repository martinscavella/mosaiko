# CLAUDE.md
## Design System — Mosaiko
Mosaiko è un gestionale finanziario con moduli multipli per la vita 
quotidiana (finanza + altri moduli). Priorità: fiducia, chiarezza dei 
dati, leggibilità in dashboard data-heavy.

I design token sono definiti in `designtoken.md`. Usa sempre questi 
token invece di valori hardcoded.

Regole:
- Blu primario per brand/navigazione/CTA (mai sostituire con altri blu)
- Verde solo per stati positivi (entrate, saldo attivo, obiettivi)
- Rosso solo per alert/spese/scadenze
- Ogni modulo ha un accent color dedicato (vedi tabella moduli in designtoken.md)
- Numeri e importi: font con buona leggibilità/allineamento tabellare
- Card con ombre sottili, non invasive
- Non usare palette blu/grigio generiche prese di default