import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Messaggio di autenticazione richiesta con stile minimale.
 */
export default function AuthRequiredMessage() {
  return (
    <div className="w-full max-w-sm mx-auto bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
      <div className="w-14 h-14 bg-primary-subtle rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-ink mb-2">
        Accesso richiesto
      </h2>
      <p className="text-ink-secondary mb-6">
        Effettua il login o registrati per accedere ai tuoi dati.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/auth/login"
          className="block w-full bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="block w-full bg-inset text-ink-secondary px-4 py-2.5 rounded-lg font-medium hover:bg-inset transition-colors"
        >
          Registrati
        </Link>
      </div>
    </div>
  );
}
