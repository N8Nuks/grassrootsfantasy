import re
p = 'app/how/page.tsx'
s = open(p, encoding='utf-8').read()

subs = [
    # The club-code pitch becomes the dropdown; bonus pack left out (TBC)
    (r"'Got a club code from your Team ?Manager or Club\?[^']*'",
     "'Choose your club from the dropdown when you sign up — it locks in your club allegiance for the Club Champion race.'"),
    # Season drops list
    (r"club code bonuses, ", ""),
    # How do I join?
    (r"'Register with your email, name your team,? ?and ?enter a club code\.[^']*'",
     "'Register with your email, name your team, and choose your club from the list. Not with a club? Join as a general supporter — you can still play every round.'"),
    # Delete the "What is a club code?" FAQ entirely
    (r"\n\s*\{\s*\n\s*q: 'What is a club code\?',\n\s*a: '[^']*',\n\s*\},", ""),
]

ok = True
for pattern, repl in subs:
    s, n = re.subn(pattern, repl.replace('\\', '\\\\'), s)
    if n != 1:
        print(f'NO MATCH ({n}) -> {pattern}')
        ok = False

if ok:
    open(p, 'w', encoding='utf-8').write(s)
    print('OK - all four edits applied')
else:
    print('FILE UNTOUCHED')