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
document.getElementById('stat-strip').innerHTML = statStripHtml;
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

// Event markers: map each curated event to its nearest week index in fh, for overlay
const events = DATA.events || [];
const EVENT_COLORS = {
  program_launch: COLORS.moss,
  feature_launch: COLORS.violet,
  milestone: COLORS.amber,
  application_cycle: COLORS.inkDim,
  game_update: COLORS.inkFaint,
  leadership: COLORS.rust,
  incident: COLORS.rust
};
const fhDates = fh.map(w => new Date(w.week).getTime());
function nearestFhIndex(dateStr){
  const t = new Date(dateStr).getTime();
  let best = 0, bestDiff = Infinity;
  fhDates.forEach((d,i)=>{ const diff = Math.abs(d-t); if (diff<bestDiff){bestDiff=diff; best=i;} });
  // only place a marker if within ~4 days of an actual week start, else event predates chart range
  return bestDiff <= 4*86400000 ? best : null;
}
const eventMarkers = events.map(e => ({ ...e, idx: nearestFhIndex(e.date) })).filter(e => e.idx !== null);

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
        type:'scatter',
        data: eventMarkers.map(e => ({ x: e.idx, y: 0.5 })),
        pointBackgroundColor: eventMarkers.map(e => EVENT_COLORS[e.category] || COLORS.inkDim),
        pointBorderColor: 'transparent',
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'yEvents',
        showLine: false
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
            const e = eventMarkers[ctx.dataIndex];
            return `${e.date_label}: ${e.title}`;
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

new Chart(document.getElementById('yoyDepthChart'), {
  type:'line',
  plugins: [yoyBoundaryPlugin],
  data:{
    labels: fh.map(w=>w.week_label),
    datasets:[{
      label:'Median messages/active member',
      data: fh.map(w=>w.median_messages),
      borderColor: COLORS.moss,
      backgroundColor: 'rgba(127,191,143,0.06)',
      fill: true, tension:0.25, borderWidth:2,
      pointRadius: fh.map(w => w.is_corrected ? 3 : 0),
      pointBackgroundColor: COLORS.violet,
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{ callbacks:{ afterLabel: (ctx)=>{
        const w = fh[ctx.dataIndex];
        if (w.is_corrected) return '* Headcount corrected this week, but this median is from partial data only';
        return '';
      }}}
    },
    scales:{
      x:{ grid:{display:false}, ticks:{maxTicksLimit:12} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'median messages/week'} }
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
    <th>Depth, this year</th>
    <th>Depth, last year</th>
    <th>Depth change</th>
  </tr>
  ${recentPairs.map(p => `
    <tr>
      <td style="text-align:left;color:var(--ink);">${p.current_week_label}${p.current_is_data_loss?' †':''}</td>
      <td>${fmt(p.current_active)}</td>
      <td>${fmt(p.prior_active)}${p.prior_is_corrected?' *':''}</td>
      <td style="color:${p.pct_change_active>=0?'var(--moss)':'var(--rust)'};font-weight:600;">${p.pct_change_active>=0?'+':''}${p.pct_change_active}%</td>
      <td>${fmt1(p.current_median)}</td>
      <td>${fmt1(p.prior_median)}${p.prior_is_corrected?' *':''}</td>
      <td style="color:${p.pct_change_median>=0?'var(--moss)':'var(--rust)'};font-weight:600;">${p.pct_change_median>=0?'+':''}${p.pct_change_median}%</td>
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
  incident: 'Incident'
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

// ---------- 01 Census chart ----------
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

new Chart(document.getElementById('censusChart'), {
  type:'line',
  plugins: boundaryIdx>=0 ? [quarterMarkerPlugin] : [],
  data:{
    labels: weekLabels,
    datasets:[
      {
        label:'Active members',
        data: overall.map(w=>w.active_users),
        borderColor: COLORS.amber, backgroundColor:'rgba(232,162,76,0.08)',
        yAxisID:'y', tension:0.3, fill:true, pointRadius:2, borderWidth:2
      },
      {
        label:'Total messages',
        data: overall.map(w=>w.total_messages),
        borderColor: COLORS.violet, backgroundColor:'transparent',
        yAxisID:'y1', tension:0.3, pointRadius:2, borderWidth:2, borderDash:[4,3]
      }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index', intersect:false},
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}} },
    scales:{
      x:{ grid:{color:COLORS.line} },
      y:{ position:'left', title:{display:true,text:'active members'}, grid:{color:COLORS.line} },
      y1:{ position:'right', title:{display:true,text:'messages'}, grid:{display:false} }
    }
  }
});

// ---------- Depth of engagement (median messages/active member) ----------
new Chart(document.getElementById('depthChart'), {
  type:'line',
  plugins: boundaryIdx>=0 ? [quarterMarkerPlugin] : [],
  data:{
    labels: weekLabels,
    datasets:[{
      label:'Median messages / active member',
      data: overall.map(w=>w.median_messages),
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

// ---------- 02 New vs returning ----------
new Chart(document.getElementById('newRetChart'), {
  type:'bar',
  data:{
    labels: weekLabels,
    datasets:[
      { label:'Returning', data:newRet.map(w=>w.returning_users), backgroundColor: COLORS.amberDim, stack:'s' },
      { label:'New', data:newRet.map(w=>w.new_users), backgroundColor: COLORS.moss, stack:'s' }
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

// ---------- 05 Ladder ----------
const ladderEl = document.getElementById('ladder');
const maxLadderPop = Math.max(...ANIMAL_COLS.map(c=>cohorts[c][cohorts[c].length-1].members));
ANIMAL_COLS.forEach((name, idx)=>{
  const series = cohorts[name];
  const latest = series[series.length-1];
  const first = series[0];
  const chg = latest.members - first.members;
  const chgClass = chg>0?'up':(chg<0?'down':'flat');
  const pct = maxLadderPop>0 ? (latest.members/maxLadderPop*100) : 0;
  const row = document.createElement('div');
  row.className = 'ladder-row';
  row.style.borderLeftColor = idx===ANIMAL_COLS.length-1 ? COLORS.amber : 'transparent';
  row.innerHTML = `
    <div class="rank">${String(idx+1).padStart(2,'0')}</div>
    <div class="critter">${ANIMAL_EMOJI[name]} ${name}</div>
    <div class="ladder-bar-track"><div class="ladder-bar-fill" style="width:${pct}%"></div></div>
    <div class="pop">${fmt(latest.members)}<span style="color:var(--ink-faint);font-size:10px;"> mem</span></div>
    <div class="pop pop-msgs">${fmt(latest.total_msgs_member)}<span style="color:var(--ink-faint);font-size:10px;"> msgs</span></div>
    <div class="chg delta ${chgClass}">${chg>0?'+':''}${chg}</div>
  `;
  row.addEventListener('click', ()=>showDetail(name));
  row.style.cursor='pointer';
  ladderEl.appendChild(row);
});

// ---------- 06 Activation ----------
const activation = DATA.activation;
const DISCORD_BENCHMARK = 15;

document.getElementById('activation-callouts').innerHTML = `
  <div class="stat">
    <div class="label">Overall activation rate</div>
    <div class="value" style="color:var(--moss)">${activation.overall_rate}%</div>
    <div class="sub">of ${fmt(activation.n_users)} message-senders, 3+ msgs in their first week</div>
  </div>
  <div class="stat">
    <div class="label">Discord's benchmark</div>
    <div class="value">${DISCORD_BENCHMARK}%</div>
    <div class="sub">first-day, 3+ messages (their metric, not ours)</div>
  </div>
  <div class="stat">
    <div class="label">Vs. benchmark</div>
    <div class="value" style="color:var(--moss)">${(activation.overall_rate - DISCORD_BENCHMARK) > 0 ? '+' : ''}${(activation.overall_rate - DISCORD_BENCHMARK).toFixed(1)}pt</div>
    <div class="sub">among people who message at all, well above the reference point</div>
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

// ---------- 07 Tier contribution ----------
const tc = DATA.tier_contribution;
const tierLabels = tc.tier_bucket_labels;
const tierPalette = ['#3A4248', '#5C6B66', ...ANIMAL_COLS.map((_,i)=> `hsl(${30 + i*14}, 55%, ${58 - i*1.5}%)`)];

new Chart(document.getElementById('tierVolumeChart'), {
  type:'bar',
  data:{
    labels: weekLabels,
    datasets: tierLabels.map((label,i)=>({
      label,
      data: tc.weekly_tier_volume.map(w=>w[label]),
      backgroundColor: tierPalette[i],
      stack:'s'
    }))
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'bottom', labels:{boxWidth:9, font:{size:9.5}}} },
    scales:{
      x:{ stacked:true, grid:{display:false} },
      y:{ stacked:true, title:{display:true,text:'messages/week'}, grid:{color:COLORS.line} }
    }
  }
});

// Per-capita: messages per member, latest week, by tier
const latestVol = tc.weekly_tier_volume[tc.weekly_tier_volume.length-1];
const latestMem = tc.weekly_tier_members[tc.weekly_tier_members.length-1];
const perCapita = tierLabels.map(label => latestMem[label]>0 ? +(latestVol[label]/latestMem[label]).toFixed(1) : 0);

new Chart(document.getElementById('tierPerCapitaChart'), {
  type:'bar',
  data:{
    labels: tierLabels,
    datasets:[{
      label:'Messages / member, latest week',
      data: perCapita,
      backgroundColor: tierPalette,
      borderRadius:2
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{display:false}, ticks:{maxRotation:60, minRotation:60, font:{size:10}} },
      y:{ title:{display:true,text:'messages/member'}, grid:{color:COLORS.line} }
    }
  }
});

// ---------- 08 Presence: pre/post-Nov retention & stickiness ----------
const prepostRet = DATA.prepost_retention;
const preCurve = prepostRet.pre_curve, postCurve = prepostRet.post_curve;

// summary stat for the callout: avg retention across offsets 1-12 (solid sample size on both sides)
const avgRange = [1,12];
function avgPct(curve){
  const inRange = curve.filter(r=>r.offset>=avgRange[0] && r.offset<=avgRange[1]);
  return inRange.reduce((a,r)=>a+r.pct,0)/inRange.length;
}
const preAvg = avgPct(preCurve), postAvg = avgPct(postCurve);
const retDiff = postAvg - preAvg;

document.getElementById('prepost-retention-callout').innerHTML = `
  <div class="note-card">
    <span class="note-tag watch">Individual retention, weeks 1-12 average</span>
    <div class="note-body">Members who joined <b>before</b> Nov 3, 2025: <b>${preAvg.toFixed(1)}%</b> average retention.
    Members who joined <b>on/after</b> Nov 3, 2025: <b>${postAvg.toFixed(1)}%</b> average retention.
    A real but modest improvement (${retDiff>=0?'+':''}${retDiff.toFixed(1)}pt, ${(100*retDiff/preAvg).toFixed(1)}% relative) &mdash;
    much smaller than the swing in aggregate weekly headcount stability shown above. That suggests the community-level
    steadiness is more about a more consistent flow of new members each week than dramatically stickier individual behavior.</div>
  </div>
`;

// build a shared label set out to the longer of the two curves
const maxOffset = Math.max(preCurve.length, postCurve.length) - 1;
const offsetLabels = Array.from({length: maxOffset+1}, (_,i)=>`+${i}wk`);
const preByOffset = Object.fromEntries(preCurve.map(r=>[r.offset, r.pct]));
const postByOffset = Object.fromEntries(postCurve.map(r=>[r.offset, r.pct]));

new Chart(document.getElementById('prepostRetentionChart'), {
  type:'line',
  data:{
    labels: offsetLabels,
    datasets:[
      { label:'Joined before Nov 3, 2025', data: offsetLabels.map((_,i)=>preByOffset[i] ?? null),
        borderColor: COLORS.inkFaint, backgroundColor:'transparent', tension:0.25, pointRadius:2, borderWidth:2, borderDash:[4,3] },
      { label:'Joined on/after Nov 3, 2025', data: offsetLabels.map((_,i)=>postByOffset[i] ?? null),
        borderColor: COLORS.moss, backgroundColor:'rgba(127,191,143,0.08)', fill:true, tension:0.25, pointRadius:2, borderWidth:2 }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index', intersect:false},
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}},
      tooltip:{ callbacks:{ afterBody:(items)=>{
        const idx = items[0].dataIndex;
        const preN = preCurve[idx]?.n, postN = postCurve[idx]?.n;
        return [`n=${preN?fmt(preN):'—'} (pre) / ${postN?fmt(postN):'—'} (post)`];
      }}}
    },
    scales:{
      x:{ grid:{display:false}, title:{display:true,text:'weeks since first appearance'} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'% still active'}, min:0, max:100 }
    }
  }
});

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
      x:{ grid:{display:false}, title:{display:true,text:'distinct weeks active, out of 27'} },
      y:{ grid:{color:COLORS.line}, title:{display:true,text:'members'} }
    }
  }
});

// ---------- 09 Movers ----------
const ALL_COHORT_NAMES = Object.keys(cohorts);
const wowDeltas = ALL_COHORT_NAMES.map(name=>{
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

// ---------- 10 Field notes (auto-generated) ----------
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
  body:`<b>${activation.overall_rate}%</b> of message-senders hit 3+ messages in their first week &mdash; well above Discord's ${DISCORD_BENCHMARK}% first-day benchmark, though this is measured against people who message at all, not your full member base. Worth checking whether that gap is real strength in onboarding or just a measurement difference (weekly window vs. their daily one).`
});

const week1Ret = postCurve.find(r=>r.offset===1);
const week8Ret = postCurve.find(r=>r.offset===8);
if (week1Ret && week8Ret) {
  notes.push({
    tag:'risk', label:'Early drop-off',
    body:`Even in the post-November cohort, only <b>${week1Ret.pct}%</b> of members active in their first week are still active the following week, falling to <b>${week8Ret.pct}%</b> by 8 weeks out. Most of the drop happens immediately &mdash; if there's a lever for retention, it's likely in week one, not week eight. The community-management shift improved this only modestly (see Member Presence above) &mdash; early drop-off is still the biggest single pattern in the data.`
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
