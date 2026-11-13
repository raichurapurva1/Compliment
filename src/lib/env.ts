// Central place for configuration, with clear errors when something is missing.

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  /** Claude features (resume parsing, "why you two") switch on when this is set. */
  claudeEnabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
  /** Social login stays hidden until the providers are configured in Supabase. */
  linkedinEnabled: () => process.env.NEXT_PUBLIC_ENABLE_LINKEDIN === "true",
  googleEnabled: () => process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true",
  isConfigured: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};
