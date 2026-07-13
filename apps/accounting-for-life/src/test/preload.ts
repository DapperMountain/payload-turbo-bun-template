import { prepareEnvForConfig } from '../../config/app/helpers/prepare-env'

prepareEnvForConfig()

/** Unit-only runs skip Payload so access/config specs stay fast and DB-free. */
function isUnitTestRun() {
  const args = process.argv.join(' ')
  const unitPaths = ['src/access', 'config/app', 'src/utils']
  const integrationPaths = ['src/collections', 'src/test', '.integration.']
  return (
    unitPaths.some((p) => args.includes(p)) &&
    !integrationPaths.some((p) => args.includes(p))
  )
}

if (!isUnitTestRun()) {
  await import('./config')
}
