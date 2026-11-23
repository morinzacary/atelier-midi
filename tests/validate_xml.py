"""Check generated XML and measure timing using only the standard library.
This is a structural/timing check, not a full MusicXML XSD validation.
"""
from pathlib import Path
from fractions import Fraction
import xml.etree.ElementTree as ET
files = sorted((Path(__file__).parent/'generated').glob('*.musicxml'))
assert files, 'Run reverse.test.cjs first'
count = 0
for file in files:
    root = ET.parse(file).getroot()
    assert root.tag == 'score-partwise', file
    for part in root.findall('part'):
        divisions, beats, unit = 960, 4, 4
        for measure in part.findall('measure'):
            divisions = int(measure.findtext('attributes/divisions', str(divisions)))
            beats = int(measure.findtext('attributes/time/beats', str(beats)))
            unit = int(measure.findtext('attributes/time/beat-type', str(unit)))
            cursor, end = Fraction(0), Fraction(0)
            limit = Fraction(divisions*beats*4, unit)
            for item in measure:
                duration = Fraction(item.findtext('duration', '0'))
                if item.tag == 'backup': cursor -= duration
                elif item.tag == 'forward': cursor += duration
                elif item.tag == 'note' and item.find('chord') is None: cursor += duration
                assert cursor >= 0, (file.name, measure.attrib, 'negative cursor')
                end = max(end, cursor)
            assert end <= limit, (file.name, measure.attrib, 'overflow', end, limit)
            if measure.get('implicit') != 'yes':
                assert end == limit, (file.name, measure.attrib, 'incomplete measure', end, limit)
            count += 1
print(f'OK : {len(files)} MusicXML, {count} mesures de parties vérifiées (structure et durées).')
