#!/usr/bin/env python3
"""
Rebuilds data.json for the Colony Field Report dashboard from raw weekly
Discord/Statbot cohort exports.

Usage:
    python3 build_data.py export1.csv export2.csv ... [--corrections corrections.csv]

Pass every CSV export you have (Q1, Q2, this week's new one, etc) — the
script concatenates them, drops exact-duplicate rows (a known Statbot export
quirk), sorts by week, and recomputes every metric the dashboard uses. It
overwrites data.json in the current directory.

Optional: --corrections corrections.csv
    Some historical weeks were undercounted due to a Statbot export cap
    (~10,000 rows/week). If you've manually looked up true numbers via
    Statbot's dashboard, pass them here as a CSV with columns:
    week_start, true_active_users, true_total_messages, notes
    (see capped_weeks_correction_template.csv for the known affected weeks).
    Any row left blank is treated as still-capped and flagged as such rather
    than corrected.

Optional: --membership-csv joins_leaves.csv --current-members 442034
    Adds the Membership Churn section, built from Discord's own official
    joins/leaves export (Server Settings > Insights > Members > Export CSV),
    NOT the Statbot cohort export -- a different file with columns:
    timestamp, joins, leaves. --current-members is the current total server
    member count shown on that same page, used to anchor an estimated
    standing-membership figure for each week (needed to compute a real churn
    rate rather than a joins-distorted one). If this file isn't provided,
    the Membership Churn section is simply omitted from the dashboard.

Optional: --events-csv events.csv
    Adds the Event Log section and timeline markers, from a CSV with columns:
    date, category, title, description. Category should be one of:
    program_launch, feature_launch, milestone, application_cycle, game_update,
    leadership, incident. See curated_events.csv for the existing list --
    add new rows to it as new events happen and re-pass it each week.

Requirements: pip install pandas
"""
import sys, json
import pandas as pd

ANIMAL_COLS = ['Gorilla LVL 1','Cat LVL 2','Mole LVL 3','Racoon LVL 4','Bunny LVL 5','Frog LVL 6',
'Turkey LVL 10','Bat LVL 15','Deer LVL 20','Tiger LVL 30','Capybara LVL 40','Chameleon LVL 50',
'Duck LVL 60','Rat LVL 70','Crow LVL 80','T-Rex LVL 90']

COHORT_COLS = ['7-Day Streak','14-Day Streak','Creator','Creator Bean','Creator Bronze','Creator Silver',
'Creator Gold','Creator Galaxy','Creator Mythic','Verified','Alpha Crew'] + ANIMAL_COLS + ['Animals']

# Weeks with confirmed data loss (not an export cap, an actual outage) --
# active_users/total_messages for these weeks are known-low and shown flagged
# in the dashboard rather than corrected, since we don't have true numbers.
DATA_LOSS_WEEKS = ['2026-06-22']

# The community-management cutoff used for the pre/post narrative stats.
NARRATIVE_CUTOFF = '2025-11-03'

def main(csv_paths, corrections_path=None, membership_csv_path=None, current_members=None, events_csv_path=None):
    if not csv_paths:
        print("Usage: python3 build_data.py export1.csv [export2.csv ...] [--corrections corrections.csv] "
              "[--membership-csv joins_leaves.csv --current-members 442034]")
        sys.exit(1)

    frames = [pd.read_csv(p) for p in csv_paths]
    df = pd.concat(frames, ignore_index=True)
    df['Week Start'] = pd.to_datetime(df['Week Start'])
    df = df.sort_values('Week Start')

    # Step 1: drop exact full-row duplicates -- a known Statbot export quirk
    # (seen in one historical file: ~39k fully-identical duplicate rows).
    # Safe to drop since every column, including message count, matches.
    before = len(df)
    df = df.drop_duplicates()
    if len(df) != before:
        print(f"Dropped {before - len(df)} exact-duplicate rows (identical across every column -- "
              f"a known export artifact, safe to remove).")

    # Step 2: check for remaining same-user-same-week rows that DON'T match exactly --
    # this is a more serious signal (conflicting data for the same person/week) and
    # gets a loud warning rather than a silent drop.
    conflict_mask = df.duplicated(subset=['Discord ID', 'Week Start'], keep=False)
    if conflict_mask.any():
        n_conflicts = df[conflict_mask].groupby(['Discord ID','Week Start']).ngroups
        print(f"WARNING: {n_conflicts} user-weeks have CONFLICTING duplicate rows (same person, same week, "
              f"different values). Keeping the first occurrence for each, but this should be investigated -- "
              f"it means two different message counts exist for the same person/week.")
        df = df.drop_duplicates(subset=['Discord ID', 'Week Start'], keep='first')

    weeks = sorted(df['Week Start'].unique())
    week_labels = [w.strftime('%b %-d') for w in weeks]
    animal_level_num = {c: i for i, c in enumerate(ANIMAL_COLS)}
    df['any_tier'] = df[ANIMAL_COLS].any(axis=1)

    overall, cohort_weekly = [], {c: [] for c in COHORT_COLS}
    for w in weeks:
        wdf = df[df['Week Start'] == w]
        active = len(wdf)
        overall.append({
            "week": w.strftime('%Y-%m-%d'),
            "active_users": int(active),
            "total_messages": int(wdf['Weekly Messages'].sum()),
            "median_messages": float(wdf['Weekly Messages'].median()) if active else 0
        })
        for c in COHORT_COLS:
            members = wdf[wdf[c] == True]
            nonmembers = wdf[wdf[c] == False]
            n = len(members)
            cohort_weekly[c].append({
                "week": w.strftime('%Y-%m-%d'),
                "members": int(n),
                "pct_of_active": round(100 * n / active, 2) if active else 0,
                "total_msgs_member": int(members['Weekly Messages'].sum()),
                "median_msg_member": float(members['Weekly Messages'].median()) if n > 0 else 0,
                "median_msg_nonmember": float(nonmembers['Weekly Messages'].median()) if len(nonmembers) > 0 else 0
            })

    # ---------- current-week tier bucket (for volume/headcount contribution) ----------
    # Split cleanly: has a ladder tier > has Animals but no tier yet > has no role at all.
    def bucket_row(row):
        for c in ANIMAL_COLS[::-1]:
            if row[c]:
                return c
        if row['Animals']:
            return 'Animals only (no tier)'
        return 'No role at all'
    df['tier_bucket'] = df.apply(bucket_row, axis=1)
    tier_bucket_labels = ['No role at all', 'Animals only (no tier)'] + ANIMAL_COLS
    weekly_tier_volume, weekly_tier_members = [], []
    for w in weeks:
        wdf = df[df['Week Start'] == w]
        vol_row = {"week": w.strftime('%Y-%m-%d')}
        mem_row = {"week": w.strftime('%Y-%m-%d')}
        for label in tier_bucket_labels:
            bucket = wdf[wdf['tier_bucket'] == label]
            vol_row[label] = int(bucket['Weekly Messages'].sum())
            mem_row[label] = int(len(bucket))
        weekly_tier_volume.append(vol_row)
        weekly_tier_members.append(mem_row)

    # ---------- activation: 3+ messages in first appearance week ----------
    week_idx_map = {w: i for i, w in enumerate(weeks)}
    df['week_idx'] = df['Week Start'].map(week_idx_map)
    first_seen_idx = df.groupby('Discord ID')['week_idx'].min().to_dict()
    df['is_first_week'] = df.apply(lambda r: first_seen_idx[r['Discord ID']] == r['week_idx'], axis=1)
    first_week_rows = df[df['is_first_week']].drop_duplicates(subset=['Discord ID'])
    overall_activation_rate = round(100 * (first_week_rows['Weekly Messages'] >= 3).mean(), 1)
    activation_trend = []
    for w_i, w in enumerate(weeks):
        cohort = first_week_rows[first_week_rows['week_idx'] == w_i]
        n = len(cohort)
        rate = round(100 * (cohort['Weekly Messages'] >= 3).mean(), 1) if n > 0 else None
        activation_trend.append({"week": w.strftime('%Y-%m-%d'), "new_users": int(n), "activation_rate": rate})

    # ---------- stickiness: distinct weeks active per user ----------
    weeks_active = df.groupby('Discord ID')['week_idx'].nunique()
    bins = [(1,1),(2,2),(3,4),(5,8),(9,13),(14,20),(21, len(weeks))]
    sticky_hist = []
    for lo, hi in bins:
        if lo > len(weeks): continue
        hi = min(hi, len(weeks))
        cnt = int(((weeks_active >= lo) & (weeks_active <= hi)).sum())
        label = f"{lo}" if lo == hi else f"{lo}-{hi}"
        sticky_hist.append({"label": label + (" wks" if hi > 1 else " wk"), "count": cnt})

    # ---------- pre/post community-management retention comparison ----------
    first_seen_series = df.groupby('Discord ID')['week_idx'].min()
    active_weeks_by_user = df.groupby('Discord ID')['week_idx'].apply(set)
    n_weeks = len(weeks)

    def retention_curve(ids, max_offset=20, min_n=30):
        curve = []
        ids = set(ids)
        for k in range(max_offset + 1):
            eligible = [uid for uid in ids if first_seen_series[uid] + k <= n_weeks - 1]
            denom = len(eligible)
            if denom < min_n:
                break
            numer = sum(1 for uid in eligible if (first_seen_series[uid] + k) in active_weeks_by_user[uid])
            curve.append({"offset": k, "pct": round(100 * numer / denom, 1), "n": denom})
        return curve

    cutoff_ts = pd.Timestamp(NARRATIVE_CUTOFF)
    prepost_retention = None
    week_to_idx = {w: i for i, w in enumerate(weeks)}
    if cutoff_ts in week_to_idx:
        cutoff_idx = week_to_idx[cutoff_ts]
        pre_ids = first_seen_series[first_seen_series < cutoff_idx].index
        post_ids = first_seen_series[first_seen_series >= cutoff_idx].index
        if len(pre_ids) >= 30 and len(post_ids) >= 30:
            prepost_retention = {
                "pre_curve": retention_curve(pre_ids),
                "post_curve": retention_curve(post_ids),
                "pre_n": int(len(pre_ids)),
                "post_n": int(len(post_ids))
            }

    first_seen = df.groupby('Discord ID')['Week Start'].min().to_dict()
    df['is_new_this_week'] = df.apply(lambda r: first_seen[r['Discord ID']] == r['Week Start'], axis=1)
    new_vs_returning = []
    for w in weeks:
        wdf = df[df['Week Start'] == w]
        new_vs_returning.append({
            "week": w.strftime('%Y-%m-%d'),
            "new_users": int(wdf['is_new_this_week'].sum()),
            "returning_users": int((~wdf['is_new_this_week']).sum())
        })

    # ---------- cohort overlap (ever-true membership across full dataset) ----------
    OVERLAP_COHORTS = ['7-Day Streak','14-Day Streak','Creator','Creator Bean','Creator Bronze','Creator Silver',
    'Creator Gold','Creator Galaxy','Creator Mythic','Verified','Alpha Crew']
    ov_grp = df.groupby('Discord ID').agg(
        **{c: (c, 'max') for c in OVERLAP_COHORTS},
        **{'Reached a tier': ('any_tier', 'max')}
    )
    overlap_labels = OVERLAP_COHORTS + ['Reached a tier']
    overlap_sizes = {l: int(ov_grp[l].sum()) for l in overlap_labels}
    overlap_matrix = {}
    for r in overlap_labels:
        overlap_matrix[r] = {}
        r_members = ov_grp[ov_grp[r] == True]
        r_size = len(r_members)
        for c in overlap_labels:
            overlap_matrix[r][c] = round(100 * float(r_members[c].sum()) / r_size, 1) if r_size > 0 else 0.0

    # ---------- Year-over-year: full weekly history, corrected + flagged ----------
    weekly_base = df.groupby('Week Start').agg(
        active_users=('Discord ID', 'nunique'),
        total_messages=('Weekly Messages', 'sum'),
        median_messages=('Weekly Messages', 'median')
    ).reset_index().sort_values('Week Start')

    corrections_map_users, corrections_map_msgs = {}, {}
    if corrections_path:
        corr_df = pd.read_csv(corrections_path)
        corr_df['week_start'] = pd.to_datetime(corr_df['week_start'])
        for _, r in corr_df.iterrows():
            if pd.notna(r.get('true_active_users')) and str(r['true_active_users']).strip() != '':
                corrections_map_users[r['week_start']] = int(r['true_active_users'])
            if pd.notna(r.get('true_total_messages')) and str(r['true_total_messages']).strip() != '':
                val = str(r['true_total_messages']).replace(',', '')
                corrections_map_msgs[r['week_start']] = int(val)

    data_loss_dates = set(pd.to_datetime(DATA_LOSS_WEEKS))
    weeks_set_full = set(weekly_base['Week Start'])

    full_history = []
    weekly_final = {}
    for _, r in weekly_base.iterrows():
        w = r['Week Start']
        active_final = corrections_map_users.get(w, int(r['active_users']))
        msgs_final = corrections_map_msgs.get(w, int(r['total_messages']))
        # Note: median_messages is NOT corrected for capped weeks -- we only have an aggregate
        # override for active_users/total_messages, not the underlying per-user rows, so the
        # median for those 26 weeks is computed from the partial (capped) row set only. Flagged
        # the same is_corrected way so the dashboard can caveat it rather than presenting it as exact.
        median_val = float(r['median_messages'])
        is_corrected = w in corrections_map_users
        is_data_loss = w in data_loss_dates
        weekly_final[w] = {'active': active_final, 'msgs': msgs_final, 'median': median_val}
        full_history.append({
            "week": w.strftime('%Y-%m-%d'),
            "week_label": w.strftime('%b %-d, %Y'),
            "active_users": active_final,
            "total_messages": msgs_final,
            "median_messages": median_val,
            "is_corrected": bool(is_corrected),
            "is_data_loss": bool(is_data_loss)
        })

    # matched year-ago pairs (exact 364-day / 52-week alignment)
    yoy_pairs = []
    for _, r in weekly_base.iterrows():
        w = r['Week Start']
        prior = w - pd.Timedelta(days=364)
        if prior not in weeks_set_full:
            continue
        cur, pri = weekly_final[w], weekly_final[prior]
        yoy_pairs.append({
            "current_week": w.strftime('%Y-%m-%d'),
            "current_week_label": w.strftime('%b %-d'),
            "prior_week": prior.strftime('%Y-%m-%d'),
            "current_active": cur['active'], "prior_active": pri['active'],
            "pct_change_active": round(100*(cur['active']-pri['active'])/pri['active'],1) if pri['active'] else None,
            "current_messages": cur['msgs'], "prior_messages": pri['msgs'],
            "pct_change_messages": round(100*(cur['msgs']-pri['msgs'])/pri['msgs'],1) if pri['msgs'] else None,
            "current_median": cur['median'], "prior_median": pri['median'],
            "pct_change_median": round(100*(cur['median']-pri['median'])/pri['median'],1) if pri['median'] else None,
            "current_is_corrected": w in corrections_map_users,
            "current_is_data_loss": w in data_loss_dates,
            "prior_is_corrected": prior in corrections_map_users
        })

    # ladder tier totals, full history (no correction needed -- not affected by the row cap
    # in the same way, since it's a per-tier count rather than a totals figure... note this
    # still inherits the cap's truncation if a week was capped, so treat as directional for those weeks)
    ladder_hist_df = df.groupby('Week Start')[ANIMAL_COLS].sum().reset_index().sort_values('Week Start')
    ladder_history = []
    for _, r in ladder_hist_df.iterrows():
        entry = {"week": r['Week Start'].strftime('%Y-%m-%d')}
        for c in ANIMAL_COLS:
            entry[c] = int(r[c])
        ladder_history.append(entry)

    # pre/post narrative stats around the community-management cutoff, if we have data spanning both sides
    cutoff = pd.Timestamp(NARRATIVE_CUTOFF)
    pre_weeks = [w for w in weekly_base['Week Start'] if w < cutoff]
    post_weeks = [w for w in weekly_base['Week Start'] if w >= cutoff and w not in data_loss_dates]
    narrative_stats = None
    if len(pre_weeks) >= 4 and len(post_weeks) >= 4:
        import numpy as np
        def period_stats(week_list, label):
            vals = np.array([weekly_final[w]['active'] for w in sorted(week_list)])
            x = np.arange(len(vals))
            slope, _ = np.polyfit(x, vals, 1)
            return {
                "label": label, "weeks": len(vals), "mean_active": int(vals.mean()),
                "peak": int(vals.max()), "trough": int(vals.min()),
                "peak_to_trough_pct": round(100*(vals.max()-vals.min())/vals.max(),1),
                "cv_pct": round(100*vals.std()/vals.mean(),1),
                "trend_per_week": round(float(slope),1),
                "net_change_pct": round(100*(vals[-1]-vals[0])/vals[0],1)
            }
        narrative_stats = {
            "cutoff_date": NARRATIVE_CUTOFF,
            "pre": period_stats(pre_weeks, "Pre-November 2025"),
            "post": period_stats(post_weeks, "Post-November 2025")
        }

    # ---------- Membership churn, from Discord's own joins/leaves export (optional) ----------
    membership_churn = None
    if membership_csv_path and current_members:
        mdf = pd.read_csv(membership_csv_path)
        mdf['timestamp'] = pd.to_datetime(mdf['timestamp'])
        mdf = mdf.sort_values('timestamp')
        mdf = mdf[(mdf['joins'] > 0) | (mdf['leaves'] > 0)]  # trim leading all-zero rows
        mdf['net'] = mdf['joins'] - mdf['leaves']
        mdf['cumulative_net'] = mdf['net'].cumsum()
        offset = current_members - mdf['cumulative_net'].iloc[-1]
        mdf['est_standing_members'] = mdf['cumulative_net'] + offset
        mdf['churn_rate_pct'] = round(100 * mdf['leaves'] / mdf['est_standing_members'], 2)
        mdf['growth_rate_pct'] = round(100 * mdf['joins'] / mdf['est_standing_members'], 2)

        m_weekly = []
        for _, r in mdf.iterrows():
            m_weekly.append({
                "week": r['timestamp'].strftime('%Y-%m-%d'),
                "week_label": r['timestamp'].strftime('%b %-d, %Y'),
                "joins": int(r['joins']), "leaves": int(r['leaves']), "net": int(r['net']),
                "est_standing_members": int(r['est_standing_members']),
                "churn_rate_pct": float(r['churn_rate_pct']), "growth_rate_pct": float(r['growth_rate_pct'])
            })

        m_cutoff = pd.Timestamp(NARRATIVE_CUTOFF, tz=mdf['timestamp'].dt.tz)
        m_pre = mdf[mdf['timestamp'] < m_cutoff]
        m_post = mdf[mdf['timestamp'] >= m_cutoff]

        def m_period(d, label):
            return {
                "label": label, "weeks": len(d),
                "avg_joins": round(float(d['joins'].mean()), 0),
                "avg_leaves": round(float(d['leaves'].mean()), 0),
                "avg_net": round(float(d['net'].mean()), 0),
                "avg_churn_rate_pct": round(float(d['churn_rate_pct'].mean()), 2),
                "median_churn_rate_pct": round(float(d['churn_rate_pct'].median()), 2),
                "avg_standing_members": round(float(d['est_standing_members'].mean()), 0)
            }

        if len(m_pre) >= 4 and len(m_post) >= 4:
            membership_churn = {
                "weekly": m_weekly,
                "pre": m_period(m_pre, "Pre-November 2025"),
                "post": m_period(m_post, "Post-November 2025"),
                "cutoff_date": NARRATIVE_CUTOFF,
                "current_total_members": current_members,
                "note": "Standing membership is estimated by cumulative net change (joins - leaves), "
                        "anchored to the provided current total. Leading all-zero rows excluded."
            }

    # ---------- Curated events (optional) ----------
    events_out = []
    if events_csv_path:
        ev_df = pd.read_csv(events_csv_path)
        ev_df['date'] = pd.to_datetime(ev_df['date'])
        for _, r in ev_df.sort_values('date').iterrows():
            events_out.append({
                "date": r['date'].strftime('%Y-%m-%d'),
                "date_label": r['date'].strftime('%b %-d, %Y'),
                "category": r['category'],
                "title": r['title'],
                "description": r['description']
            })

    output = {
        "meta": {
            "total_rows": len(df),
            "unique_users": int(df['Discord ID'].nunique()),
            "weeks": [w.strftime('%Y-%m-%d') for w in weeks],
            "week_labels": week_labels,
            "date_range": [weeks[0].strftime('%Y-%m-%d'), weeks[-1].strftime('%Y-%m-%d')],
            "quarter_boundary_week": "2026-03-30"
        },
        "overall": overall,
        "cohorts": cohort_weekly,
        "new_vs_returning": new_vs_returning,
        "tier_contribution": {
            "tier_bucket_labels": tier_bucket_labels,
            "weekly_tier_volume": weekly_tier_volume,
            "weekly_tier_members": weekly_tier_members
        },
        "activation": {
            "overall_rate": overall_activation_rate,
            "n_users": len(first_week_rows),
            "trend": activation_trend
        },
        "stickiness_hist": sticky_hist,
        "prepost_retention": prepost_retention,
        "overlap": {
            "overlap_labels": overlap_labels,
            "overlap_sizes": overlap_sizes,
            "overlap_matrix": overlap_matrix
        },
        "yoy": {
            "full_history": full_history,
            "yoy_pairs": yoy_pairs,
            "ladder_history": ladder_history,
            "ladder_cols": ANIMAL_COLS,
            "narrative_stats": narrative_stats
        },
        "membership_churn": membership_churn,
        "events": events_out
    }

    with open('data.json', 'w') as f:
        json.dump(output, f)

    print(f"Wrote data.json — {len(weeks)} weeks, {len(df)} rows, {df['Discord ID'].nunique()} unique members.")

if __name__ == '__main__':
    args = sys.argv[1:]
    corrections_arg = None
    membership_csv_arg = None
    current_members_arg = None

    def pop_flag(flag, args):
        if flag in args:
            idx = args.index(flag)
            val = args[idx + 1]
            return val, args[:idx] + args[idx + 2:]
        return None, args

    corrections_arg, args = pop_flag('--corrections', args)
    membership_csv_arg, args = pop_flag('--membership-csv', args)
    current_members_arg, args = pop_flag('--current-members', args)
    events_csv_arg, args = pop_flag('--events-csv', args)
    current_members_arg = int(current_members_arg) if current_members_arg else None

    main(args, corrections_path=corrections_arg,
         membership_csv_path=membership_csv_arg, current_members=current_members_arg,
         events_csv_path=events_csv_arg)
