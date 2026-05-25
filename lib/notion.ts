const BASE = 'https://api.notion.com/v1'
const TOKEN = process.env.NOTION_TOKEN!
const DB_ID = process.env.NOTION_DATABASE_ID!

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

export async function queryDatabase(filter?: object, sorts?: object[]) {
  const res = await fetch(`${BASE}/databases/${DB_ID}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...(filter ? { filter } : {}),
      ...(sorts  ? { sorts }  : {}),
      page_size: 100,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Notion query failed: ${res.status}`)
  const data = await res.json()
  return data.results as any[]
}

export async function createPage(properties: object, children: object[]) {
  const res = await fetch(`${BASE}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      properties,
      children,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Notion page create failed')
  }
  return res.json()
}
