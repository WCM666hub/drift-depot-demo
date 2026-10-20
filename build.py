from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / 'shell.html').read_text(encoding='utf-8')
for token, filename in [('__CSS__','style.css'), ('__ENGINE__','engine.js'), ('__APP__','app.js')]:
    html = html.replace(token, (root / filename).read_text(encoding='utf-8'))
(root / 'index.html').write_text(html, encoding='utf-8')
print('Built index.html')
