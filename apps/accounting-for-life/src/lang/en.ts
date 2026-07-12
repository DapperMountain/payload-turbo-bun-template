/**
 * English (source locale).
 *
 * `custom` is Payload's project-translation namespace — runtime keys are `custom:…` in `t()`.
 * @see https://payloadcms.com/docs/configuration/i18n#custom-translations
 */
export default {
  custom: {
    roles: {
      SYSTEM_ADMIN: 'System administrator',
      SYSTEM_USER: 'System user',
      TENANT_ADMIN: 'Workspace administrator',
      TENANT_USER: 'Workspace user',
    },
    defaultTenant: 'Default workspace',
    frontend: {
      appName: 'Accounting for Life',
      logoAlt: 'Accounting for Life',
      welcome: 'Welcome',
      welcomeBack: 'Welcome back',
      signedInPrefix: 'Signed in as ',
      signedOutBlurb: 'Self-hosted personal finance on Payload — budgeting, ledger, and sync in one place.',
      tagline: 'Built with Payload CMS, Tailwind, and shadcn/ui',
      openAdmin: 'Open admin',
      documentation: 'Documentation',
      chooseLanguage: 'Choose language',
    },
    meta: {
      title: 'Accounting for Life',
      description: 'Self-hosted personal finance on Payload CMS',
    },
  },
} as const
