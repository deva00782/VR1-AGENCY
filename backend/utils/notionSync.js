/**
 * VR1 — Optional Notion sync utility
 *
 * When NOTION_TOKEN and NOTION_INQUIRIES_DB_ID are set in .env,
 * new inquiries are synced to a Notion database as new pages.
 *
 * PostgreSQL is always the source of truth.
 * This runs AFTER the inquiry is saved. If it fails, only a warning is logged.
 *
 * Setup (v2):
 *  1. Create a Notion integration at https://www.notion.so/my-integrations
 *  2. Share your "Inquiries" Notion database with the integration
 *  3. Add NOTION_TOKEN and NOTION_INQUIRIES_DB_ID to .env
 *
 * The Notion database should have these properties:
 *  Name (title), Email (email), Business (text), Project Type (select),
 *  Budget (select), Status (select), Message (text), Source (select → "VR1 Website")
 */

async function syncInquiry(inquiry) {
  const token  = process.env.NOTION_TOKEN;
  const dbId   = process.env.NOTION_INQUIRIES_DB_ID;

  // Silently skip if not configured — this is an optional feature
  if (!token || !dbId) return;

  const body = {
    parent: { database_id: dbId },
    properties: {
      Name:          { title: [{ text: { content: inquiry.name || '' } }] },
      Email:         { email: inquiry.email || null },
      Business:      { rich_text: [{ text: { content: inquiry.business || '' } }] },
      'Project Type':{ select: inquiry.project_type ? { name: inquiry.project_type } : null },
      Budget:        { select: inquiry.budget ? { name: inquiry.budget } : null },
      Status:        { select: { name: 'NEW' } },
      Message:       { rich_text: [{ text: { content: (inquiry.message || '').slice(0, 2000) } }] },
      Source:        { select: { name: 'VR1 Website' } },
    },
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // Throw so the caller can catch + log (non-fatal)
    throw new Error(`Notion API ${res.status}: ${text.slice(0, 200)}`);
  }
}

module.exports = { syncInquiry };
