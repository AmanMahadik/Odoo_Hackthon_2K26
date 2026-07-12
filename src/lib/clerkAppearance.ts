/** Shared Clerk appearance — TransitOps theme (works even if Tailwind classes are purged) */

export const clerkLayout = {
  logoPlacement: 'none' as const,
  showOptionalFields: true,
  socialButtonsPlacement: 'top' as const,
  // Hide orange “Development mode” strip when possible
  unsafe_disableDevelopmentModeWarnings: true,
};

/**
 * Element className map. Prefer semantic Tailwind tokens; globals.css
 * also pins critical colors with !important for production reliability.
 */
export const clerkElements = {
  rootBox: 'w-full max-w-md mx-auto font-sans',
  card: 'w-full rounded-2xl border-0 bg-transparent shadow-none',
  cardBox: 'w-full shadow-none bg-transparent',
  main: 'gap-4',
  header: 'text-center gap-1',
  headerTitle: 'text-foreground text-base font-medium tracking-tight',
  headerSubtitle: 'text-muted-foreground text-sm font-normal',
  socialButtonsBlockButton:
    'border-0 bg-muted/50 text-foreground hover:bg-muted font-normal rounded-xl h-11 shadow-none ring-0 outline-none',
  socialButtonsBlockButtonText: 'text-foreground font-normal text-sm',
  formFieldLabel: 'text-foreground font-normal text-sm',
  formFieldInput:
    'bg-background border border-border text-foreground font-normal rounded-xl h-11 shadow-none',
  formButtonPrimary:
    'bg-primary text-primary-foreground hover:bg-primary/90 font-normal shadow-none rounded-xl h-11',
  footerActionLink: 'text-primary hover:text-primary/80 font-normal',
  identityPreviewText: 'text-foreground font-normal',
  identityPreviewEditButton: 'text-primary font-normal',
  formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
  otpCodeFieldInput: 'bg-background border-border text-foreground rounded-xl',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground text-xs',
  formFieldSuccessText: 'text-muted-foreground text-xs',
  formFieldErrorText: 'text-destructive text-xs',
  // Hide Clerk chrome
  footer: 'hidden',
  footerAction: 'hidden',
  logoBox: 'hidden',
  logoImage: 'hidden',
  developmentModeNotice: 'hidden',
  footerPages: 'hidden',
  badge: 'hidden',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildClerkAppearance(isDark: boolean, baseTheme?: any): any {
  return {
    baseTheme: isDark ? baseTheme : undefined,
    layout: clerkLayout,
    variables: isDark
      ? {
          // Match TransitOps dark: light primary CTA like local screenshot
          colorPrimary: '#f5f5f5',
          colorBackground: 'transparent',
          colorInputBackground: '#171717',
          colorInputText: '#fafafa',
          colorText: '#fafafa',
          colorTextSecondary: '#a3a3a3',
          colorNeutral: '#fafafa',
          colorDanger: '#f87171',
          borderRadius: '0.75rem',
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
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
    elements: clerkElements,
  };
}
