# Database Setup Instructions

## 1. Create Tables in Supabase

Go to your Supabase Dashboard → SQL Editor and run the following commands:

### Execute the schema.sql file

Copy and paste the contents of `database/schema.sql` into the SQL Editor and execute it.

This will create all the necessary tables:
- `profiles` - User profile information
- `accounts` - Bank accounts and financial accounts  
- `categories` - Transaction categories
- `transactions` - Financial transactions
- `financial_goals` - Savings and financial goals
- `assets` - Fixed assets tracking
- `refunds` - Refund tracking
- `budgets` - Budget management
- `recurring_transactions` - Scheduled transactions
- `investment_portfolios` - Investment tracking

### Enable Row Level Security (RLS)

The schema already includes RLS policies, but make sure they are enabled:

1. Go to Authentication → Policies in your Supabase Dashboard
2. Verify that each table has policies enabled
3. Users should only see their own data (filtered by user_id)

## 2. Test Authentication

1. Open http://localhost:3001
2. Click "Sign Up" to create a new account
3. Check your email for verification (if email confirmation is enabled)
4. Sign in and verify you can access the dashboard

## 3. Next Steps

Once authentication is working:
1. Start adding accounts through the dashboard
2. Create categories for your transactions
3. Begin tracking your financial data

## Troubleshooting

- If you see "Invalid API Key" errors, check your .env.local file
- If tables don't exist, run the schema.sql script in Supabase SQL Editor
- If you can't sign up, check Supabase Authentication settings
