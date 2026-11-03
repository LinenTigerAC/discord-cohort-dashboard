// Toggle for collapsible sections (Year in Review, Membership Churn) --
// defined at top level (not inside initDashboard) so the inline onclick
// handlers work immediately, independent of data-loading timing.
window.toggleSection = function(bodyId, headEl){
  const body = document.getElementById(bodyId);
  const icon = headEl.querySelector('.collapse-icon');
  const isHidden = body.style.display !== 'block';
  body.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.textContent = isHidden ? '▾ collapse' : '▸ expand';
  if (isHidden) {
    // charts initialized while this container was display:none often need a manual
    // resize the first time they become visible, since Chart.js measured a 0x0 box.
    body.querySelectorAll('canvas').forEach(canvas => {
      const chart = Chart.getChart(canvas);
      if (chart) chart.resize();
    });
  }
};

async function initDashboard(){
  let DATA;
  try {
    const res = await fetch('./data.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
  } catch (err) {
    document.querySelector('.wrap').innerHTML =
      '<div style="padding:60px 0;text-align:center;color:var(--ink-dim);font-family:var(--mono);">' +
      'Could not load data.json (' + err.message + '). Make sure it sits next to this page.</div>';
    return;
  }

const weeks = DATA.meta.weeks;
const weekLabels = DATA.meta.week_labels;
const overall = DATA.overall;
const cohorts = DATA.cohorts;
const tierDist = DATA.animal_tier_distribution;
const tierNames = DATA.animal_tier_names;
const newRet = DATA.new_vs_returning;
const levelLaunch = DATA.level_launch_tracking;

const COLORS = {
  amber: '#E8A24C', amberDim:'#8A6A3E', moss:'#7FBF8F', rust:'#D9705C',
  violet:'#A091D9', ink:'#EDE7D9', inkDim:'#9BA8A6', inkFaint:'#66746F', line:'#2A363D'
};

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = COLORS.inkDim;
Chart.defaults.borderColor = COLORS.line;

const ANIMAL_COLS = ['Gorilla LVL 1','Cat LVL 2','Mole LVL 3','Racoon LVL 4','Bunny LVL 5','Frog LVL 6','Turkey LVL 10','Bat LVL 15','Deer LVL 20','Tiger LVL 30','Capybara LVL 40','Chameleon LVL 50','Duck LVL 60','Rat LVL 70','Crow LVL 80','T-Rex LVL 90'];
const ANIMAL_EMOJI = {'Gorilla LVL 1':'🦍','Cat LVL 2':'🐱','Mole LVL 3':'🦔','Racoon LVL 4':'🦝','Bunny LVL 5':'🐰','Frog LVL 6':'🐸','Turkey LVL 10':'🦃','Bat LVL 15':'🦇','Deer LVL 20':'🦌','Tiger LVL 30':'🐯','Capybara LVL 40':'🦫','Chameleon LVL 50':'🦎','Duck LVL 60':'🦆','Rat LVL 70':'🐀','Crow LVL 80':'🐦‍⬛','T-Rex LVL 90':'🦖'};
const GRID_COHORTS = ['7-Day Streak','14-Day Streak','Creator','Creator Bean','Creator Bronze','Creator Silver','Creator Gold','Creator Galaxy','Creator Mythic','Verified','Alpha Crew'];

const fmt = n => n.toLocaleString('en-US');
const fmt1 = n => (Math.round(n*10)/10).toLocaleString('en-US');
const pctPoint = n => (n>0?'+':'') + n.toFixed(2) + 'pt';
const pctSigned = n => (n>0?'+':'') + n.toFixed(1) + '%';

// ---------- Masthead & stat strip ----------
document.getElementById('masthead-meta').innerHTML =
  `<b>${weekLabels[0]} &rarr; ${weekLabels[weekLabels.length-1]}</b><br>${weeks.length} weekly snapshots`;

const firstW = overall[0], lastW = overall[overall.length-1];
const peakActive = overall.reduce((a,b)=>b.active_users>a.active_users?b:a);
const activeChange = lastW.active_users - firstW.active_users;
const activeChangePct = (activeChange/firstW.active_users*100);
const medianMsgChange = lastW.median_messages - firstW.median_messages;

const statStripHtml = `
  <div class="stat">
    <div class="label">Unique members observed</div>
    <div class="value">${fmt(DATA.meta.unique_users)}</div>
    <div class="sub">across ${weeks.length} weeks</div>
  </div>
  <div class="stat">
    <div class="label">Active members, latest week</div>
    <div class="value">${fmt(lastW.active_users)}</div>
    <div class="sub ${activeChange>=0?'up':'down'}">${activeChange>=0?'&uarr;':'&darr;'} ${fmt(Math.abs(activeChange))} vs. week 1 (${pctSigned(activeChangePct)})</div>
  </div>
  <div class="stat">
    <div class="label">Messages logged, latest week</div>
    <div class="value">${fmt(lastW.total_messages)}</div>
    <div class="sub">peak week: ${fmt(peakActive.active_users)} active (${weekLabels[overall.indexOf(peakActive)]})</div>
  </div>
  <div class="stat">
    <div class="label">Median messages / active member</div>
    <div class="value">${fmt1(lastW.median_messages)}</div>
    <div class="sub ${medianMsgChange>=0?'up':'down'}">${medianMsgChange>=0?'&uarr;':'&darr;'} ${fmt1(Math.abs(medianMsgChange))} vs. week 1</div>
  </div>
`;
const _oldStatStrip = document.getElementById('stat-strip');
if (_oldStatStrip) _oldStatStrip.innerHTML = statStripHtml;   // replaced by the KPI Overview section below

// ---------- KPI Overview (top of page) ----------
function renderKpiOverview(){
  const body = document.getElementById('kpi-overview-body');
  const k = DATA.kpis;
  if (!body || !k) return;
  const A = k.activity, M = k.members, AC = k.alpha_crew, L = k.ladder;
  const sd = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'});
  const sdY = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
  const has = (v) => v !== null && v !== undefined;
  const sgn = (v) => !has(v) ? '' : (v >= 0 ? 'up' : 'down');
  const ps = (v) => has(v) ? pctSigned(v) : '—';
  const pts = (a, b) => (has(a) && has(b)) ? ((a-b>=0?'+':'') + (a-b).toFixed(1) + ' pts') : '—';
  const tile = (label, value, sub, cls) => `
    <div class="stat">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub ${cls||''}">${sub}</div>
    </div>`;
  const group = (title, tilesHtml, readHtml) => `
    <h3 class="launch-sub-head">${title}</h3>
    <div class="stat-strip" style="margin-bottom:12px;">${tilesHtml}</div>
    <div class="section-desc" style="margin:0 0 28px;">${readHtml}</div>`;

  let html = `<div class="section-desc" style="margin-top:0;">Latest week: <b>${sdY(k.as_of_week)}</b>. Year over year compares each week to the same week a year earlier.</div>`;

  // --- Group 1: size vs activity ---
  const memberTile = M
    ? tile(M.source === 'members_chart' ? 'Members' : 'Members (est.)', fmt(M.value), `${has(M.yoy_pct) ? ps(M.yoy_pct)+' YoY &middot; ' : ''}as of ${sd(M.as_of)}`, sgn(M.yoy_pct))
    : tile('Members (est.)', '—', 'no membership data loaded', '');
  const t1 = memberTile
    + tile('Weekly chatters', fmt(A.chatters), `${ps(A.chatters_yoy_pct)} YoY &middot; 4-wk ${ps(A.chatters_4wk_yoy_pct)}`, sgn(A.chatters_yoy_pct))
    + tile('Weekly messages', fmt(A.messages), `${ps(A.messages_yoy_pct)} YoY &middot; 4-wk ${ps(A.messages_4wk_yoy_pct)}`, sgn(A.messages_yoy_pct))
    + tile('Messages per chatter', has(A.msgs_per_chatter) ? fmt1(A.msgs_per_chatter) : '—', `${ps(A.msgs_per_chatter_yoy_pct)} YoY &middot; median ${has(A.median) ? fmt1(A.median) : '—'}`, sgn(A.msgs_per_chatter_yoy_pct));
  let read1 = '';
  if (has(A.chatters_prior_year) && has(A.msgs_per_chatter_prior_year)) {
    read1 += `A year ago this week had <b>${fmt(A.chatters_prior_year)}</b> chatters sending <b>${fmt1(A.msgs_per_chatter_prior_year)}</b> messages each; now it's <b>${fmt(A.chatters)}</b> sending <b>${fmt1(A.msgs_per_chatter)}</b>. `;
  }
  if (has(A.median) && has(A.median_prior_year)) {
    read1 += (A.median === A.median_prior_year)
      ? `The typical (median) chatter is unchanged at ${fmt1(A.median)} messages a week, so the extra volume comes from your heaviest posters, not broader participation. `
      : `The typical (median) chatter moved from ${fmt1(A.median_prior_year)} to ${fmt1(A.median)} messages a week. `;
  }
  if (M && has(M.yoy_pct)) {
    read1 += `Membership is <b>${ps(M.yoy_pct)}</b> YoY as of ${sd(M.as_of)}${has(M.same_date_chatters_yoy_pct) && has(M.same_date_messages_yoy_pct) ? `; over the 4 weeks to then, chatters were ${ps(M.same_date_chatters_yoy_pct)} and messages ${ps(M.same_date_messages_yoy_pct)}` : ''}. `;
    if (has(M.decline_streak_weeks) && M.decline_streak_weeks >= 2) {
      read1 += `<b>Membership has slipped ${M.decline_streak_weeks} weeks in a row</b>: ${fmt(Math.abs(M.since_peak))} below its ${sd(M.peak_week)} peak of ${fmt(M.peak_value)}${has(M.net_last_week) && M.net_last_week < 0 ? `, with ${fmt(Math.abs(M.net_last_week))} fewer last week` : ''}. `;
    }
    if (M.weeks_behind >= 2) {
      read1 += `<b>Membership data is ${M.weeks_behind} weeks behind</b> (it ends ${sd(M.as_of)}); load a newer members export (Discord Insights, Members) to bring it current.`;
    }
  }
  html += group('Size vs. activity', t1, read1);

  // --- Group 2: Alpha Crew ---
  if (AC) {
    const t2 = tile('Alpha Crew chatting', fmt(AC.chatters), `${ps(AC.chatters_yoy_pct)} YoY${has(AC.chatters_prior_year) ? ' ('+fmt(AC.chatters_prior_year)+' last yr)' : ''}`, sgn(AC.chatters_yoy_pct))
      + tile('Their messages', fmt(AC.messages), `${ps(AC.messages_yoy_pct)} YoY`, sgn(AC.messages_yoy_pct))
      + tile('Share of all messages', AC.share_of_messages_pct + '%', `4-wk avg ${AC.share_4wk_pct}%${has(AC.share_prior_year_pct) ? ' &middot; '+AC.share_prior_year_pct+'% a year ago' : ''}`, has(AC.share_prior_year_pct) ? sgn(AC.share_of_messages_pct - AC.share_prior_year_pct) : '')
      + tile('Median msgs / member', fmt(AC.median_member), `vs. ${fmt(AC.median_everyone_else)} for everyone else`, '');
    const chatShare = A.chatters ? (100 * AC.chatters / A.chatters).toFixed(1) : null;
    const read2 = `${chatShare ? `Alpha Crew is <b>${chatShare}%</b> of this week's chatters but <b>${AC.share_of_messages_pct}%</b> of its messages. ` : ''}`
      + `<b>${fmt(AC.role_holders_seen)}</b> people have been seen with the role in Statbot (${fmt(AC.role_holders_active_8wk)} chatted in the last 8 weeks). That's a floor: Statbot only lists people in weeks they chat, so role holders who never chat don't appear, and Discord's own role count may be higher.`;
    html += group('Alpha Crew', t2, read2);
  }

  // --- Group 3: level ladder + hoodies ---
  if (L) {
    const H = L.hoodie;
    const t3 = tile('Messages from ladder members', has(L.share_of_messages_pct) ? L.share_of_messages_pct + '%' : '—',
                    `${has(L.share_of_chatters_pct) ? L.share_of_chatters_pct+'% of chatters &middot; ' : ''}${pts(L.share_of_messages_pct, L.share_of_messages_prior_year_pct)} YoY`,
                    has(L.share_of_messages_prior_year_pct) ? sgn(L.share_of_messages_pct - L.share_of_messages_prior_year_pct) : '')
      + (H ? [['Gorilla LVL 1 new / wk', H.gorilla], ['Frog LVL 6 new / wk', H.frog], ['Turkey LVL 10 new / wk', H.turkey]].map(([lbl, g]) =>
          tile(lbl, fmt1(g.post_avg), `${ps(g.change_pct)} vs. ${fmt1(g.pre_avg)} before launch`, sgn(g.change_pct))).join('') : '');
    let read3 = `"Ladder members" = anyone holding a Gorilla LVL 1 or higher role. `;
    if (H) {
      const ldate = (DATA.level_launch_tracking && DATA.level_launch_tracking.launch_date) ? sd(DATA.level_launch_tracking.launch_date) : 'launch';
      read3 += `Hoodie levels launched ${ldate}. The tiles compare the ${H.post_weeks} post-launch week${H.post_weeks===1?'':'s'} (average new achievers per week) with the ${H.pre_weeks} weeks before it. The launch week itself had Gorilla ${fmt(H.gorilla.launch_week)}, Frog ${fmt(H.frog.launch_week)}, Turkey ${fmt(H.turkey.launch_week)} new. `
        + (H.post_weeks < 8 ? `That is too few weeks to call, and overall chat is falling this fall, which makes a lift harder to see, so read it as an early signal. ` : '')
        + `Conversion detail is in Launch Metrics below.`;
    }
    html += group('Level ladder &amp; hoodies — is it working?', t3, read3);
  }

  body.innerHTML = html;
}
renderKpiOverview();

document.getElementById('foot-rows').textContent = fmt(DATA.meta.total_rows);
document.getElementById('foot-users').textContent = fmt(DATA.meta.unique_users);

// ---------- YoY hero section ----------
const yoyData = DATA.yoy;
const ns = yoyData.narrative_stats;

document.getElementById('yoy-narrative-callouts').innerHTML = `
  <div class="note-card">
    <span class="note-tag risk">${ns.pre.label}</span>
    <div class="note-body">Averaged <b>${fmt(ns.pre.mean_active)}</b> active members/week, but swung wildly — from a peak of <b>${fmt(ns.pre.peak)}</b> down to just <b>${fmt(ns.pre.trough)}</b> (a ${ns.pre.peak_to_trough_pct}% peak-to-trough collapse). Overall trend across the period: <b style="color:var(--rust)">declining</b> (${ns.pre.net_change_pct}% net change, start to end). Classic viral-burst-then-bleed-out pattern.</div>
  </div>
  <div class="note-card">
    <span class="note-tag opp">${ns.post.label}</span>
    <div class="note-body">Averaged <b>${fmt(ns.post.mean_active)}</b> active members/week, with volatility roughly <b>half</b> the prior period (${ns.post.cv_pct}% vs ${ns.pre.cv_pct}% coefficient of variation). Overall trend: <b style="color:var(--moss)">growing</b> at about ${ns.post.trend_per_week.toFixed(0)} members/week on average — a net <b>+${ns.post.net_change_pct}%</b> from the start of this period to now. Steadier and climbing, instead of spiking and crashing.</div>
  </div>
`;

const boundaryDate = ns.cutoff_date;
const fh = yoyData.full_history;
const boundaryFhIdx = fh.findIndex(w => w.week === boundaryDate);

const yoyBoundaryPlugin = {
  id: 'yoyBoundary',
  afterDraw(chart){
    if (boundaryFhIdx < 0) return;
    const xScale = chart.scales.x;
    const x = xScale.getPixelForValue(boundaryFhIdx);
    const {top, bottom} = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = COLORS.moss;
    ctx.setLineDash([5,4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.moss;
    ctx.font = "10px 'JetBrains Mono'";
    ctx.fillText('New community management begins', x+5, top+11);
    ctx.restore();
  }
};

// Event markers: map each curated event to its nearest week index in fh, for overlay.
// IMPORTANT: built as a parallel array the same length as fh (one slot per category-axis
// tick), not as {x,y} scatter points -- mixing a numeric-x scatter dataset with a
// category-axis line chart caused events to render shifted to the wrong year entirely.
const events = DATA.events || [];
const EVENT_COLORS = {
  program_launch: COLORS.moss,
  feature_launch: COLORS.violet,
  milestone: COLORS.amber,
  application_cycle: COLORS.inkDim,
  game_update: COLORS.inkFaint,
  leadership: COLORS.rust,
  incident: COLORS.rust,
  community_event: COLORS.amber
};
const fhDates = fh.map(w => new Date(w.week).getTime());
function nearestFhIndex(dateStr){
  const t = new Date(dateStr).getTime();
  let best = 0, bestDiff = Infinity;
  fhDates.forEach((d,i)=>{ const diff = Math.abs(d-t); if (diff<bestDiff){bestDiff=diff; best=i;} });
  // only place a marker if within ~4 days of an actual week start, else event predates chart range
  return bestDiff <= 4*86400000 ? best : null;
}
const eventsByIndex = {};
events.forEach(e => {
  const idx = nearestFhIndex(e.date);
  if (idx === null) return;
  if (!eventsByIndex[idx]) eventsByIndex[idx] = [];
  eventsByIndex[idx].push(e);
});
const eventMarkerData = fh.map((w,i) => eventsByIndex[i] ? 0.5 : null);
const eventMarkerColors = fh.map((w,i) => {
  const evs = eventsByIndex[i];
  if (!evs) return 'transparent';
  return EVENT_COLORS[evs[0].category] || COLORS.inkDim;
});

new Chart(document.getElementById('yoyFullHistoryChart'), {
  type:'line',
  plugins: [yoyBoundaryPlugin],
  data:{
    labels: fh.map(w=>w.week_label),
    datasets:[
      {
        label:'Active members/week',
        data: fh.map(w=>w.active_users),
        borderColor: COLORS.amber,
        backgroundColor: 'rgba(232,162,76,0.06)',
        fill: true, tension:0.25, borderWidth:2,
        pointRadius: fh.map(w => (w.is_corrected || w.is_data_loss) ? 3 : 0),
        pointBackgroundColor: fh.map(w => w.is_data_loss ? COLORS.inkFaint : (w.is_corrected ? COLORS.violet : COLORS.amber)),
        yAxisID: 'y'
      },
      {
        label:'Events',
        type:'line',
        data: eventMarkerData,
        showLine: false,
        pointRadius: eventMarkerData.map(v => v===null ? 0 : 4),
        pointHoverRadius: eventMarkerData.map(v => v===null ? 0 : 6),
        pointBackgroundColor: eventMarkerColors,
        pointBorderColor: 'transparent',
        yAxisID: 'yEvents'
      }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{ callbacks:{
        label: (ctx) => {
          if (ctx.datasetIndex === 1) {
            const evs = eventsByIndex[ctx.dataIndex] || [];
            return evs.map(e => `${e.date_label}: ${e.title}`);
          }
          return `Active members: ${fmt(ctx.parsed.y)}`;
        },
        afterLabel: (ctx)=>{
          if (ctx.datasetIndex === 1) return '';
          const w = fh[ctx.dataIndex];
          if (w.is_data_loss) return '† Statbot outage — real number was higher';
          if (w.is_corrected) return '* Export cap corrected to true value';
          return '';
        }
      }}
    },
    scales:{
      x:{ grid:{display:false}, ticks:{maxTicksLimit:12} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'active members'} },
      yEvents:{ display:false, min:0, max:1 }
    }
  }
});

// YoY comparison table -- most recent 10 matched weeks, to keep it readable
const recentPairs = yoyData.yoy_pairs.slice(-10);
const yoyTable = document.getElementById('yoy-comparison-table');
yoyTable.innerHTML = `
  <tr>
    <th class="row-head" style="text-align:left;">Week</th>
    <th>Active, this year</th>
    <th>Active, last year</th>
    <th>Active change</th>
    <th>Messages, this year</th>
    <th>Messages, last year</th>
    <th>Messages change</th>
  </tr>
  ${recentPairs.map(p => `
    <tr>
      <td style="text-align:left;color:var(--ink);">${p.current_week_label}${p.current_is_data_loss?' †':''}</td>
      <td>${fmt(p.current_active)}</td>
      <td>${fmt(p.prior_active)}${p.prior_is_corrected?' *':''}</td>
      <td style="color:${p.pct_change_active>=0?'var(--moss)':'var(--rust)'};font-weight:600;">${p.pct_change_active>=0?'+':''}${p.pct_change_active}%</td>
      <td>${fmt(p.current_messages)}</td>
      <td>${fmt(p.prior_messages)}${p.prior_is_corrected?' *':''}</td>
      <td style="color:${p.pct_change_messages>=0?'var(--moss)':'var(--rust)'};font-weight:600;">${p.pct_change_messages>=0?'+':''}${p.pct_change_messages}%</td>
    </tr>
  `).join('')}
`;

// Ladder YoY -- total population across all tiers, full history
const ladderCols = yoyData.ladder_cols;
const ladderHist = yoyData.ladder_history;
new Chart(document.getElementById('yoyLadderChart'), {
  type:'line',
  data:{
    labels: fh.map(w=>w.week_label),
    datasets:[{
      label:'Total members across all ladder tiers',
      data: ladderHist.map(w => ladderCols.reduce((sum,c)=>sum+w[c],0)),
      borderColor: COLORS.violet, backgroundColor:'rgba(160,145,217,0.08)',
      fill:true, tension:0.25, borderWidth:2, pointRadius:0
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{display:false}, ticks:{maxTicksLimit:12} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'members holding a ladder tier'} }
    }
  }
});

// ---------- Membership churn (Discord's own join/leave ledger) ----------
const churn = DATA.membership_churn;
if (!churn) {
  const churnSection = document.getElementById('churn-section');
  if (churnSection) churnSection.style.display = 'none';
} else {
const churnWeekly = churn.weekly;
const churnPre = churn.pre, churnPost = churn.post;

document.getElementById('churn-callouts').innerHTML = `
  <div class="note-card">
    <span class="note-tag risk">Joins collapsed — this part is real</span>
    <div class="note-body">Average weekly joins fell from <b>${fmt(churnPre.avg_joins)}</b> pre-November to <b>${fmt(churnPost.avg_joins)}</b> after &mdash; less than half. Whatever drove the original viral wave hasn't come back. This is a genuine, separate problem from retention, not something this section explains away.</div>
  </div>
  <div class="note-card">
    <span class="note-tag opp">Churn rate nearly halved</span>
    <div class="note-body">Leaves as a share of the whole standing membership dropped from <b>${churnPre.avg_churn_rate_pct}%</b>/week pre-November to <b>${churnPost.avg_churn_rate_pct}%</b>/week after &mdash; independent confirmation, from Discord's own membership data, that people who are here now are leaving at a meaningfully lower rate.</div>
  </div>
  <div class="note-card">
    <span class="note-tag watch">One honest caveat</span>
    <div class="note-body">Some of the pre-November churn was likely always going to happen &mdash; a chunk of those joiners arrived during the viral spike and were low-intent, drive-by joins that tend to leave quickly regardless of community management. The improvement is real, but "better community management" and "the joiner mix naturally shifted" are both plausible contributors.</div>
  </div>
`;

new Chart(document.getElementById('churnJoinsLeavesChart'), {
  type:'bar',
  data:{
    labels: churnWeekly.map(w=>w.week_label),
    datasets:[
      { label:'Joins', data: churnWeekly.map(w=>w.joins), backgroundColor: COLORS.moss },
      { label:'Leaves', data: churnWeekly.map(w=>-w.leaves), backgroundColor: COLORS.rust }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}},
      tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${fmt(Math.abs(ctx.parsed.y))}` } }
    },
    scales:{
      x:{ grid:{display:false}, ticks:{maxTicksLimit:14} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'members/week'} }
    }
  }
});

const churnBoundaryIdx = churnWeekly.findIndex(w => w.week === churn.cutoff_date);
const churnBoundaryPlugin = {
  id: 'churnBoundary',
  afterDraw(chart){
    if (churnBoundaryIdx < 0) return;
    const x = chart.scales.x.getPixelForValue(churnBoundaryIdx);
    const {top, bottom} = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = COLORS.moss;
    ctx.setLineDash([5,4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top); ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.moss;
    ctx.font = "10px 'JetBrains Mono'";
    ctx.fillText('New community management begins', x+5, top+11);
    ctx.restore();
  }
};

new Chart(document.getElementById('churnRateChart'), {
  type:'line',
  plugins: [churnBoundaryPlugin],
  data:{
    labels: churnWeekly.map(w=>w.week_label),
    datasets:[{
      label:'Weekly churn rate (leaves / standing members)',
      data: churnWeekly.map(w=>w.churn_rate_pct),
      borderColor: COLORS.rust, backgroundColor:'rgba(217,112,92,0.08)',
      fill:true, tension:0.3, pointRadius:0, borderWidth:2
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{display:false}, ticks:{maxTicksLimit:14} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'% of standing members leaving/week'} }
    }
  }
});
}

// ---------- Event Log ----------
const CATEGORY_LABELS = {
  program_launch: 'Program launch',
  feature_launch: 'Feature launch',
  milestone: 'Milestone',
  application_cycle: 'Applications',
  game_update: 'Game update',
  leadership: 'Leadership',
  incident: 'Incident',
  community_event: 'Community event'
};
if (events.length) {
  const sortedEvents = [...events].sort((a,b) => new Date(b.date) - new Date(a.date));
  const eventLogTable = document.getElementById('eventlog-table');
  eventLogTable.innerHTML = `
    <tr><th class="row-head" style="text-align:left;">Date</th><th style="text-align:left;">Category</th><th style="text-align:left;">Event</th></tr>
    ${sortedEvents.map(e => `
      <tr>
        <td style="text-align:left;color:var(--ink-dim);white-space:nowrap;">${e.date_label}</td>
        <td style="text-align:left;"><span style="color:${EVENT_COLORS[e.category]||COLORS.inkDim};">●</span> ${CATEGORY_LABELS[e.category]||e.category}</td>
        <td style="text-align:left;color:var(--ink);" title="${e.description}">${e.title}</td>
      </tr>
    `).join('')}
  `;
}

// ---------- 01 Census chart (+ Nov-onward / All-time range toggle) ----------
const boundaryIdx = weeks.indexOf(DATA.meta.quarter_boundary_week);
const quarterMarkerPlugin = {
  id: 'quarterMarker',
  afterDraw(chart){
    if (boundaryIdx < 0) return;
    const xScale = chart.scales.x;
    const x = xScale.getPixelForValue(boundaryIdx);
    const {top, bottom} = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = COLORS.inkFaint;
    ctx.setLineDash([4,3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.inkFaint;
    ctx.font = "10px 'JetBrains Mono'";
    ctx.fillText('Q2 starts', x+5, top+11);
    ctx.restore();
  }
};

const narrativeCutoff = DATA.meta.narrative_cutoff;
const novOnwardStartIdx = Math.max(0, weeks.indexOf(narrativeCutoff));

function sliceForRange(range){
  return range === 'nov' ? novOnwardStartIdx : 0;
}

let censusChartInstance = null, depthChartInstance = null, newRetChartInstance = null;

function renderCensusChart(range){
  const startIdx = sliceForRange(range);
  const labels = weekLabels.slice(startIdx);
  const data = overall.slice(startIdx);
  const localBoundaryIdx = boundaryIdx - startIdx;
  if (censusChartInstance) censusChartInstance.destroy();
  censusChartInstance = new Chart(document.getElementById('censusChart'), {
    type:'line',
    plugins: (boundaryIdx>=startIdx) ? [{ ...quarterMarkerPlugin, afterDraw(chart){
      if (localBoundaryIdx < 0) return;
      const xScale = chart.scales.x;
      const x = xScale.getPixelForValue(localBoundaryIdx);
      const {top, bottom} = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = COLORS.inkFaint;
      ctx.setLineDash([4,3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.inkFaint;
      ctx.font = "10px 'JetBrains Mono'";
      ctx.fillText('Q2 starts', x+5, top+11);
      ctx.restore();
    }}] : [],
    data:{
      labels,
      datasets:[
        {
          label:'Active members',
          data: data.map(w=>w.active_users),
          borderColor: COLORS.amber, backgroundColor:'rgba(232,162,76,0.08)',
          yAxisID:'y', tension:0.3, fill:true, borderWidth:2,
          pointRadius: data.map(w => (w.is_corrected || w.is_data_loss) ? 3 : 0),
          pointBackgroundColor: data.map(w => w.is_data_loss ? COLORS.inkFaint : (w.is_corrected ? COLORS.violet : COLORS.amber))
        },
        {
          label:'Total messages',
          data: data.map(w=>w.total_messages),
          borderColor: COLORS.violet, backgroundColor:'transparent',
          yAxisID:'y1', tension:0.3, pointRadius:2, borderWidth:2, borderDash:[4,3]
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index', intersect:false},
      plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}},
        tooltip:{ callbacks:{ afterBody: (items)=>{
          const w = data[items[0].dataIndex];
          if (w.is_data_loss) return '† Statbot outage — real number was higher';
          if (w.is_corrected) return '* Export cap corrected to true value';
          return '';
        }}}
      },
      scales:{
        x:{ grid:{color:COLORS.line} },
        y:{ position:'left', title:{display:true,text:'active members'}, grid:{color:COLORS.line} },
        y1:{ position:'right', title:{display:true,text:'messages'}, grid:{display:false} }
      }
    }
  });
}

function renderDepthChart(range){
  const startIdx = sliceForRange(range);
  const labels = weekLabels.slice(startIdx);
  const data = overall.slice(startIdx);
  if (depthChartInstance) depthChartInstance.destroy();
  depthChartInstance = new Chart(document.getElementById('depthChart'), {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Median messages / active member',
        data: data.map(w=>w.median_messages),
        borderColor: COLORS.moss, backgroundColor:'rgba(127,191,143,0.08)',
        fill:true, tension:0.3, pointRadius:2, borderWidth:2
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:{color:COLORS.line} },
        y:{ grid:{color:COLORS.line}, title:{display:true,text:'median messages/week'} }
      }
    }
  });
}

function renderNewRetChart(range){
  const startIdx = sliceForRange(range);
  const labels = weekLabels.slice(startIdx);
  const data = newRet.slice(startIdx);
  if (newRetChartInstance) newRetChartInstance.destroy();
  newRetChartInstance = new Chart(document.getElementById('newRetChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Returning', data:data.map(w=>w.returning_users), backgroundColor: COLORS.amberDim, stack:'s' },
        { label:'New', data:data.map(w=>w.new_users), backgroundColor: COLORS.moss, stack:'s' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}} },
      scales:{
        x:{ stacked:true, grid:{display:false} },
        y:{ stacked:true, grid:{color:COLORS.line} }
      }
    }
  });
}

function wireRangeToggle(containerId, onRangeChange){
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onRangeChange(btn.dataset.range);
    });
  });
}

renderCensusChart('nov');
renderDepthChart('nov');
wireRangeToggle('census-range-toggle', (range) => { renderCensusChart(range); renderDepthChart(range); });

// ---------- 02 New vs returning (+ range toggle) ----------
renderNewRetChart('nov');
wireRangeToggle('newret-range-toggle', (range) => renderNewRetChart(range));

// ---------- sparkline helper ----------
function sparkline(values, w=200, h=34, color=COLORS.amber){
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max-min) || 1;
  const pts = values.map((v,i)=>{
    const x = (i/(values.length-1))*(w-4)+2;
    const y = h-2 - ((v-min)/range)*(h-4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="cohort-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ---------- 03 Cohort grid ----------
const gridEl = document.getElementById('cohort-grid');
GRID_COHORTS.forEach(name=>{
  const series = cohorts[name];
  const latest = series[series.length-1];
  const prev = series[series.length-2];
  const delta = latest.members - prev.members;
  const deltaClass = delta>0?'up':(delta<0?'down':'flat');
  const card = document.createElement('div');
  card.className = 'cohort-card';
  card.innerHTML = `
    <div class="cohort-top">
      <div class="cohort-name">${name}</div>
      <div class="cohort-pct">${latest.pct_of_active}% of active</div>
    </div>
    <div class="cohort-count">${fmt(latest.members)}</div>
    ${sparkline(series.map(s=>s.members))}
    <div class="cohort-foot">
      <span class="delta ${deltaClass}">${delta>0?'&uarr;':(delta<0?'&darr;':'&middot;')} ${Math.abs(delta)} wow</span>
      <span>median ${fmt1(latest.median_msg_member)}/wk</span>
    </div>
    <div class="cohort-foot" style="border-top:none;padding-top:2px;margin-top:2px;">
      <span>total this week</span>
      <span style="color:var(--ink);font-weight:600;">${fmt(latest.total_msgs_member)} msgs</span>
    </div>
  `;
  card.addEventListener('click', ()=>showDetail(name));
  gridEl.appendChild(card);
});

// ---------- 04 Cohort Overlap ----------
const overlap = DATA.overlap;
const ovLabels = overlap.overlap_labels;
const ovSizes = overlap.overlap_sizes;
const ovMatrix = overlap.overlap_matrix;

function overlapColor(pct){
  // 0% -> near background, 100% -> full amber
  const a = Math.max(0, Math.min(1, pct/100));
  return `rgba(232,162,76,${(a*0.85).toFixed(2)})`;
}

const table = document.getElementById('overlap-table');
let thead = '<tr><th></th><th></th>' + ovLabels.map(l=>`<th class="col-head">${l}</th>`).join('') + '</tr>';
let rows = ovLabels.map(r=>{
  const cells = ovLabels.map(c=>{
    if (c===r) return `<td class="diag">100</td>`;
    const v = ovMatrix[r][c];
    return `<td style="background:${overlapColor(v)};color:${v>55?'#181008':'var(--ink)'};" title="${v}% of ${r} are also ${c}">${v}</td>`;
  }).join('');
  return `<tr><th class="row-head">${r}</th><td class="size-cell">${fmt(ovSizes[r])}</td>${cells}</tr>`;
}).join('');
table.innerHTML = thead + rows;

// Auto-generated callouts — skip same-family (Creator/Creator X) pairs since those overlaps are definitional, not insight.
// Alpha Crew gets its own dedicated callout below, so exclude it here to avoid saying the same thing twice.
function isSameFamily(a,b){ return a.startsWith('Creator') && b.startsWith('Creator'); }
const crossPairs = [];
ovLabels.forEach(r=>{
  ovLabels.forEach(c=>{
    if (r===c || isSameFamily(r,c)) return;
    if (r==='Alpha Crew' || c==='Alpha Crew') return;
    if (ovSizes[r] < 15) return; // skip tiny-N rows
    crossPairs.push({ r, c, pct: ovMatrix[r][c] });
  });
});
const topOverlap = [...crossPairs].sort((a,b)=>b.pct-a.pct)[0];
const alphaCrewRow = ovLabels.includes('Alpha Crew') ? ovLabels.filter(c=>c!=='Alpha Crew' && !isSameFamily('Alpha Crew',c)).map(c=>({c, pct: ovMatrix['Alpha Crew'][c]})).sort((a,b)=>b.pct-a.pct) : [];

const overlapNotes = [];
if (topOverlap) {
  overlapNotes.push({
    tag:'opp', label:'Most overlapping pair',
    body:`<b>${topOverlap.pct}%</b> of <b>${topOverlap.r}</b> members (${fmt(ovSizes[topOverlap.r])} people) are also <b>${topOverlap.c}</b>. If you're treating these as two separate levers in strategy, know that they're mostly the same audience.`
  });
}
if (alphaCrewRow.length) {
  const top3 = alphaCrewRow.slice(0,3).map(x=>`${x.pct}% ${x.c}`).join(', ');
  overlapNotes.push({
    tag:'watch', label:'Alpha Crew — VIP recognition tier',
    body:`Alpha Crew (${fmt(ovSizes['Alpha Crew'])} people) is a designed recognition program, not an emergent cluster &mdash; and the overlap confirms it's pulling the right people: ${top3}. That's consistent with a tier meant to reward your most consistently engaged members across streaks, verification, and creator activity alike.`
  });
}
document.getElementById('overlap-callouts').innerHTML = overlapNotes.map(n=>`
  <div class="note-card">
    <span class="note-tag ${n.tag}">${n.label}</span>
    <div class="note-body">${n.body}</div>
  </div>
`).join('');

// ---------- 05 Activation ----------
const activation = DATA.activation;

document.getElementById('activation-callouts').innerHTML = `
  <div class="stat">
    <div class="label">Activation rate, Nov 2025 onward</div>
    <div class="value" style="color:var(--moss)">${activation.overall_rate}%</div>
    <div class="sub">of ${fmt(activation.n_users)} message-senders, 3+ msgs in their first week</div>
  </div>
`;

new Chart(document.getElementById('activationChart'), {
  data:{
    labels: activation.trend.map(t=>{
      const idx = weeks.indexOf(t.week);
      return weekLabels[idx];
    }),
    datasets:[
      { type:'bar', label:'New message-senders that week', data: activation.trend.map(t=>t.new_users), backgroundColor: COLORS.inkFaint, yAxisID:'y1', order:2 },
      { type:'line', label:'Activation rate', data: activation.trend.map(t=>t.activation_rate), borderColor: COLORS.moss, backgroundColor:'transparent', yAxisID:'y', tension:0.3, pointRadius:2, borderWidth:2, order:1 }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index', intersect:false},
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}} },
    scales:{
      x:{ grid:{display:false} },
      y:{ position:'left', title:{display:true,text:'activation %'}, grid:{color:COLORS.line}, min:0, max:100 },
      y1:{ position:'right', title:{display:true,text:'new message-senders'}, grid:{display:false} }
    }
  }
});

// ---------- 06 Tier contribution ----------
const tc = DATA.tier_contribution;
const tierLabels = tc.tier_bucket_labels;
const tierPalette = ['#3A4248', '#5C6B66', ...ANIMAL_COLS.map((_,i)=> `hsl(${30 + i*14}, 55%, ${58 - i*1.5}%)`)];

// Latest week vs previous week only -- a stacked 27-week chart across 18 tiers is unreadable,
// and a simple two-week comparison actually answers "where do the messages come from" better.
const latestVol = tc.weekly_tier_volume[tc.weekly_tier_volume.length-1];
const latestMem = tc.weekly_tier_members[tc.weekly_tier_members.length-1];
const prevVol = tc.weekly_tier_volume[tc.weekly_tier_volume.length-2];
const prevWeekLabel = weekLabels[weekLabels.length-2];
const latestWeekLabel = weekLabels[weekLabels.length-1];

new Chart(document.getElementById('tierVolumeChart'), {
  type:'bar',
  data:{
    labels: tierLabels,
    datasets:[
      { label: prevWeekLabel, data: tierLabels.map(l=>prevVol[l]), backgroundColor: COLORS.inkFaint, borderRadius:2 },
      { label: latestWeekLabel, data: tierLabels.map(l=>latestVol[l]), backgroundColor: COLORS.amber, borderRadius:2 }
    ]
  },
  options:{
    indexAxis:'y',
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}} },
    scales:{
      x:{ grid:{color:COLORS.line}, title:{display:true,text:'messages that week'} },
      y:{ grid:{display:false} }
    }
  }
});

// ---------- Pre/post-Nov retention data (chart retired -- merged into Membership Churn's story;
// kept here only because Field Notes below still references postCurve for the drop-off stat) ----------
const prepostRet = DATA.prepost_retention;
const preCurve = prepostRet.pre_curve, postCurve = prepostRet.post_curve;

const stickyHist = DATA.stickiness_hist;
new Chart(document.getElementById('stickinessChart'), {
  type:'bar',
  data:{
    labels: stickyHist.map(s=>s.label),
    datasets:[{
      label:'Unique members',
      data: stickyHist.map(s=>s.count),
      backgroundColor: COLORS.violet,
      borderRadius:2
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false},
      tooltip:{ callbacks:{ afterLabel:(ctx)=>{
        const total = stickyHist.reduce((a,s)=>a+s.count,0);
        return `${(100*stickyHist[ctx.dataIndex].count/total).toFixed(1)}% of all members`;
      }}}
    },
    scales:{
      x:{ grid:{display:false}, title:{display:true,text:`distinct weeks active, out of ${weeks.length}`} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'members'} }
    }
  }
});

// ---------- 07 Movers ----------
// Restricted to named recognition cohorts only -- the base ladder (Animals, Gorilla, Cat, etc.)
// is excluded since the early rungs take as few as 10 messages to cross and dominate any
// "biggest mover" list by default, without that meaning much.
const wowDeltas = GRID_COHORTS.map(name=>{
  const s = cohorts[name];
  const latest = s[s.length-1], prev = s[s.length-2];
  return {
    name,
    delta: latest.members - prev.members,
    pctDelta: latest.pct_of_active - prev.pct_of_active,
    latestMembers: latest.members,
    prevMembers: prev.members
  };
}).filter(d => Math.max(d.latestMembers, d.prevMembers) >= 8); // filter noise from tiny cohorts

const gainers = [...wowDeltas].sort((a,b)=>b.delta-a.delta).slice(0,5).filter(d=>d.delta>0);
const losers = [...wowDeltas].sort((a,b)=>a.delta-b.delta).slice(0,5).filter(d=>d.delta<0);

function renderMovers(container, list, positive){
  container.innerHTML = list.map(d=>`
    <div class="mover-item ${positive?'':'down'}">
      <div>
        <div class="mover-name">${d.name}</div>
        <div class="mover-detail">${d.prevMembers} &rarr; ${d.latestMembers} members</div>
      </div>
      <div class="mover-delta ${positive?'up':'down'}">${d.delta>0?'+':''}${d.delta}</div>
    </div>
  `).join('') || '<div class="mover-detail">No notable movement this week.</div>';
}
renderMovers(document.getElementById('movers-up'), gainers, true);
renderMovers(document.getElementById('movers-down'), losers, false);

// ---------- 08 Field notes (auto-generated) ----------
function fourWeekMomentum(name){
  const s = cohorts[name];
  const n = s.length;
  const back = Math.min(4, n-1);
  return {
    memNow: s[n-1].members,
    memThen: s[n-1-back].members,
    liftNow: s[n-1].median_msg_nonmember>0 ? s[n-1].median_msg_member/s[n-1].median_msg_nonmember : 0,
    liftThen: s[n-1-back].median_msg_nonmember>0 ? s[n-1-back].median_msg_member/s[n-1-back].median_msg_nonmember : 0,
    medMsgNow: s[n-1].median_msg_member,
    medMsgThen: s[n-1-back].median_msg_member
  };
}

const notableCohorts = GRID_COHORTS.filter((v,i,a)=>a.indexOf(v)===i)
  .filter(name => Math.max(...cohorts[name].map(s=>s.members)) >= 10);

const momentum = notableCohorts.map(name=>({name, ...fourWeekMomentum(name)}));

const growthLeader = [...momentum].sort((a,b)=>(b.memNow-b.memThen)-(a.memNow-a.memThen))[0];
const declineLeader = [...momentum].sort((a,b)=>(a.memNow-a.memThen)-(b.memNow-b.memThen))[0];
const liftLeader = [...momentum].filter(m=>m.liftNow>0).sort((a,b)=>b.liftNow-a.liftNow)[0];
const laggingGrowth = [...momentum]
  .filter(m => (m.memNow-m.memThen) > 0 && (m.medMsgNow - m.medMsgThen) < 0)
  .sort((a,b)=>(b.memNow-b.memThen)-(a.memNow-a.memThen))[0];

const ladderMomentum = ANIMAL_COLS.map(name=>{
  const s = cohorts[name];
  return { name, gain: s[s.length-1].members - s[0].members };
}).sort((a,b)=>b.gain-a.gain)[0];

const notes = [];

// Top volume-driving tier, latest week (actual ladder rungs only — excluding the two non-tier buckets, and tiny-N tiers)
const latestTierEntries = tierLabels
  .filter(label => label !== 'No role at all' && label !== 'Animals only (no tier)')
  .map(label => ({ label, vol: latestVol[label], mem: latestMem[label] }))
  .filter(t => t.mem >= 10);
const topVolumeTier = [...latestTierEntries].sort((a,b)=>b.vol-a.vol)[0];
const topPerCapitaTier = [...latestTierEntries]
  .map(t=>({...t, perCap: t.vol/t.mem}))
  .sort((a,b)=>b.perCap-a.perCap)[0];

if (topVolumeTier) {
  notes.push({
    tag:'opp', label:'Where the volume comes from',
    body:`<b>${topVolumeTier.label}</b> produced the most messages of any single tier this week (<b>${fmt(topVolumeTier.vol)}</b> messages from ${fmt(topVolumeTier.mem)} members). ${topPerCapitaTier && topPerCapitaTier.label !== topVolumeTier.label ? `Per member, though, <b>${topPerCapitaTier.label}</b> is the most productive tier at ${topPerCapitaTier.perCap.toFixed(1)} messages/member.` : ''}`
  });
}

notes.push({
  tag:'watch', label:'Activation',
  body:`<b>${activation.overall_rate}%</b> of message-senders hit 3+ messages in their first week, measured Nov 2025 onward &mdash; though this is measured against people who message at all, not your full member base, so treat it as an upper bound rather than a true server-wide rate.`
});

const week1Ret = postCurve.find(r=>r.offset===1);
const week8Ret = postCurve.find(r=>r.offset===8);
if (week1Ret && week8Ret) {
  notes.push({
    tag:'risk', label:'Early drop-off',
    body:`Even in the post-November cohort, only <b>${week1Ret.pct}%</b> of members active in their first week are still active the following week, falling to <b>${week8Ret.pct}%</b> by 8 weeks out. Most of the drop happens immediately &mdash; if there's a lever for retention, it's likely in week one, not week eight. The community-management shift improved this only modestly (see Membership Churn &amp; Stickiness below) &mdash; early drop-off is still the biggest single pattern in the data.`
  });
}

const oneWeekOnly = stickyHist.find(s=>s.label==='1 wks' || s.label==='1 wk');
if (oneWeekOnly) {
  const totalSticky = stickyHist.reduce((a,s)=>a+s.count,0);
  notes.push({
    tag:'watch', label:'One-and-done',
    body:`<b>${fmt(oneWeekOnly.count)}</b> members (${(100*oneWeekOnly.count/totalSticky).toFixed(1)}% of everyone in the data) show up in exactly one week out of 27 and never again. That's a meaningfully different group from the ones who churn gradually &mdash; likely worth its own outreach approach.`
  });
}

notes.push({
  tag:'watch', label:'Community pulse',
  body:`Weekly active members moved from <b>${fmt(firstW.active_users)}</b> to <b>${fmt(lastW.active_users)}</b> over H1 (${pctSigned(activeChangePct)}), while median messages per active member went from <b>${fmt1(firstW.median_messages)}</b> to <b>${fmt1(lastW.median_messages)}</b>. ${activeChange<0 && medianMsgChange>0 ? "Fewer people are showing up, but the ones who do are more engaged &mdash; a smaller, denser core." : (activeChange>=0 && medianMsgChange>=0 ? "Both headcount and engagement are trending the same direction &mdash; healthy growth." : "Worth watching whether this is seasonal or structural.")}`
});

if (growthLeader && (growthLeader.memNow - growthLeader.memThen) > 0) {
  notes.push({
    tag:'opp', label:'Growth leader',
    body:`<b>${growthLeader.name}</b> grew from <b>${growthLeader.memThen}</b> to <b>${growthLeader.memNow}</b> members over the last 4 weeks. Whatever's driving entry into this cohort is working &mdash; worth understanding why and reinforcing it.`
  });
}

if (declineLeader && (declineLeader.memNow - declineLeader.memThen) < 0) {
  notes.push({
    tag:'risk', label:'Losing members',
    body:`<b>${declineLeader.name}</b> went from <b>${declineLeader.memThen}</b> to <b>${declineLeader.memNow}</b> members over the last 4 weeks. If this cohort matters to retention or monetization, it's worth a closer look at what changed.`
  });
}

if (liftLeader) {
  notes.push({
    tag:'opp', label:'Highest engagement lift',
    body:`Members of <b>${liftLeader.name}</b> post a median of <b>${liftLeader.liftNow.toFixed(1)}&times;</b> as many messages as everyone else this week (${fmt1(cohorts[liftLeader.name][cohorts[liftLeader.name].length-1].median_msg_member)} vs. ${fmt1(cohorts[liftLeader.name][cohorts[liftLeader.name].length-1].median_msg_nonmember)} messages, median). At only ${fmt(cohorts[liftLeader.name][cohorts[liftLeader.name].length-1].members)} members, this looks like a high-value, still-small group &mdash; a strong candidate to grow deliberately.`
  });
}

if (laggingGrowth) {
  notes.push({
    tag:'risk', label:'Growth outpacing engagement',
    body:`<b>${laggingGrowth.name}</b> gained members over the last 4 weeks (${laggingGrowth.memThen} &rarr; ${laggingGrowth.memNow}), but median messages per member in the cohort fell from ${fmt1(laggingGrowth.medMsgThen)} to ${fmt1(laggingGrowth.medMsgNow)}. New members may be joining the label without adopting the underlying behavior.`
  });
}

if (ladderMomentum) {
  notes.push({
    tag:'watch', label:'Ladder movement',
    body:`<b>${ANIMAL_EMOJI[ladderMomentum.name]} ${ladderMomentum.name}</b> saw the largest population gain on the leveling ladder across H1 (${ladderMomentum.gain>=0?'+':''}${ladderMomentum.gain} members). Since ranks are cumulative, this is a reasonable proxy for where members are spending time leveling up right now.`
  });
}

document.getElementById('notes-grid').innerHTML = notes.map(n=>`
  <div class="note-card">
    <span class="note-tag ${n.tag}">${n.label}</span>
    <div class="note-body">${n.body}</div>
  </div>
`).join('');

// ---------- 09 Level Hoodie Launch tracking ----------
function levelLaunchMarkerPlugin(label, idxOverride){
  return {
    id: 'levelLaunchMarker',
    afterDraw(chart){
      const xScale = chart.scales.x;
      const {top, bottom, right} = chart.chartArea;
      // launch falls just after the last available week on whichever series is charted
      const idx = (idxOverride !== undefined) ? idxOverride : levelLaunch.weekly.length;
      let x = xScale.getPixelForValue(idx);
      if (!isFinite(x) || x > right) x = right;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = COLORS.rust;
      ctx.setLineDash([4,3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.rust;
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = 'right';
      ctx.fillText(label, x-5, top+11);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  };
}

function renderLevelLaunchCharts(){
  if (!levelLaunch) return;
  const llLabels = levelLaunch.weekly.map(w=>w.week_label);
  const specs = [
    {canvas:'gorillaLaunchChart', key:'gorilla_new', color: COLORS.amber, name:'🦍 Gorilla LVL 1'},
    {canvas:'frogLaunchChart', key:'frog_new', color: COLORS.moss, name:'🐸 Frog LVL 6'},
    {canvas:'turkeyLaunchChart', key:'turkey_new', color: COLORS.violet, name:'🦃 Turkey LVL 10'}
  ];
  specs.forEach(spec=>{
    const el = document.getElementById(spec.canvas);
    if (!el) return;
    new Chart(el, {
      type:'line',
      plugins: [levelLaunchMarkerPlugin('Hoodie launch')],
      data:{
        labels: llLabels,
        datasets:[{
          label: spec.name + ' — new achievers/week',
          data: levelLaunch.weekly.map(w=>w[spec.key]),
          borderColor: spec.color, backgroundColor: spec.color+'14',
          fill:true, tension:0.3, pointRadius:0, borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index', intersect:false},
        plugins:{ legend:{display:false}, tooltip:{callbacks:{title:(items)=>items[0].label}} },
        scales:{
          x:{ grid:{display:false}, ticks:{maxTicksLimit:6} },
          y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'new this week'} }
        }
      }
    });
  });
}
renderLevelLaunchCharts();

// ---------- 09b Level Hoodie Launch — success metrics (collapsible) ----------
function renderLaunchSuccessMetrics(){
  const ls = DATA.level_launch_success;
  if (!ls) return;

  // --- Gorilla leak rate: % of each week's new Animals-holders who never reach Gorilla LVL1 ---
  const gl = ls.gorilla_leak_rate;
  const glEl = document.getElementById('gorillaLeakChart');
  if (glEl && gl && gl.cohorts.length){
    new Chart(glEl, {
      type:'line',
      data:{
        labels: gl.cohorts.map(c=>c.week_label),
        datasets:[{
          label:'% of Animals-holders who never reach Gorilla LVL 1',
          data: gl.cohorts.map(c=>c.pct_never_gorilla),
          borderColor: COLORS.amber, backgroundColor: COLORS.amber+'14',
          fill:true, tension:0.3, pointRadius:0, borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index', intersect:false},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{
            title:(items)=>items[0].label,
            label:(item)=>{
              const c = gl.cohorts[item.dataIndex];
              return [`${fmt1(c.pct_never_gorilla)}% never reached Gorilla`, `cohort size: ${fmt(c.cohort_size)}`];
            }
          }}
        },
        scales:{
          x:{ grid:{display:false}, ticks:{maxTicksLimit:6} },
          y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% never reach Gorilla'} }
        }
      }
    });
  }

  // --- Frog -> Turkey conversion ---
  const ft = ls.frog_turkey_conversion;
  const ftEl = document.getElementById('frogTurkeyConversionChart');
  if (ftEl && ft && ft.cohorts.length){
    new Chart(ftEl, {
      type:'line',
      data:{
        labels: ft.cohorts.map(c=>c.week_label),
        datasets:[{
          label:'% of Frog achievers who ever reach Turkey',
          data: ft.cohorts.map(c=>c.pct_reached_turkey),
          borderColor: COLORS.moss, backgroundColor: COLORS.moss+'14',
          fill:true, tension:0.3, pointRadius:0, borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index', intersect:false},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{
            title:(items)=>items[0].label,
            label:(item)=>{
              const c = ft.cohorts[item.dataIndex];
              return [`${fmt1(c.pct_reached_turkey)}% reached Turkey`, `Frog cohort size: ${fmt(c.cohort_size)}`];
            }
          }}
        },
        scales:{
          x:{ grid:{display:false}, ticks:{maxTicksLimit:6} },
          y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% Frog → Turkey'} }
        }
      }
    });
  }

  // --- Streak conversion (Frog/Turkey -> 7-Day Streak), snapshot stats not a weekly line ---
  const sc = ls.streak_conversion;
  const scEl = document.getElementById('streak-conversion-stats');
  if (scEl && sc){
    const row = (emoji, name, s) => `
      <div class="stat">
        <div class="label">${emoji} ${name} → 7-Day Streak</div>
        <div class="value">${fmt1(s.pct_ever)}%</div>
        <div class="sub">ever · ${fmt1(s.pct_strictly_after)}% strictly after · n=${fmt(s.eligible_n)} eligible</div>
      </div>`;
    scEl.innerHTML = row('🐸','Frog', sc.frog) + row('🦃','Turkey', sc.turkey);
  }

  // --- Weekly retention guardrail, current era onward, with the Oct 1 launch marker ---
  const rw = (ls.retention_weekly || []).filter(w => w.week >= narrativeCutoff);
  const rwEl = document.getElementById('retentionWeeklyChart');
  if (rwEl && rw.length){
    new Chart(rwEl, {
      type:'line',
      plugins: [levelLaunchMarkerPlugin('Hoodie launch', rw.length)],
      data:{
        labels: rw.map(w=>w.week_label),
        datasets:[{
          label:'Week-over-week retention',
          data: rw.map(w=>w.pct),
          borderColor: COLORS.ink, backgroundColor: COLORS.ink+'10',
          fill:true, tension:0.3, pointRadius:0, borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index', intersect:false},
        plugins:{ legend:{display:false}, tooltip:{callbacks:{title:(items)=>items[0].label}} },
        scales:{
          x:{ grid:{display:false}, ticks:{maxTicksLimit:6} },
          y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% retained next week'} }
        }
      }
    });
  }
}
renderLaunchSuccessMetrics();

// ---------- 10 Community gameplay events ----------
const LEVEL_BUCKET_ORDER = ['No role at all', 'Animals only (no tier)', ...ANIMAL_COLS];
const LEVEL_BUCKET_SHORT = {
  'No role at all': 'No role', 'Animals only (no tier)': 'Animals only',
  'Gorilla LVL 1':'🦍 Gorilla', 'Cat LVL 2':'🐱 Cat', 'Mole LVL 3':'🦔 Mole', 'Racoon LVL 4':'🦝 Racoon',
  'Bunny LVL 5':'🐰 Bunny', 'Frog LVL 6':'🐸 Frog', 'Turkey LVL 10':'🦃 Turkey', 'Bat LVL 15':'🦇 Bat',
  'Deer LVL 20':'🦌 Deer', 'Tiger LVL 30':'🐯 Tiger', 'Capybara LVL 40':'🦫 Capybara',
  'Chameleon LVL 50':'🦎 Chameleon', 'Duck LVL 60':'🦆 Duck', 'Rat LVL 70':'🐀 Rat',
  'Crow LVL 80':'🐦‍⬛ Crow', 'T-Rex LVL 90':'🦖 T-Rex'
};

function renderCommunityEvents(){
  const events = DATA.community_events || [];
  const container = document.getElementById('community-events-list');
  if (!container) return;
  if (!events.length){
    container.innerHTML = '<div class="section-desc">No community events logged yet.</div>';
    return;
  }

  container.innerHTML = events.map((ev, i) => {
    const startLabel = new Date(ev.start_date + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    const endLabel = new Date(ev.end_date + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    const chatMsgsRatio = ev.population_baseline_avg_msgs ? (ev.participant_baseline_avg_msgs / ev.population_baseline_avg_msgs) : null;

    const tierRows = ev.tier_breakdown.map(t => {
      const tierName = {top3:'🏆 Top 3', top10:'🥈 Top 10', participant:'Participant'}[t.tier] || t.tier;
      return `
      <div class="stat">
        <div class="label">${tierName}</div>
        <div class="value">${fmt(t.n)}</div>
        <div class="sub">score ${fmt(t.min_score)}&ndash;${fmt(t.max_score)}</div>
      </div>`;
    }).join('');

    const shortDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'});

    let chatAfterHtml;
    const ca = ev.chat_after;
    if (ca) {
      const gActive = ca.groups.find(g => g.key === 'active_0_1wk');
      const gDorm = ca.groups.find(g => g.key === 'dormant_5_12wk');
      const mult = (gDorm && gDorm.control_pct) ? (gDorm.chatted_pct / gDorm.control_pct) : null;
      const wkTxt = ca.main_weeks.map(shortDate).join(' & ');
      chatAfterHtml = `
      <div class="section-desc">Showing up to play isn't the same as chatting. For each group below: the share who sent at least one message in the main event week (week of ${wkTxt}), next to non-players who were equally quiet going in — a yardstick for what would have happened anyway.</div>
      <div class="stat-strip" style="margin-bottom:20px;">
        <div class="stat">
          <div class="label">Players who chatted</div>
          <div class="value">${fmt(ca.all_participants.chatted_n)}</div>
          <div class="sub">${ca.all_participants.chatted_pct}% of ${fmt(ca.all_participants.n)} players</div>
        </div>
        <div class="stat">
          <div class="label">Outside-core players who chatted</div>
          <div class="value">${fmt(ca.outside_core_5wk_plus_or_never.chatted_n)}</div>
          <div class="sub">${ca.outside_core_5wk_plus_or_never.chatted_pct}% of ${fmt(ca.outside_core_5wk_plus_or_never.n)} who were quiet 5+ wks or never chatted</div>
        </div>
        <div class="stat">
          <div class="label">Already-active players who chatted</div>
          <div class="value">${gActive ? gActive.chatted_pct+'%' : '—'}</div>
          <div class="sub">${gActive ? fmt(gActive.chatted_n)+' of '+fmt(gActive.n) : ''}</div>
        </div>
      </div>
      <div class="panel"><div class="chart-box short"><canvas id="ce${i}-chatAfterChart"></canvas></div></div>
      <div class="notes-grid" style="margin:20px 0 28px;">
        <div class="note-card">
          <span class="note-tag ${ca.outside_core_5wk_plus_or_never.chatted_pct >= 20 ? 'opp' : 'watch'}">${ca.outside_core_5wk_plus_or_never.chatted_pct < 50 ? 'Most outside-core players played without chatting' : 'Most outside-core players also chatted'}</span>
          <div class="note-body">Of the <b>${fmt(ca.outside_core_5wk_plus_or_never.n)}</b> players who were quiet 5+ weeks or had never chatted, <b>${fmt(ca.outside_core_5wk_plus_or_never.chatted_n)}</b> (${ca.outside_core_5wk_plus_or_never.chatted_pct}%) chatted in the main event week.${mult ? ` That is about <b>${mult.toFixed(0)}×</b> the rate of equally quiet members who didn't play (${gDorm.chatted_pct}% vs. ${gDorm.control_pct}% for the 5&ndash;12 week group), so the event is pulling some people back — but the yardstick is generous, since people who play are likely more engaged to begin with.` : ''}</div>
        </div>
      </div>`;
    } else {
      chatAfterHtml = `<div class="section-desc" style="margin-top:0;">Pending — needs a Statbot week that falls mostly (4+ days) inside this event, ${startLabel}&ndash;${endLabel}.</div>`;
    }

    let chatImpactHtml;
    const ct = ev.chat_trajectory;
    if (ct && ct.in_event_window.some(Boolean)) {
      const li = ct.weeks.length - 1;
      const nb = ct.n_baseline_weeks;
      const pA = ct.participants.active_idx[li], oA = ct.others.active_idx[li];
      const pM = ct.participants.msgs_idx[li], oM = ct.others.msgs_idx[li];
      const preGap = ct.participants.active_idx[nb-1] - ct.others.active_idx[nb-1];
      const nowGap = pA - oA;
      const gapChange = nowGap - preGap;
      const gapText = gapChange > 10
        ? `That gap is <b>${Math.round(gapChange)} points wider</b> than it was in the last week before the event — worth watching, but it could still be seasonality or the fact that event-goers are simply more engaged people.`
        : `But that gap was already there <i>before</i> the event (${Math.round(ct.participants.active_idx[nb-1])}% vs. ${Math.round(ct.others.active_idx[nb-1])}% in the last pre-event week) and hasn't meaningfully widened since (${gapChange>=0?'+':''}${Math.round(gapChange)} points). So this can't be credited to the event yet.`;
      const overlapText = (ev.overlaps_events && ev.overlaps_events.length)
        ? ` This event overlapped with <b>${ev.overlaps_events.join(', ')}</b>, so their effects can't be separated.` : '';
      chatImpactHtml = `
        <div class="stat-strip" style="margin-bottom:20px;">
          <div class="stat">
            <div class="label">Participants still chatting</div>
            <div class="value">${Math.round(pA)}%</div>
            <div class="sub">of their pre-event level, week of ${shortDate(ct.weeks[li])}</div>
          </div>
          <div class="stat">
            <div class="label">Everyone else still chatting</div>
            <div class="value">${Math.round(oA)}%</div>
            <div class="sub">same measure, same week</div>
          </div>
          <div class="stat">
            <div class="label">Participants' messages/person</div>
            <div class="value">${Math.round(pM)}%</div>
            <div class="sub">of their pre-event level</div>
          </div>
          <div class="stat">
            <div class="label">Everyone else's messages/person</div>
            <div class="value">${Math.round(oM)}%</div>
            <div class="sub">same measure, same week</div>
          </div>
        </div>
        <div class="panel"><div class="chart-box short"><canvas id="ce${i}-trajActiveChart"></canvas></div></div>
        <div class="panel"><div class="chart-box short"><canvas id="ce${i}-trajMsgsChart"></canvas></div></div>
        <div class="notes-grid" style="margin:20px 0 8px;">
          <div class="note-card">
            <span class="note-tag watch">Reading this honestly</span>
            <div class="note-body">Event participants are holding up better than everyone else (${Math.round(pA)}% vs. ${Math.round(oA)}% of pre-event activity). ${gapText}${overlapText}</div>
          </div>
        </div>`;
    } else {
      chatImpactHtml = `<div class="section-desc" style="margin-top:0;">Pending — this event's window hasn't been covered by a Statbot export yet. This will populate automatically once a weekly export covering ${startLabel}–${endLabel} is loaded.</div>`;
    }

    return `
    <div class="event-block">
      <h3 class="event-title">${ev.title}</h3>
      <div class="event-dates">${startLabel} &rarr; ${endLabel} &middot; event #${ev.event_id}</div>

      <div class="stat-strip" style="margin-bottom:28px;">
        <div class="stat">
          <div class="label">Participants</div>
          <div class="value">${fmt(ev.n_participants)}</div>
          <div class="sub">equal to ${ev.pct_of_pre_event_active}% of a normal pre-event week's chatters</div>
        </div>
        <div class="stat">
          <div class="label">Still in Discord</div>
          <div class="value">${ev.in_server_data_reliable ? ev.in_server_pct+'%' : 'n/a'}</div>
          <div class="sub">${ev.in_server_data_reliable ? fmt(ev.in_server_n)+' of '+fmt(ev.n_participants)+', as of this export' : "this export's in-server flag looks broken (every row said \"no\") — not shown"}</div>
        </div>
        <div class="stat">
          <div class="label">No prior chat history</div>
          <div class="value">${ev.pct_no_message_history}%</div>
          <div class="sub">${fmt(ev.n_unmatched_no_message_history)} hadn't chatted in any week before the event started</div>
        </div>
        <div class="stat">
          <div class="label">Already-engaged baseline</div>
          <div class="value">${chatMsgsRatio ? chatMsgsRatio.toFixed(1)+'×' : '—'}</div>
          <div class="sub">participants' own pre-event message rate vs. everyone else's</div>
        </div>
      </div>

      <h3 class="launch-sub-head">Who shows up?</h3>
      <div class="section-desc">Where event participants sit on the leveling ladder right now, compared to a typical recently-active member. Bars well above the baseline mean this event is drawing people who are already deep into the progression system, not pulling in people stuck lower on the ladder.</div>
      <div class="panel"><div class="chart-box" style="height:360px;"><canvas id="ce${i}-ladderChart"></canvas></div></div>

      <h3 class="launch-sub-head">Already-engaged, not new blood</h3>
      <div class="section-desc">Role membership and baseline chat volume among participants, compared to the typical recently-active member (baseline weeks: ${ev.baseline_weeks[0]} through ${ev.baseline_weeks[ev.baseline_weeks.length-1]}, right before this event started).</div>
      <div class="stat-strip" style="margin-bottom:20px;">
        <div class="stat">
          <div class="label">Verified</div>
          <div class="value">${ev.participant_verified_pct}%</div>
          <div class="sub">vs. ${ev.population_verified_pct}% of typical active members</div>
        </div>
        <div class="stat">
          <div class="label">Any Creator tier</div>
          <div class="value">${ev.participant_creator_pct}%</div>
          <div class="sub">vs. ${ev.population_creator_pct}% of typical active members</div>
        </div>
        <div class="stat">
          <div class="label">Alpha Crew</div>
          <div class="value">${ev.participant_alpha_pct}%</div>
          <div class="sub">vs. ${ev.population_alpha_pct}% of typical active members</div>
        </div>
      </div>
      <div class="notes-grid" style="margin-bottom:28px;">
        <div class="note-card">
          <span class="note-tag opp">Reach the chat system misses</span>
          <div class="note-body">${ev.pct_no_message_history}% of participants (${fmt(ev.n_unmatched_no_message_history)} people) had <b>not chatted in any week before the event</b>${ev.no_prior_now_chatting_n ? ` (${fmt(ev.no_prior_now_chatting_n)} of them have posted since)` : ''} — they showed up to play without being chatters. A gameplay event is reaching a slice of the server that the leveling ladder and hoodie program, which are both built on chat activity, structurally can't see.</div>
        </div>
        <div class="note-card">
          <span class="note-tag watch">${chatMsgsRatio && chatMsgsRatio >= 1.8 ? 'Mostly your regulars, for the rest' : 'A broader mix than your regulars'}</span>
          <div class="note-body">Among participants who <i>do</i> have chat history, they were already messaging <b>${chatMsgsRatio ? chatMsgsRatio.toFixed(1) : '?'}×</b> as much as a typical active member before the event even started (median ${fmt(ev.participant_baseline_median_msgs)} vs. ${fmt(ev.population_baseline_median_msgs)} messages/week). ${chatMsgsRatio && chatMsgsRatio >= 1.8
            ? 'Outside of the no-history group above, this event is mostly engaging people who were already your most active chatters, not converting quieter members into chatters.'
            : 'That is only a modest step up, so unlike a smaller event this one is reaching well beyond your heaviest chatters.'}</div>
        </div>
      </div>

      <h3 class="launch-sub-head">Reactivation — who's coming back?</h3>
      <div class="section-desc">Of participants who had chatted at some point before the event, how long had it been since they last chatted, measured as of the last full week before the event started (week of ${shortDate(ev.dormancy_anchor_week)}). Measuring from before the event means anyone the event itself woke up still counts as lapsed, and these numbers won't shift as new weeks load. Buckets further right are longer-lapsed, harder winbacks.</div>
      <div class="panel"><div class="chart-box short"><canvas id="ce${i}-reactivationChart"></canvas></div></div>
      <div class="notes-grid" style="margin:20px 0 28px;">
        <div class="note-card">
          <span class="note-tag opp">${fmt(ev.winback_n)} winback candidates</span>
          <div class="note-body"><b>${ev.winback_pct_of_participants}%</b> of all participants (${fmt(ev.winback_n)} people) hadn't chatted in 5+ weeks before this event${ev.in_server_data_reliable ? ` — and <b>${fmt(ev.winback_in_server_n)}</b> of those ${fmt(ev.winback_n)} are still in the server right now` : ''}. Combined with the ${ev.pct_no_message_history}% who hadn't chatted before at all, roughly ${Math.round(ev.winback_pct_of_participants + ev.pct_no_message_history)}% of this event's turnout came from outside the already-active core.</div>
        </div>
        <div class="note-card">
          <span class="note-tag watch">Mostly casual chatters, not lost regulars</span>
          <div class="note-body">The longest-lapsed group (13+ weeks quiet) were mostly light chatters even back when active — a median of ${ev.reactivation_breakdown[3].hist_avg_msgs_median!=null ? fmt1(ev.reactivation_breakdown[3].hist_avg_msgs_median) : '?'} messages/week on average, ${ev.reactivation_breakdown[3].hist_max_msgs_median!=null ? fmt(ev.reactivation_breakdown[3].hist_max_msgs_median) : '?'} at their single busiest week. This reads as re-engaging drifted casual members, not winning back lost top contributors.</div>
        </div>
      </div>

      <h3 class="launch-sub-head">Who actually chatted?</h3>
      ${chatAfterHtml}

      <h3 class="launch-sub-head">Did they stick around?</h3>
      <div class="section-desc">The real test of a winback: do the reactivated and never-chatted participants above keep showing up after the event ends, or was this a one-off blip? Compared against participants who were already active going in, so a general up/down swing in the whole server isn't mistaken for this event's effect.</div>
      ${ev.post_event_retention ? `
      <div class="stat-strip" style="margin-bottom:28px;">
        <div class="stat">
          <div class="label">Winback (5+ wks dormant)</div>
          <div class="value">${ev.post_event_retention.winback_5wk_plus.pct_returned}%</div>
          <div class="sub">of ${fmt(ev.post_event_retention.winback_5wk_plus.n)} returned at least once after</div>
        </div>
        <div class="stat">
          <div class="label">Long dormant (13+ wks)</div>
          <div class="value">${ev.post_event_retention.long_dormant_13wk_plus.pct_returned}%</div>
          <div class="sub">of ${fmt(ev.post_event_retention.long_dormant_13wk_plus.n)} returned at least once after</div>
        </div>
        <div class="stat">
          <div class="label">Never chatted before</div>
          <div class="value">${ev.post_event_retention.never_chatted_before.pct_returned}%</div>
          <div class="sub">of ${fmt(ev.post_event_retention.never_chatted_before.n)} returned at least once after</div>
        </div>
        <div class="stat">
          <div class="label">Already-active baseline</div>
          <div class="value">${ev.post_event_retention.currently_active_baseline.pct_returned}%</div>
          <div class="sub">of ${fmt(ev.post_event_retention.currently_active_baseline.n)}, for comparison</div>
        </div>
      </div>` : `
      <div class="section-desc" style="margin-top:0;">Pending — no week after this event's end date (${endLabel}) has been loaded yet. This will populate automatically, and keep improving, as more post-event weekly exports come in.</div>`}

      <h3 class="launch-sub-head">Reward tiers &amp; scores</h3>
      <div class="section-desc">Score is this event's own in-game counter (boss kills). Rewards are tiered by rank, not by an absolute score threshold.</div>
      <div class="stat-strip" style="margin-bottom:20px;">${tierRows}</div>
      <div class="panel"><div class="chart-box short"><canvas id="ce${i}-scoreChart"></canvas></div></div>

      <h3 class="launch-sub-head">Chat impact during the event</h3>
      <div class="section-desc">Did chatting move for event participants differently than for everyone else? We take people who were regular chatters in the weeks before (chatted in 2+ of the 4 weeks before the baseline), split them into event participants vs. everyone else, and follow each group week by week. Each line is scaled so its own pre-event average = 100. "Messages per person" counts anyone who stopped chatting as zero, so it can't be flattered by only counting who's left.</div>
      ${chatImpactHtml}
    </div>`;
  }).join('');

  events.forEach((ev, i) => {
    const ladderEl = document.getElementById(`ce${i}-ladderChart`);
    if (ladderEl) {
      const labels = LEVEL_BUCKET_ORDER.filter(l => (ev.participant_level_dist[l]||0) > 0 || (ev.population_level_dist[l]||0) > 0);
      new Chart(ladderEl, {
        type:'bar',
        data:{
          labels: labels.map(l => LEVEL_BUCKET_SHORT[l] || l),
          datasets:[
            {
              label:'Event participants',
              data: labels.map(l => ev.participant_level_dist[l] || 0),
              backgroundColor: COLORS.amber
            },
            {
              label:'Typical active member',
              data: labels.map(l => ev.population_level_dist[l] || 0),
              backgroundColor: COLORS.inkFaint
            }
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          indexAxis:'y',
          plugins:{ legend:{display:true, position:'top', labels:{boxWidth:12}} },
          scales:{
            x:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% of group'} },
            y:{ grid:{display:false} }
          }
        }
      });
    }
    const reactEl = document.getElementById(`ce${i}-reactivationChart`);
    if (reactEl) {
      new Chart(reactEl, {
        type:'bar',
        data:{
          labels: ev.reactivation_breakdown.map(b=>b.label),
          datasets:[{
            label:'% of participants',
            data: ev.reactivation_breakdown.map(b=>b.pct_of_participants),
            backgroundColor: [COLORS.inkFaint, COLORS.inkDim, COLORS.amberDim, COLORS.rust]
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{callbacks:{
              label:(item)=>{
                const b = ev.reactivation_breakdown[item.dataIndex];
                return `${fmt1(b.pct_of_participants)}% of participants (${fmt(b.n)} people)`;
              }
            }}
          },
          scales:{
            x:{ grid:{display:false} },
            y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% of participants'} }
          }
        }
      });
    }
    const chatAfterEl = document.getElementById(`ce${i}-chatAfterChart`);
    if (chatAfterEl && ev.chat_after) {
      const gs = ev.chat_after.groups;
      new Chart(chatAfterEl, {
        type:'bar',
        data:{
          labels: gs.map(g => g.label),
          datasets:[
            { label:'Event players', data: gs.map(g => g.chatted_pct), backgroundColor: COLORS.amber },
            { label:'Non-players, equally quiet going in', data: gs.map(g => g.control_pct == null ? null : g.control_pct), backgroundColor: COLORS.inkFaint }
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          interaction:{mode:'index', intersect:false},
          plugins:{
            legend:{display:true, position:'top', labels:{boxWidth:12}},
            tooltip:{callbacks:{
              label:(item)=>{
                const g = gs[item.dataIndex];
                if (item.datasetIndex === 0) return `Players: ${fmt1(g.chatted_pct)}% chatted (${fmt(g.chatted_n)} of ${fmt(g.n)})`;
                return g.control_pct == null ? 'No comparison group' : `Non-players: ${fmt1(g.control_pct)}% chatted (of ${fmt(g.control_n)})`;
              }
            }}
          },
          scales:{
            x:{ grid:{display:false} },
            y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'% who chatted in the event week'} }
          }
        }
      });
    }
    const scoreEl = document.getElementById(`ce${i}-scoreChart`);
    if (scoreEl) {
      new Chart(scoreEl, {
        type:'bar',
        data:{
          labels: ev.score_hist.map(b=>b.bucket),
          datasets:[{
            label:'Participants',
            data: ev.score_hist.map(b=>b.n),
            backgroundColor: COLORS.violet
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false} },
          scales:{
            x:{ grid:{display:false}, title:{display:true,text:'score (boss kills)'} },
            y:{ beginAtZero:true, grid:{color:COLORS.line}, title:{display:true,text:'participants'} }
          }
        }
      });
    }

    const ct = ev.chat_trajectory;
    if (ct && ct.in_event_window.some(Boolean)) {
      const trajLabels = ct.weeks.map((w, k) => {
        const d = new Date(w + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'});
        return ct.in_event_window[k] ? d + ' (event)' : d;
      });
      const mkTraj = (elId, key, title) => {
        const el = document.getElementById(elId);
        if (!el) return;
        new Chart(el, {
          type:'line',
          data:{
            labels: trajLabels,
            datasets:[
              { label:`Event participants (${fmt(ct.participants.n)} people)`, data: ct.participants[key], borderColor: COLORS.amber, backgroundColor: COLORS.amber, tension:0.25, pointRadius:3, borderWidth:2.5 },
              { label:`Everyone else (${fmt(ct.others.n)} people)`, data: ct.others[key], borderColor: COLORS.inkDim, backgroundColor: COLORS.inkDim, borderDash:[4,3], tension:0.25, pointRadius:3, borderWidth:2 }
            ]
          },
          options:{
            responsive:true, maintainAspectRatio:false,
            interaction:{mode:'index', intersect:false},
            plugins:{
              legend:{display:true, position:'top', labels:{boxWidth:12}},
              title:{display:true, text:title}
            },
            scales:{
              x:{ grid:{display:false} },
              y:{ grid:{color:COLORS.line}, title:{display:true, text:'pre-event average = 100'} }
            }
          }
        });
      };
      mkTraj(`ce${i}-trajActiveChart`, 'active_idx', 'Share of the group that chatted at all, each week');
      mkTraj(`ce${i}-trajMsgsChart`, 'msgs_idx', 'Messages per person (non-chatters count as zero), each week');
    }
  });
}
renderCommunityEvents();

// ---------- Detail view ----------
let detailChartInstance = null;
function showDetail(name){
  const section = document.getElementById('detail-section');
  section.style.display = 'block';
  document.getElementById('detail-title').textContent = name + ' — full trend';
  const series = cohorts[name];
  if (detailChartInstance) detailChartInstance.destroy();
  detailChartInstance = new Chart(document.getElementById('detailChart'), {
    type:'bar',
    data:{
      labels: weekLabels,
      datasets:[
        { type:'bar', label:'Total messages (cohort)', data: series.map(s=>s.total_msgs_member), backgroundColor:'rgba(232,162,76,0.35)', yAxisID:'y2', order:3 },
        { type:'line', label:'Members (raw count)', data: series.map(s=>s.members), borderColor: COLORS.amber, backgroundColor:'rgba(232,162,76,0.08)', fill:true, tension:0.3, yAxisID:'y', pointRadius:2, borderWidth:2, order:1 },
        { type:'line', label:'Median messages (members)', data: series.map(s=>s.median_msg_member), borderColor: COLORS.moss, yAxisID:'y1', tension:0.3, pointRadius:2, borderWidth:2, order:2 },
        { type:'line', label:'Median messages (everyone else)', data: series.map(s=>s.median_msg_nonmember), borderColor: COLORS.inkFaint, borderDash:[3,3], yAxisID:'y1', tension:0.3, pointRadius:2, borderWidth:1.5, order:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index', intersect:false},
      plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}} },
      scales:{
        x:{ grid:{color:COLORS.line} },
        y:{ position:'left', title:{display:true,text:'members'}, grid:{color:COLORS.line} },
        y1:{ position:'right', title:{display:true,text:'median messages/week'}, grid:{display:false} },
        y2:{ display:false }
      }
    }
  });
  section.scrollIntoView({behavior:'smooth', block:'start'});
}

}
initDashboard();
