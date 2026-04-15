

## Plan: Create a Dummy Admin Account

Since the app requires authentication and the user needs to preview it, I'll create a test admin account using the authentication system.

### Steps

1. **Enable auto-confirm for email signups** temporarily using the auth configuration tool, so the dummy account can sign in immediately without email verification.

2. **Add a temporary sign-up script** — create the admin user via the Supabase auth API with these credentials:
   - Email: `admin@anupammusicals.com`
   - Password: `admin123`

3. **Create the user** by adding a small utility that runs once to register the account, then remove it.

### Result

After this, you'll be able to log in at the login screen with:
- **Email:** `admin@anupammusicals.com`
- **Password:** `admin123`

