
import Link from 'next/link';

/**
 * Componente per mostrare un messaggio di autenticazione richiesta,
 * con pulsanti per login e registrazione, in stile coerente con l'app.
 */
export default function AuthRequiredMessage() {
  return (
    <div className="relative w-full max-w-md mx-auto p-8 rounded-2xl shadow-3xl border border-white/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
      {/* Sfondo gradient statico come login */}
      <div className="absolute inset-0 -z-10 rounded-2xl overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-60" />
      </div>
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-3 text-center">Accesso richiesto</h2>
        <p className="text-lg text-white text-opacity-90 leading-relaxed drop-shadow-md mb-8 text-center">
          Devi effettuare il login o registrarti per visualizzare i dati finanziari e accedere alla dashboard personale.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/auth/login" passHref legacyBehavior>
            <a className="group relative w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-center">
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">🚀</span> Login
              </span>
              <div className="absolute inset-0 rounded-xl bg-white bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </Link>
          <Link href="/auth/register" passHref legacyBehavior>
            <a className="group relative w-full sm:w-auto bg-gray-100 text-gray-700 rounded-xl font-semibold px-6 py-3 border border-gray-200 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 shadow focus:outline-none focus:ring-2 focus:ring-blue-200 text-center dark:bg-gray-800 dark:text-white dark:border-gray-700">
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">✨</span> Registrati
              </span>
              <div className="absolute inset-0 rounded-xl bg-white bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
