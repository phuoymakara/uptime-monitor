import { db, sqlite } from '../../db/index'
import { monitors, heartbeats } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { calcUptimeStatsBatch } from '../../utils/heartbeats'

function escHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(d: Date | number | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtUptime(n: number | null | undefined) {
  if (n == null) return '<span class="muted">—</span>'
  const cls = n >= 99 ? 'uptime-great' : n >= 95 ? 'uptime-ok' : 'uptime-bad'
  return `<span class="${cls}">${n}%</span>`
}

function statusBadge(status: string | undefined) {
  if (status === 'up')      return `<span class="badge badge-up">● UP</span>`
  if (status === 'down')    return `<span class="badge badge-down">● DOWN</span>`
  return `<span class="badge badge-pending">● PENDING</span>`
}

function uptimeDot(n: number | null | undefined) {
  if (n == null) return ''
  const cls = n >= 99 ? 'dot-great' : n >= 95 ? 'dot-ok' : 'dot-bad'
  return `<span class="uptime-dot ${cls}"></span>`
}

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.id

  const allMonitors = db.select().from(monitors).where(eq(monitors.userId, userId)).all()
  const monitorIds  = allMonitors.map(m => m.id)

  const uptimeMap = monitorIds.length ? calcUptimeStatsBatch(monitorIds) : {}

  // Last heartbeat per monitor
  const latestMap: Record<number, { status: string; responseTimeMs: number | null; checkedAt: any }> = {}
  for (const id of monitorIds) {
    const row = db.select().from(heartbeats)
      .where(eq(heartbeats.monitorId, id))
      .orderBy(desc(heartbeats.checkedAt))
      .limit(1).get()
    if (row) latestMap[id] = row as any
  }

  // Avg response time per monitor (last 100 up heartbeats)
  const avgMap: Record<number, number | null> = {}
  for (const id of monitorIds) {
    const row = sqlite.prepare(`
      SELECT ROUND(AVG(response_time_ms)) as avg
      FROM (SELECT response_time_ms FROM heartbeats WHERE monitor_id = ? AND status = 'up' ORDER BY checked_at DESC LIMIT 100)
    `).get(id) as { avg: number | null } | undefined
    avgMap[id] = row?.avg ?? null
  }

  // Recent activity — last 60 heartbeats across all monitors
  const recentActivity = monitorIds.length ? sqlite.prepare(`
    SELECT h.status, h.response_time_ms, h.checked_at, h.message, m.name as monitor_name
    FROM heartbeats h
    JOIN monitors m ON m.id = h.monitor_id
    WHERE h.monitor_id IN (${monitorIds.map(() => '?').join(',')})
    ORDER BY h.checked_at DESC
    LIMIT 60
  `).all(...monitorIds) as Array<{
    status: string; response_time_ms: number | null
    checked_at: number | null; message: string | null; monitor_name: string
  }> : []

  const upCount      = allMonitors.filter(m => latestMap[m.id]?.status === 'up').length
  const downCount    = allMonitors.filter(m => latestMap[m.id]?.status === 'down').length
  const pendingCount = allMonitors.length - upCount - downCount
  const generatedAt  = fmtDate(new Date())

  // Uptime sparkline (last 30 heartbeats per monitor — simplified as colored blocks)
  const sparkMap: Record<number, string[]> = {}
  if (monitorIds.length) {
    const sparkRows = sqlite.prepare(`
      SELECT monitor_id, status FROM (
        SELECT monitor_id, status, ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) as rn
        FROM heartbeats WHERE monitor_id IN (${monitorIds.map(() => '?').join(',')})
      ) WHERE rn <= 30
      ORDER BY monitor_id, rn DESC
    `).all(...monitorIds) as Array<{ monitor_id: number; status: string }>
    for (const id of monitorIds) sparkMap[id] = []
    for (const r of sparkRows) sparkMap[r.monitor_id].push(r.status)
  }

  function renderSparkline(id: number) {
    const bars = sparkMap[id] ?? []
    if (!bars.length) return '<span class="muted" style="font-size:10px">no data</span>'
    return bars.map(s => {
      const c = s === 'up' ? '#3ba55c' : s === 'down' ? '#ed4245' : '#faa81a'
      return `<span style="display:inline-block;width:5px;height:18px;border-radius:2px;background:${c};margin-right:1px;vertical-align:middle"></span>`
    }).join('')
  }

  const monitorRows = allMonitors.map((m, i) => {
    const latest = latestMap[m.id]
    const up     = uptimeMap[m.id] ?? {}
    const avg    = avgMap[m.id]
    return `
    <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
      <td>
        <div class="monitor-name">${escHtml(m.name)}</div>
        <div class="monitor-url">${escHtml(m.url)}</div>
      </td>
      <td class="center">${m.type.toUpperCase()}</td>
      <td class="center">${statusBadge(latest?.status)}</td>
      <td class="center sparkline-cell">${renderSparkline(m.id)}</td>
      <td class="center">${fmtUptime(up.uptime24h)}</td>
      <td class="center">${fmtUptime(up.uptime7d)}</td>
      <td class="center">${fmtUptime(up.uptime30d)}</td>
      <td class="center">${avg != null ? `<span class="resp-time">${Math.round(avg)} ms</span>` : '<span class="muted">—</span>'}</td>
      <td class="center">${m.intervalSeconds}s</td>
    </tr>`
  }).join('')

  const activityRows = recentActivity.map((h, i) => {
    const ts = h.checked_at != null ? fmtDate(new Date(h.checked_at * 1000)) : '—'
    return `
    <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
      <td><span class="activity-name">${escHtml(h.monitor_name)}</span></td>
      <td class="center">${statusBadge(h.status)}</td>
      <td class="center">${h.response_time_ms != null ? `<span class="resp-time">${h.response_time_ms} ms</span>` : '<span class="muted">—</span>'}</td>
      <td class="ts">${ts}</td>
      <td class="msg">${escHtml(h.message ?? '—')}</td>
    </tr>`
  }).join('')

  // ── Inline SVG activity icon (matches app logo) ──────────────────────────
  const activitySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Uptime Monitor — Report</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Design tokens — dark theme matching the app ── */
    :root {
      --bg:        hsl(222,47%,11%);
      --bg-card:   hsl(222,47%,13%);
      --bg-alt:    hsl(222,47%,14.5%);
      --bg-header: hsl(222,47%,9%);
      --primary:   hsl(210,40%,60%);
      --primary-dim: hsl(210,40%,30%);
      --fg:        hsl(213,31%,91%);
      --fg-muted:  hsl(215,16%,55%);
      --border:    hsl(216,34%,22%);
      --up:        #3ba55c;
      --up-bg:     rgba(59,165,92,.15);
      --down:      #ed4245;
      --down-bg:   rgba(237,66,69,.15);
      --pending:   #faa81a;
      --pending-bg:rgba(250,168,26,.15);
      --radius:    8px;
    }

    /* ── Base ── */
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      padding: 0;
    }

    /* ── Top bar ── */
    .topbar {
      background: var(--bg-header);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .topbar-icon {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: hsla(210,40%,60%,.15);
      display: flex; align-items: center; justify-content: center;
      color: var(--primary);
    }
    .topbar-title { font-size: 14px; font-weight: 700; color: var(--fg); }
    .topbar-sub   { font-size: 11px; color: var(--fg-muted); }
    .topbar-actions { display: flex; gap: 8px; }
    .btn {
      padding: 6px 14px; border-radius: 6px; border: none;
      cursor: pointer; font-size: 12px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 6px;
      transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-primary { background: var(--primary); color: hsl(222,47%,11%); }
    .btn-ghost   { background: var(--border); color: var(--fg); }

    /* ── Main content ── */
    .content { padding: 28px 32px 48px; max-width: 1100px; margin: 0 auto; }

    /* ── Page header ── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px;
    }
    .page-header-left h1 { font-size: 20px; font-weight: 700; color: var(--fg); }
    .page-header-left p  { font-size: 12px; color: var(--fg-muted); margin-top: 2px; }
    .meta-chip {
      font-size: 11px; color: var(--fg-muted);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
    }

    /* ── Summary cards ── */
    .cards { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 18px;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
    }
    .card-total::before  { background: var(--primary); }
    .card-up::before     { background: var(--up); }
    .card-down::before   { background: var(--down); }
    .card-pending::before{ background: var(--pending); }
    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--fg-muted); }
    .card-value { font-size: 32px; font-weight: 800; margin-top: 6px; letter-spacing: -1px; }
    .card-total  .card-value { color: var(--primary); }
    .card-up     .card-value { color: var(--up); }
    .card-down   .card-value { color: var(--down); }
    .card-pending .card-value{ color: var(--pending); }
    .card-sub { font-size: 10px; color: var(--fg-muted); margin-top: 4px; }

    /* ── Section ── */
    .section { margin-bottom: 32px; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: var(--fg-muted);
      display: flex; align-items: center; gap: 6px;
    }
    .section-title::before {
      content: ''; display: inline-block;
      width: 3px; height: 14px; border-radius: 2px;
      background: var(--primary);
    }
    .section-count {
      font-size: 11px; color: var(--fg-muted);
      background: var(--border);
      border-radius: 20px; padding: 2px 8px;
    }

    /* ── Table ── */
    .table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: var(--bg-header); }
    th {
      padding: 10px 12px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .05em;
      color: var(--fg-muted);
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .row-alt td { background: var(--bg-alt); }
    .center { text-align: center; }

    /* Monitor name/url */
    .monitor-name { font-weight: 600; color: var(--fg); font-size: 13px; }
    .monitor-url  { font-size: 10px; color: var(--fg-muted); font-family: 'Consolas','Courier New',monospace; margin-top: 1px; word-break: break-all; }
    .activity-name { font-weight: 500; color: var(--fg); }

    /* Status badge */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: 999px;
      font-size: 10px; font-weight: 700; letter-spacing: .04em;
      white-space: nowrap;
    }
    .badge-up      { background: var(--up-bg);      color: var(--up);      border: 1px solid rgba(59,165,92,.3); }
    .badge-down    { background: var(--down-bg);    color: var(--down);    border: 1px solid rgba(237,66,69,.3); }
    .badge-pending { background: var(--pending-bg); color: var(--pending); border: 1px solid rgba(250,168,26,.3); }

    /* Uptime % */
    .uptime-great { color: var(--up);      font-weight: 700; font-size: 12px; }
    .uptime-ok    { color: var(--pending); font-weight: 700; font-size: 12px; }
    .uptime-bad   { color: var(--down);    font-weight: 700; font-size: 12px; }
    .muted        { color: var(--fg-muted); }

    /* Response time */
    .resp-time { color: var(--primary); font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums; }

    /* Sparkline */
    .sparkline-cell { min-width: 110px; }

    /* Timestamp / message */
    .ts  { font-size: 11px; color: var(--fg-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .msg { font-size: 11px; color: var(--fg-muted); max-width: 200px; word-break: break-word; }

    /* Empty state */
    .empty { padding: 32px; text-align: center; color: var(--fg-muted); font-size: 12px; }

    /* Footer */
    .footer {
      border-top: 1px solid var(--border);
      padding: 16px 32px;
      font-size: 10px; color: var(--fg-muted);
      text-align: center;
      background: var(--bg-header);
    }

    /* ── Print / PDF mode ── */
    @media print {
      :root {
        --bg:        #ffffff;
        --bg-card:   #f9fafb;
        --bg-alt:    #f3f4f6;
        --bg-header: #f1f5f9;
        --primary:   #3b82f6;
        --fg:        #111827;
        --fg-muted:  #6b7280;
        --border:    #e5e7eb;
        --up:        #16a34a;
        --up-bg:     #dcfce7;
        --down:      #dc2626;
        --down-bg:   #fee2e2;
        --pending:   #d97706;
        --pending-bg:#fef3c7;
      }
      body { background: #fff; color: #111; }
      .topbar, .topbar-actions { display: none !important; }
      .content { padding: 0; max-width: 100%; }
      .page-header { padding: 16px 0 8px; }
      .cards { page-break-inside: avoid; }
      .table-wrap { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      .footer { display: none; }
    }
  </style>
</head>
<body>

  <!-- Top bar -->
  <div class="topbar">
    <div class="topbar-brand">
      <div class="topbar-icon">${activitySvg}</div>
      <div>
        <div class="topbar-title">Uptime Monitor</div>
        <div class="topbar-sub">System Report</div>
      </div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-ghost" onclick="window.close()">✕ Close</button>
      <button class="btn btn-primary" onclick="window.print()">⬇ Save as PDF</button>
    </div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1>Health &amp; Availability Report</h1>
        <p>A snapshot of all monitors and their recent activity</p>
      </div>
      <div class="meta-chip">Generated: ${generatedAt}</div>
    </div>

    <!-- Summary cards -->
    <div class="cards">
      <div class="card card-total">
        <div class="card-label">Total Monitors</div>
        <div class="card-value">${allMonitors.length}</div>
        <div class="card-sub">across all types</div>
      </div>
      <div class="card card-up">
        <div class="card-label">Operational</div>
        <div class="card-value">${upCount}</div>
        <div class="card-sub">responding normally</div>
      </div>
      <div class="card card-down">
        <div class="card-label">Down</div>
        <div class="card-value">${downCount}</div>
        <div class="card-sub">not responding</div>
      </div>
      <div class="card card-pending">
        <div class="card-label">Pending</div>
        <div class="card-value">${pendingCount}</div>
        <div class="card-sub">awaiting first check</div>
      </div>
    </div>

    <!-- Monitors table -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">Monitor Details</div>
        <div class="section-count">${allMonitors.length} monitors</div>
      </div>
      <div class="table-wrap">
        ${allMonitors.length === 0
          ? `<div class="empty">No monitors configured yet.</div>`
          : `<table>
              <thead>
                <tr>
                  <th>Name &amp; URL</th>
                  <th class="center">Type</th>
                  <th class="center">Status</th>
                  <th class="center">Last 30 Checks</th>
                  <th class="center">Uptime 24h</th>
                  <th class="center">Uptime 7d</th>
                  <th class="center">Uptime 30d</th>
                  <th class="center">Avg Response</th>
                  <th class="center">Interval</th>
                </tr>
              </thead>
              <tbody>${monitorRows}</tbody>
            </table>`
        }
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">Recent Activity</div>
        <div class="section-count">last ${recentActivity.length} checks</div>
      </div>
      <div class="table-wrap">
        ${recentActivity.length === 0
          ? `<div class="empty">No heartbeats recorded yet.</div>`
          : `<table>
              <thead>
                <tr>
                  <th>Monitor</th>
                  <th class="center">Result</th>
                  <th class="center">Response Time</th>
                  <th>Checked At</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>${activityRows}</tbody>
            </table>`
        }
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    Uptime Monitor &nbsp;·&nbsp; Report generated ${generatedAt} &nbsp;·&nbsp; All times in local timezone
  </div>

</body>
</html>`

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return html
})
