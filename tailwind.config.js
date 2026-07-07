/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Breakpoint per schermi ultrawide
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Scala tipografica da designtoken.md
        h1: ['26px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        caption: ['13px', { lineHeight: '18px' }],
        amount: ['32px', { lineHeight: '38px', fontWeight: '700' }],
      },
      colors: {
        // Token semantici — definiti in globals.css, mai hex hardcoded nei componenti
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: 'var(--color-primary-subtle)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          strong: 'var(--color-success-strong)',
          subtle: 'var(--color-success-subtle)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          subtle: 'var(--color-danger-subtle)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle: 'var(--color-warning-subtle)',
        },
        canvas: 'var(--color-bg-canvas)',
        surface: 'var(--color-bg-surface)',
        elevated: 'var(--color-bg-elevated)',
        inset: 'var(--color-bg-inset)',
        ink: {
          DEFAULT: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        edge: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        module: {
          finance: {
            DEFAULT: 'var(--color-module-finance)',
            subtle: 'var(--color-module-finance-subtle)',
          },
          tasks: {
            DEFAULT: 'var(--color-module-tasks)',
            subtle: 'var(--color-module-tasks-subtle)',
          },
          health: {
            DEFAULT: 'var(--color-module-health)',
            subtle: 'var(--color-module-health-subtle)',
          },
          learning: {
            DEFAULT: 'var(--color-module-learning)',
            subtle: 'var(--color-module-learning-subtle)',
          },
        },
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'slide-up': 'slideInUp 0.6s ease-out forwards',
        'fade-scale': 'fadeInScale 0.5s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInUp: {
          from: {
            transform: 'translateY(30px)',
            opacity: '0',
          },
          to: {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        fadeInScale: {
          from: {
            transform: 'scale(0.8)',
            opacity: '0',
          },
          to: {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
