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
