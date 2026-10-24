import sys; sys.path.insert(0,"G:/xiaomi4A/scripts")
from rt import *
se=conn()
put(se,"G:/xiaomi4A/openwrt-official/openwrt-25.12.4-ramips-mt7621-xiaomi_mi-router-4a-gigabit-squashfs-sysupgrade.bin","/tmp/fw.bin")
print(run(se,"ls -l /tmp/fw.bin; sha256sum /tmp/fw.bin 2>/dev/null || md5sum /tmp/fw.bin")[0])
