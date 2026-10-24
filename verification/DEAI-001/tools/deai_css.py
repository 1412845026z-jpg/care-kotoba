"""DEAI-001 one-off CSS transform for prototype/app/globals.css.

1. drop selectors whose classes no longer appear anywhere in the source
2. remap the cold lavender palette to the 申し送りノート world (warm paper,
   plum-grey ink, violet accent, mint) by OKLCH, keeping lightness so the
   A11Y-002 contrast fixes keep roughly the same ratios
3. raise every font-size below 12px to 12px
4. swap the font import / families
Run from repo root: python3 -I deai_css.py prototype/app/globals.css

Record of what was done, not a tool to run again: it was applied once to main's globals.css
(34253bb, identical on claude/DESIGN-SKILLS-001); the hand-written theme layer at the end of the
committed globals.css (from the comment "DEAI-001｜") was appended afterwards. Running it on the
committed file is not idempotent.
"""
import glob, math, re, sys

path = sys.argv[1]
css = open(path).read()
root = path.split('/app/')[0]

# ---------- 1. dead selectors ----------
src = ''
for pat in ('app/**/*.tsx', 'components/**/*.tsx', 'lib/**/*.ts'):
    for f in glob.glob(f'{root}/{pat}', recursive=True):
        src += open(f).read()
tokens = set(re.findall(r'[\w-]+', src))
classes = set(re.findall(r'\.([a-zA-Z][\w-]*)', re.sub(r'url\([^)]*\)', '', css)))
dead = {c for c in classes if c not in tokens}
print('dead classes:', ' '.join(sorted(dead)))


def split_top(text):
    """Yield (prelude, body|None) items at depth 0. body None => statement."""
    i, n = 0, len(text)
    while i < n:
        while i < n and text[i] in ' \n\t':
            i += 1
        if i >= n:
            break
        if text.startswith('/*', i):
            j = text.index('*/', i) + 2
            yield (text[i:j], 'COMMENT')
            i = j
            continue
        j = i
        while j < n and text[j] not in '{;':
            if text.startswith('/*', j):
                j = text.index('*/', j) + 2
                continue
            if text[j] in '\'"':
                q = text[j]; j += 1
                while text[j] != q:
                    j += 1
            if text[j] == '(':
                d = 1; j += 1
                while d:
                    d += {'(': 1, ')': -1}.get(text[j], 0); j += 1
                continue
            j += 1
        if j >= n:
            yield (text[i:], None); break
        if text[j] == ';':
            yield (text[i:j + 1], None); i = j + 1; continue
        depth, k = 1, j + 1
        while depth:
            if text.startswith('/*', k):
                k = text.index('*/', k) + 2; continue
            if text[k] in '\'"':
                q = text[k]; k += 1
                while text[k] != q:
                    k += 1
            depth += {'{': 1, '}': -1}.get(text[k], 0)
            k += 1
        yield (text[i:j], text[j + 1:k - 1])
        i = k


def split_selectors(prelude):
    out, depth, cur = [], 0, ''
    for ch in prelude:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return out


removed = 0


def prune(text):
    global removed
    out = []
    for prelude, body in split_top(text):
        if body is None:
            out.append(prelude); continue
        if body == 'COMMENT':
            out.append(prelude); continue
        p = prelude.strip()
        if p.startswith('@media') or p.startswith('@supports'):
            inner = prune(body)
            if inner.strip():
                out.append(prelude + '{' + inner + '}')
            continue
        if p.startswith('@'):
            out.append(prelude + '{' + body + '}'); continue
        sels = split_selectors(prelude)
        keep = [s for s in sels if not (set(re.findall(r'\.([a-zA-Z][\w-]*)', s)) & dead)]
        removed += len(sels) - len(keep)
        if keep:
            out.append(','.join(keep) + '{' + body + '}')
    return ''.join(out)


# keep line structure: prune each line separately when a line is self-contained
lines = css.split('\n')
new_lines = []
for line in lines:
    try:
        new_lines.append(prune(line))
    except Exception:
        new_lines.append(line)
css = '\n'.join(l for l in new_lines)
print('removed selectors:', removed)

# ---------- 2. palette remap ----------
def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def to_oklch(r, g, b):
    r, g, b = (srgb_to_lin(x / 255) for x in (r, g, b))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) for x in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def from_oklch(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, bl


def in_gamut(L, C, h):
    return all(-1e-4 <= x <= 1.0001 for x in from_oklch(L, C, h))


def to_hex(L, C, h):
    while C > 0 and not in_gamut(L, C, h):
        C -= 0.002
    C = max(C, 0)
    r, g, b = (min(255, max(0, round(lin_to_srgb(min(1, max(0, x))) * 255))) for x in from_oklch(L, C, h))
    return f'#{r:02x}{g:02x}{b:02x}'


VIOLET_H = to_oklch(0x55, 0x39, 0x8a)[2]
MINT_H = to_oklch(0x2e, 0x66, 0x50)[2]
print('violet hue %.1f mint hue %.1f' % (VIOLET_H, MINT_H))


TEXT = False


def remap(m):
    hx = m.group(0)[1:]
    if len(hx) in (3, 4):
        hx = ''.join(c * 2 for c in hx)
    rgb, alpha = hx[:6], hx[6:]
    r, g, b = (int(rgb[i:i + 2], 16) for i in (0, 2, 4))
    if (r, g, b) == (255, 255, 255):
        return '#fffdf9' + alpha
    L, C, h = to_oklch(r, g, b)
    if C < 0.03:  # cold neutrals and lavender greys
        if L > 0.9:
            out = to_hex(L, min(0.012, 0.005 + C * 0.4), 80)
        elif L > 0.62:
            out = to_hex(L, 0.016, 330)
        else:
            out = to_hex(L, max(0.02, min(C, 0.03)), 320)
    elif 250 <= h <= 335 and TEXT and C < 0.12 and 0.3 < L < 0.8:
        # lavender-grey text (the old design's body copy) -> plum-grey ink, same lightness
        out = to_hex(L, 0.03, 320)
    elif 250 <= h <= 335:  # lavender / purple family -> violet
        out = to_hex(L, C if L < 0.86 else min(C, 0.03), VIOLET_H)
    elif 125 <= h <= 190:  # greens -> mint
        out = to_hex(L, C, MINT_H)
    else:
        return m.group(0)
    return out + alpha


head, sep, rest = css.partition('\n')  # keep the @import line out of the remap
HEX = r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b'
DECL = r'((?<![-\w])color:[^;}]+)'


def lum_hex(hx):
    r, g, b = (int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


PAPER_L = lum_hex('#f6f1e8')


def readable(m):
    """Mid-tone plum-grey text: darken until >= 4.6:1 on the paper ground (both card and page)."""
    out = remap(m)
    hx, alpha = out[:7], out[7:]
    r, g, b = (int(hx[i:i + 2], 16) for i in (1, 3, 5))
    L, C, h = to_oklch(r, g, b)
    if 0.45 < L < 0.66 and (C < 0.05 or 300 <= h <= 340):
        while (PAPER_L + 0.05) / (lum_hex(hx) + 0.05) < 4.6 and L > 0.3:
            L -= 0.005
            hx = to_hex(L, C, h)
    return hx + alpha


def text_decl(v):
    global TEXT
    TEXT = True
    out = re.sub(HEX, readable, v)
    TEXT = False
    return out


# text colours (color:) get the plum-grey rule; everything else the generic remap
parts = re.split(DECL, rest)
rest = ''.join(text_decl(p) if i % 2 else re.sub(HEX, remap, p) for i, p in enumerate(parts))

# ---------- 3. type floor ----------
def floor(m):
    v = float(m.group(1))
    return 'font-size:12px' if v < 12 else m.group(0)


rest = re.sub(r'font-size:([\d.]+)px', floor, rest)

# ---------- 4. fonts ----------
head = ("@import url('https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700"
        "&family=BIZ+UDPMincho:wght@400;700&display=swap');")
rest = rest.replace("font-family:'DM Sans',var(--font)", 'font-family:var(--serif)')
rest = rest.replace("font-family:'DM Sans',sans-serif", 'font-family:var(--font)')
css = head + '\n' + rest
open(path, 'w').write(css)
print('bytes', len(css))
