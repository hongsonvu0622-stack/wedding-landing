import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'reference' / 'prototype.html').read_text(encoding='utf8')
css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
parts = re.split(r'/\* -+ ([\w ]+?) -+ \*/', css)
out = root / 'src' / 'styles'
out.mkdir(parents=True, exist_ok=True)
(out / 'base.css').write_text(parts[0].strip() + '\n', encoding='utf8')
for i in range(1, len(parts), 2):
    name = parts[i].strip().replace(' ', '-')
    (out / f'{name}.css').write_text(parts[i + 1].strip() + '\n', encoding='utf8')
    print('wrote', name)
