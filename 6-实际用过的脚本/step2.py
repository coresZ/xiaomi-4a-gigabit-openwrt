import sys; sys.path.insert(0,"G:/xiaomi4A/scripts")
from rt import *
se=conn()
print(run(se,"md5sum /tmp/fw.bin")[0])
ch=se.open_session(); ch.execute("mtd -r write /tmp/fw.bin OS1 2>&1")
try:
    while True:
        n,d=ch.read(4096)
        if n<=0: break
        print(d.decode(errors="replace"),end="",flush=True)
except Exception as e: print("conn closed:",e)
