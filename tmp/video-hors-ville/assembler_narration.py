import json, subprocess, wave, math, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
TMP=Path(__file__).resolve().parent
OUT=ROOT/'output/video'
FFMPEG=Path('C:/Users/Spat-Admin/AppData/Local/CapCut/Apps/9.7.1.4203/ffmpeg.exe')
scenario=json.loads((OUT/'Narration_hors_ville_synchronisee.json').read_text(encoding='utf-8'))
rate=22050
mixed=bytearray(round(scenario['duration']*rate)*2)
report=[]
for i,seg in enumerate(scenario['segments'],1):
    src=TMP/f'voix-{i:02d}.wav'
    with wave.open(str(src)) as w:
        assert (w.getframerate(),w.getnchannels(),w.getsampwidth())==(rate,1,2)
        raw_duration=w.getnframes()/rate
    slot=seg['end']-seg['start']-.2
    tempo=max(1.0,raw_duration/slot)
    if tempo>1.16:
        raise ValueError(f'Passage {i}: texte trop long, facteur {tempo:.3f}')
    dest=TMP/f'cale-{i:02d}.wav'
    subprocess.run([str(FFMPEG),'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(src),'-af',f'atempo={tempo:.6f},afade=t=in:d=0.025','-ar',str(rate),'-ac','1',str(dest)],check=True)
    with wave.open(str(dest)) as w:
        frames=w.readframes(w.getnframes())
        duration=w.getnframes()/rate
    offset=round(seg['start']*rate)*2
    assert offset+len(frames)<=round(seg['end']*rate)*2, f'Debordement {i}'
    assert not report or seg['start']>=report[-1]['fin_parole'], f'Chevauchement {i}'
    mixed[offset:offset+len(frames)]=frames
    report.append({'passage':i,'ecran':seg['screen'],'debut':seg['start'],'fin_parole':round(seg['start']+duration,3),'limite_ecran':seg['end'],'acceleration':round(tempo,3),'texte':seg['text']})
dest=OUT/'SPAT_hors_ville_narration_francaise_gratuite.wav'
with wave.open(str(dest),'wb') as w:
    w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(mixed)
(OUT/'Controle_synchronisation_hors_ville.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
def tc(s):
    mins=int(s)//60;return f'{mins:02d}:{s%60:06.3f}'
lines=['# Missions hors ville - Narration synchronisée','', 'Voix française locale : Microsoft Paul. Durée de la vidéo : 7 min 28,33 s.','']
for row in report:
    lines += [f'## {tc(row["debut"])} - {tc(row["fin_parole"])} | {row["ecran"]}', '', row['texte'], '']
(OUT/'Texte_narration_hors_ville_synchronisee.md').write_text('\n'.join(lines),encoding='utf-8')
print(f'{len(report)} passages synchronises; aucune superposition; facteur maximal {max(r["acceleration"] for r in report):.3f}.')
print(dest)
