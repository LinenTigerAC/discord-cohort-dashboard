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

// ---------- 04 Ladder ----------
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

// ---------- 05 Funnel ----------
const funnel = DATA.funnel;
const stuckTrend = DATA.stuck_trend;

const funnelPct = n => (100*n/funnel.total_users).toFixed(1);
document.getElementById('funnel-callouts').innerHTML = `
  <div class="stat">
    <div class="label">Ever got the Animals role</div>
    <div class="value">${fmt(funnel.ever_animals_total)}</div>
    <div class="sub">${funnelPct(funnel.ever_animals_total)}% of all members</div>
  </div>
  <div class="stat">
    <div class="label">Stuck at Animals, never leveled</div>
    <div class="value" style="color:var(--rust)">${fmt(funnel.stuck_at_animals)}</div>
    <div class="sub down">${(100*funnel.stuck_at_animals/funnel.ever_animals_total).toFixed(1)}% of Animals holders never leveled up</div>
  </div>
  <div class="stat">
    <div class="label">Reached at least Gorilla LVL 1</div>
    <div class="value" style="color:var(--moss)">${fmt(funnel.ever_animals_total - funnel.stuck_at_animals)}</div>
    <div class="sub up">${(100*(funnel.ever_animals_total - funnel.stuck_at_animals)/funnel.ever_animals_total).toFixed(1)}% of Animals holders progressed</div>
  </div>
  <div class="stat">
    <div class="label">Never got Animals at all</div>
    <div class="value">${fmt(funnel.never_entered)}</div>
    <div class="sub">${funnelPct(funnel.never_entered)}% of all members</div>
  </div>
`;

new Chart(document.getElementById('funnelChart'), {
  type:'bar',
  data:{
    labels: funnel.labels,
    datasets:[{
      data: funnel.counts,
      backgroundColor: funnel.labels.map((l,i)=> i===1 ? COLORS.rust : (i===0 ? COLORS.inkFaint : COLORS.amber)),
      borderRadius:2
    }]
  },
  options:{
    indexAxis:'y',
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false},
      tooltip:{ callbacks:{ label: (ctx)=>`${fmt(ctx.parsed.x)} members (${(100*ctx.parsed.x/funnel.total_users).toFixed(1)}%)` } }
    },
    scales:{
      x:{ grid:{color:COLORS.line}, title:{display:true,text:'unique members, highest rung ever reached'} },
      y:{ grid:{display:false} }
    }
  }
});

// Member share vs message-volume share, by funnel bucket — the headline asymmetry
const mb = funnel.msg_buckets;
const bucketDefs = [
  { label:'Never got Animals', members: funnel.never_entered, msgs: mb.never_entered_msgs, color: COLORS.inkFaint },
  { label:'Stuck at Animals', members: funnel.stuck_at_animals, msgs: mb.stuck_msgs, color: COLORS.rust },
  { label:'Reached a tier', members: funnel.ever_animals_total - funnel.stuck_at_animals, msgs: mb.leveled_msgs, color: COLORS.moss }
];
new Chart(document.getElementById('volumeShareChart'), {
  type:'bar',
  data:{
    labels: bucketDefs.map(b=>b.label),
    datasets:[
      { label:'% of members', data: bucketDefs.map(b=>+(100*b.members/funnel.total_users).toFixed(1)), backgroundColor: COLORS.inkDim },
      { label:'% of total messages, full period', data: bucketDefs.map(b=>+(100*b.msgs/funnel.total_all_msgs).toFixed(1)), backgroundColor: COLORS.amber }
    ]
  },
  options:{
    indexAxis:'y',
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}},
      tooltip:{ callbacks:{ afterLabel: (ctx)=>{
        const b = bucketDefs[ctx.dataIndex];
        return ctx.datasetIndex===0 ? `${fmt(b.members)} members` : `${fmt(b.msgs)} messages, full period`;
      }}}
    },
    scales:{
      x:{ grid:{color:COLORS.line}, title:{display:true,text:'% share'}, max:100 },
      y:{ grid:{display:false} }
    }
  }
});

new Chart(document.getElementById('stuckTrendChart'), {
  type:'bar',
  data:{
    labels: weekLabels,
    datasets:[
      { label:'Stuck at Animals (no tier yet)', data: stuckTrend.map(s=>s.stuck_count), backgroundColor: COLORS.rust, yAxisID:'y' },
      { label:'Has at least one tier', data: stuckTrend.map(s=>s.animals_holders - s.stuck_count), backgroundColor: COLORS.moss, yAxisID:'y' }
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top', align:'end', labels:{boxWidth:10, usePointStyle:true}},
      tooltip:{ callbacks:{ afterBody: (items)=>{
        const idx = items[0].dataIndex;
        return `${stuckTrend[idx].stuck_pct}% of this week's Animals holders have no tier yet`;
      }}}
    },
    scales:{
      x:{ stacked:true, grid:{display:false} },
      y:{ stacked:true, grid:{color:COLORS.line} }
    }
  }
});

// ---------- 06 Movers ----------
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

// ---------- 06 Field notes (auto-generated) ----------
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

notes.push({
  tag:'risk', label:'The big one',
  body:`<b>${fmt(funnel.stuck_at_animals)}</b> members (${(100*funnel.stuck_at_animals/funnel.ever_animals_total).toFixed(1)}% of everyone who's ever held the Animals role) have never reached a single tier on the ladder. That's half the community stopping at the entry role &mdash; but they only account for <b>${(100*funnel.msg_buckets.stuck_msgs/funnel.total_all_msgs).toFixed(1)}%</b> of the period's ${fmt(funnel.total_all_msgs)} total messages (${fmt(funnel.msg_buckets.stuck_msgs)} messages). Headcount-wise this is a huge group; volume-wise it's a much smaller lever. See the Funnel section for the full split.`
});

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
    body:`<b>${ANIMAL_EMOJI[ladderMomentum.name]} ${ladderMomentum.name}</b> saw the largest population gain on the leveling ladder across H1 (${ladderMomentum.gain>=0?'+':''}${ladderMomentum.gain} members). Since ranks are cumulative, this is a reasonable proxy for where members are spending time leveling up right now &mdash; though as the Funnel section shows, most people never get this far at all.`
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
