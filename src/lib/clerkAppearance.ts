/** Shared Clerk element overrides — aligned with TransitOps shadcn tokens */

export const clerkElements = {
  rootBox: 'w-full max-w-md mx-auto font-sans',
  card: [
    'w-full rounded-2xl border border-border bg-card text-card-foreground',
    'shadow-none ring-1 ring-border/60',
  ].join(' '),
  cardBox: 'w-full shadow-none',
  main: 'gap-4',
  header: 'text-center gap-1',
  headerTitle: 'text-foreground text-lg font-medium tracking-tight',
  headerSubtitle: 'text-muted-foreground text-sm font-normal',
  socialButtonsBlockButton: [
    'border border-border bg-background text-foreground',
    'hover:bg-muted font-normal rounded-lg h-10',
  ].join(' '),
  socialButtonsBlockButtonText: 'text-foreground font-normal text-sm',
  formFieldLabel: 'text-foreground font-normal text-sm',
  formFieldInput: [
    'bg-background border border-border text-foreground font-normal',
    'rounded-lg h-10 focus:ring-1 focus:ring-ring',
  ].join(' '),
  formButtonPrimary: [
    'bg-primary text-primary-foreground hover:bg-primary/90',
    'font-normal shadow-none rounded-lg h-10',
  ].join(' '),
  footerActionLink: 'text-primary hover:text-primary/80 font-normal',
  identityPreviewText: 'text-foreground font-normal',
  identityPreviewEditButton: 'text-primary font-normal',
  formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
  otpCodeFieldInput: 'bg-background border-border text-foreground rounded-lg',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground text-xs',
  formFieldSuccessText: 'text-muted-foreground text-xs',
  formFieldErrorText: 'text-destructive text-xs',
  alertText: 'text-sm',
  // Hide Clerk branding
  footer: 'hidden !important',
  footerAction: 'hidden',
  logoBox: 'hidden !important',
  logoImage: 'hidden !important',
  developmentModeNotice: 'hidden !important',
  footerPages: 'hidden !important',
  badge: 'hidden',
} as const;

export const clerkLayout = {
  logoPlacement: 'none' as const,
  showOptionalFields: true,
  socialButtonsPlacement: 'bottom' as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildClerkAppearance(isDark: boolean, baseTheme?: any): any {
  return {
    baseTheme: isDark ? baseTheme : undefined,
    layout: clerkLayout,
    variables: isDark
      ? {
          colorPrimary: '#fafafa',
          colorBackground: 'transparent',
          colorInputBackground: '#0a0a0a',
          colorInputText: '#fafafa',
          colorText: '#fafafa',
          colorTextSecondary: '#a3a3a3',
          colorNeutral: '#fafafa',
          colorDanger: '#f87171',
          borderRadius: '0.625rem',
          fontFamily: 'inherit',
        }
      : {
          colorPrimary: '#171717',
          colorBackground: 'transparent',
          colorInputBackground: '#ffffff',
          colorInputText: '#0a0a0a',
          colorText: '#0a0a0a',
          colorTextSecondary: '#737373',
          colorNeutral: '#0a0a0a',
          colorDanger: '#dc2626',
          borderRadius: '0.625rem',
          fontFamily: 'inherit',
        },
    elements: clerkElements,
  };
}
