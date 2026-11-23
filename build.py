"""Build both self-contained browser apps. Python standard library only."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parent
profile = 'const PROFILE=' + json.dumps(json.loads((ROOT/'profiles/cinematic-studio.example.json').read_text()), ensure_ascii=False) + ';'
def inline(text):
    return text.replace('</script', '<\\/script')
forward = (ROOT/'src/score-to-midi/interface.html').read_text()
script = (ROOT/'src/score-to-midi/app.js').read_text().replace('/* PROFILE */', profile)
forward = forward.replace('<!-- APP -->', inline(script))
(ROOT/'apps/score-to-midi/index.html').write_text(forward)
reverse = (ROOT/'src/midi-to-score/interface.html').read_text()
for name, content in [('ENGINE', (ROOT/'src/midi-to-score/engine.js').read_text()), ('PROFILE', profile), ('UI', (ROOT/'src/midi-to-score/ui.js').read_text())]:
    reverse = reverse.replace('<!-- '+name+' -->', '<script>'+inline(content)+'</script>')
(ROOT/'apps/midi-to-score/index.html').write_text(reverse)
print('Built both standalone apps.')
