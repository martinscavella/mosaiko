import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Messaggio di autenticazione richiesta con stile minimale.
 */
export default function AuthRequiredMessage() {
  return (
    <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Accesso richiesto
      </h2>
      <p className="text-gray-600 mb-6">
        Effettua il login o registrati per accedere ai tuoi dati.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/auth/login"
          className="block w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="block w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Registrati
        </Link>
      </div>
    </div>
  );
}
