import { getHashedPublicUrl } from '../utils/hashed-public-url.js'

function ClientEntryScript({
  strategy = 'defer',
}: {
  strategy?: 'defer' | 'async'
}) {
  return (
    <script
      src={getHashedPublicUrl({ url: 'dist/client.entry.js' })}
      {...{ [strategy]: true }}
    />
  )
}

export { ClientEntryScript }
