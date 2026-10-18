#!/usr/bin/env python3
"""Redraw the column-operation arrows of the algorithm SVGs as right-angled
connectors (as in Figure 4 of the paper): a trunk rises from the source
column, runs horizontally, and drops into every target column with an
arrowhead. Arrows from one source that are shown together share a trunk;
arrows visible at the same time get separate lanes so they never overlap.
Animation timing (the <animate> element of each arrow) is kept unchanged.

usage: orthoarrows.py IN.svg OUT.svg
"""
import re
import sys

ARROW = re.compile(
    r'<g opacity="(?P<op>[01])">(?P<anim>(?:<animate [^>]*/>)+)'
    r'<path d="M(?P<x1>[\d.]+),(?P<y1>[\d.]+) Q[-\d.]+,[-\d.]+ (?P<x2>[\d.]+),(?P<y2>[\d.]+)"'
    r' fill="none" stroke="(?P<stroke>#[0-9a-fA-F]+)" stroke-width="(?P<sw>[\d.]+)"'
    r' marker-end="url\(#ah\)"(?P<start> marker-start="url\(#ah\)")?/></g>')

GAP = 13      # first lane above (or beside) the arrow base line
STEP = 7      # distance between lanes
R = 4         # corner radius


def visible(anim, op):
    """time intervals (fractions of the cycle) in which the arrow is shown"""
    m = re.search(r'attributeName="opacity" values="([^"]*)" keyTimes="([^"]*)"', anim)
    if not m:
        return [(0.0, 1.0)] if op == '1' else []
    vals = [float(v) for v in m.group(1).split(';')]
    keys = [float(k) for k in m.group(2).split(';')] + [1.0]
    return [(keys[i], keys[i + 1]) for i, v in enumerate(vals) if v > 0.5]


def overlap_t(a, b):
    return any(s1 < e2 and s2 < e1 for s1, e1 in a for s2, e2 in b)


def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def horizontal_path(src, targets, base, lane, dbl):
    """trunk from (src, base) up to the lane, across, and down to the far target;
    returns (trunk path, [drop paths for the other targets])"""
    left = [t for t in targets if t < src]
    right = [t for t in targets if t > src]
    paths = []
    for side in (right, left):
        if not side:
            continue
        far = max(side, key=lambda t: abs(t - src))
        d = 1 if far > src else -1
        paths.append(
            f'M{f(src)},{f(base)} V{f(lane + R)} Q{f(src)},{f(lane)} {f(src + d * R)},{f(lane)}'
            f' H{f(far - d * R)} Q{f(far)},{f(lane)} {f(far)},{f(lane + R)} V{f(base)}')
        for t in side:
            if t != far:
                paths.append(f'M{f(t)},{f(lane)} V{f(base)}')
    return paths


def vertical_path(src, targets, base, lane, dbl):
    paths = []
    for side in ([t for t in targets if t > src], [t for t in targets if t < src]):
        if not side:
            continue
        far = max(side, key=lambda t: abs(t - src))
        d = 1 if far > src else -1
        paths.append(
            f'M{f(base)},{f(src)} H{f(lane - R)} Q{f(lane)},{f(src)} {f(lane)},{f(src + d * R)}'
            f' V{f(far - d * R)} Q{f(lane)},{f(far)} {f(lane - R)},{f(far)} H{f(base)}')
        for t in side:
            if t != far:
                paths.append(f'M{f(lane)},{f(t)} H{f(base)}')
    return paths


def convert(svg):
    arrows = []
    for m in ARROW.finditer(svg):
        x1, y1, x2, y2 = (float(m[k]) for k in ('x1', 'y1', 'x2', 'y2'))
        arrows.append(dict(m=m, x1=x1, y1=y1, x2=x2, y2=y2, dbl=bool(m['start']),
                           horiz=abs(y1 - y2) < 0.01, anim=m['anim'], op=m['op'],
                           stroke=m['stroke'], sw=m['sw'], vis=visible(m['anim'], m['op'])))
    if not arrows:
        return svg, 0, 0
    # bases: horizontal arrows start just above the column labels (the lowest
    # start used in the file); vertical ones just right of the matrix
    hbase = max((a['y1'] for a in arrows if a['horiz']), default=0)
    vbase = max((a['x1'] for a in arrows if not a['horiz']), default=0)
    # buses: same animation, same source, same orientation, same arrow style
    buses = {}
    for a in arrows:
        src = a['x1'] if a['horiz'] else a['y1']
        tgt = a['x2'] if a['horiz'] else a['y2']
        key = (a['anim'], a['op'], a['horiz'], src, a['dbl'], a['stroke'])
        b = buses.setdefault(key, dict(arrows=[], src=src, targets=[], horiz=a['horiz'], dbl=a['dbl'],
                                       anim=a['anim'], op=a['op'], vis=a['vis'], stroke=a['stroke'], sw=a['sw'],
                                       first=a['m'].start()))
        b['arrows'].append(a)
        if tgt not in b['targets']:
            b['targets'].append(tgt)
    buses = list(buses.values())
    for b in buses:
        b['lo'] = min([b['src']] + b['targets'])
        b['hi'] = max([b['src']] + b['targets'])
    # lanes: short buses closest to the matrix; a bus avoids every lane used by a
    # bus of the same orientation that is visible at the same time and overlaps it
    for b in sorted(buses, key=lambda b: (b['hi'] - b['lo'], b['lo'])):
        used = {o['lane'] for o in buses if 'lane' in o and o['horiz'] == b['horiz']
                and o['lo'] <= b['hi'] + 2 and b['lo'] <= o['hi'] + 2 and overlap_t(o['vis'], b['vis'])}
        lane = 0
        while lane in used:
            lane += 1
        b['lane'] = lane
    # rebuild: drop the old arrows, insert each bus where its first arrow was
    out, pos = [], 0
    inserts = {b['first']: b for b in buses}
    for a in sorted(arrows, key=lambda a: a['m'].start()):
        st, en = a['m'].span()
        out.append(svg[pos:st])
        b = inserts.get(st)
        if b:
            if b['horiz']:
                lane_c = hbase - GAP - STEP * b['lane']
                paths = horizontal_path(b['src'], b['targets'], hbase, lane_c, b['dbl'])
            else:
                lane_c = vbase + GAP + STEP * b['lane']
                paths = vertical_path(b['src'], b['targets'], vbase, lane_c, b['dbl'])
            style = f'fill="none" stroke="{b["stroke"]}" stroke-width="{b["sw"]}" stroke-linejoin="round"'
            body = []
            for i, d in enumerate(paths):
                start = ' marker-start="url(#ah)"' if (b['dbl'] and i == 0) else ''
                body.append(f'<path d="{d}" {style} marker-end="url(#ah)"{start}/>')
            out.append(f'<g opacity="{b["op"]}">{b["anim"]}{"".join(body)}</g>')
        pos = en
    out.append(svg[pos:])
    return ''.join(out), len(arrows), len(buses)


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    svg = open(src, encoding='utf-8').read()
    new, n, nb = convert(svg)
    open(dst, 'w', encoding='utf-8').write(new)
    left = new.count('Q') - svg.count('Q')
    print(f'{src}: {n} arrows -> {nb} connectors')
