import os
import shutil

src = r"C:\Users\HP\.gemini\antigravity-ide\brain\3044a947-54a8-4ba0-84aa-8ed08c9d092e\rozzi_hero_visual_1781033878753.png"
dst = r"q:\Niratma\Setuna\web\assets\rozzi_hero_visual.png"

res = []
res.append(f"Source exists: {os.path.exists(src)}")
if os.path.exists(src):
    res.append(f"Source size: {os.path.getsize(src)} bytes")
    try:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(src, dst)
        res.append(f"Copy successful to {dst}")
        res.append(f"Dest exists: {os.path.exists(dst)}")
        if os.path.exists(dst):
            res.append(f"Dest size: {os.path.getsize(dst)} bytes")
    except Exception as e:
        res.append(f"Copy failed with error: {e}")
else:
    res.append("Source file not found!")

with open("check_output.txt", "w") as f:
    f.write("\n".join(res))
