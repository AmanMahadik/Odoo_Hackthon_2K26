/** Shared element overrides — works with light base or dark baseTheme */
export const clerkElements = {
  rootBox: 'w-full max-w-md mx-auto',
  card: 'bg-card border border-border shadow-lg w-full rounded-xl !shadow-md',
  headerTitle: 'text-foreground font-medium text-lg',
  headerSubtitle: 'text-muted-foreground text-sm font-normal',
  socialButtonsBlockButton:
    'border-border bg-background text-foreground hover:bg-muted font-normal',
  formFieldLabel: 'text-foreground font-normal text-sm',
  formFieldInput:
    'bg-background border-border text-foreground font-normal rounded-md',
  formButtonPrimary:
    'bg-primary text-primary-foreground hover:bg-primary/90 font-normal shadow-none',
  footerActionLink: 'text-primary hover:text-primary/80 font-normal',
  identityPreviewText: 'text-foreground font-normal',
  identityPreviewEditButton: 'text-primary font-normal',
  formFieldInputShowPasswordButton: 'text-muted-foreground',
  otpCodeFieldInput: 'bg-background border-border text-foreground',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground',
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
          colorPrimary: '#f8fafc',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#171717',
          colorInputText: '#fafafa',
          colorText: '#fafafa',
          colorTextSecondary: '#a3a3a3',
          colorNeutral: '#fafafa',
          colorDanger: '#f87171',
          borderRadius: '0.625rem',
        }
      : {
          colorPrimary: '#171717',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#0a0a0a',
          colorText: '#0a0a0a',
          colorTextSecondary: '#737373',
          colorNeutral: '#0a0a0a',
          colorDanger: '#dc2626',
          borderRadius: '0.625rem',
        },
    elements: clerkElements,
  };
}
