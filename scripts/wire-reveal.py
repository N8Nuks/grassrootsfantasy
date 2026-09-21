import re

def edit(path, marker, subs):
    s = open(path, encoding='utf-8').read()
    if marker in s:
        print(f'ALREADY {path}: already wired, left alone')
        return
    for pattern, repl in subs:
        s, n = re.subn(pattern, repl, s)
        if n != 1:
            print(f'SKIPPED {path}: pattern matched {n} times, expected 1 -> {pattern}')
            return
    open(path, 'w', encoding='utf-8').write(s)
    print(f'OK      {path}')

edit('app/hall/[club]/page.tsx', 'revealPos: p.reveal_pos', [
    (r"photo_url,\s*playing_number'\)", "photo_url, playing_number, reveal_pos')"),
    (r"([ \t]*)photo_url: string \| null\n", r"\g<0>\1reveal_pos?: string | null\n"),
    (r"([ \t]*)photoUrl: p\.photo_url,\n", r"\g<0>\1revealPos: p.reveal_pos ?? null,\n"),
])

edit('app/hall/[club]/HallClient.tsx', 'revealPos: p.revealPos', [
    (r"([ \t]*)photoUrl\?: string \| null\n", r"\g<0>\1revealPos?: string | null\n"),
    (r"playingNumber: p\.playingNumber \}\}", "playingNumber: p.playingNumber, revealPos: p.revealPos }}"),
    (r"playingNumber: detail\.playingNumber \}\}", "playingNumber: detail.playingNumber, revealPos: detail.revealPos }}"),
])

edit('app/api/redeem-t4/route.ts', 'revealPos: p.reveal_pos', [
    (r"([ \t]*)photo_url\?: string \| null\n", r"\g<0>\1reveal_pos?: string | null\n"),
    (r"([ \t]*)photoUrl: p\.photo_url \?\? null,\n", r"\g<0>\1revealPos: p.reveal_pos ?? null,\n"),
])