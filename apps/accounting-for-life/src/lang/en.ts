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
      logoAlt: 'Payload',
      welcome: 'Welcome',
      welcomeBack: 'Welcome back',
      signedInPrefix: 'Signed in as ',
      signedOutBlurb: 'Your new Payload + design system stack is ready.',
      openAdmin: 'Open admin',
      documentation: 'Documentation',
      chooseLanguage: 'Choose language',
    },
    meta: {
      title: 'Payload',
      description: 'Payload CMS with Dapper Mountain design system',
    },
  },
} as const
