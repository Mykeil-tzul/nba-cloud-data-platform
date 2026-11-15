"""Regenerate bundled English prompts using macOS speech synthesis."""
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

audio = {
    "count": "Tap each friend to count it. Then choose how many you found.",
    "number": "Listen to the number. Then choose the matching number.",
    "color": "Find the tile that matches the color shown.",
    "shape": "Find the shape that matches the outline.",
    "pattern": "Look at the pattern. What comes next?",
    "correct": "You found it!",
    "retry": "Let's look together. Try another one.",
    "finish": "Adventure complete. Great exploring!",
}
audio.update({str(n):str(n) for n in range(1,11)})
out=Path("site/audio")
out.mkdir(exist_ok=True)
with TemporaryDirectory() as tmp:
    for name,text in audio.items():
        source=Path(tmp)/"voice.aiff"
        subprocess.run(["say","-v","Samantha","-r","155","-o",str(source),text],check=True)
        source_file=out/f"{name}.m4a"
        source_file.unlink(missing_ok=True)
        subprocess.run(["afconvert","-f","m4af","-d","aac","-b","32000",str(source),str(source_file)],check=True)
        source.unlink()
