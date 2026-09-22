import { connectAsync } from '../app/lib/db/mongoose'

async function main() {
  const conn = await connectAsync()
  const dbName = conn.connection.db?.databaseName
  console.log(`[check-mongo] Connected to MongoDB Atlas, database: ${dbName}`)
  await conn.disconnect()
}

main().catch((err) => {
  console.error('[check-mongo] Failed to connect:', err)
  process.exit(1)
})
