#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小米路由器 4A 千兆版 (v1) 一键刷 OpenWrt —— 交互式脚本

两种模式：
  1) 原厂系统 -> OpenWrt   （开启 SSH、备份、传固件、校验、刷入、可选的刷后设置）
  2) OpenWrt 升级到新版     （备份配置、传固件、校验、sysupgrade -T 试跑、升级）

用法：
  python flash_openwrt.py              正式运行（会问你每一步）
  python flash_openwrt.py --dry-run    演练：做到"最后确认"之前的所有步骤，不执行任何不可逆的写入
  python flash_openwrt.py --fw 固件路径  指定固件文件（默认用 1-OpenWrt固件/ 里最新的）

依赖：Python 3.8+、ssh2-python（脚本会提示安装）。原厂开 SSH 那一步还需要 pyftpdlib。
"""
import argparse, datetime, getpass, glob, hashlib, ipaddress, os, re, shlex, shutil, socket, subprocess, sys, time

try:
    # an interactive console already handles Chinese; when the output is piped/redirected, force UTF-8
    for _s in (sys.stdout, sys.stderr):
        _s.reconfigure(errors="replace", **({} if _s.isatty() else {"encoding": "utf-8"}))
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
FW_DIR = os.path.join(ROOT, "1-OpenWrt固件")
PATCHER = os.path.join(ROOT, "2-开启SSH工具", "xmir-patcher")
BACKUP_ROOT = os.path.join(ROOT, "4-刷机前备份-仅限本机")


# ----------------------------------------------------------------------------- small helpers
def say(s=""):
    print(s, flush=True)


def ask(prompt, default=None, check=None):
    while True:
        tail = f" [{default}]" if default not in (None, "") else ""
        s = input(f"{prompt}{tail}: ").strip()
        if not s and default is not None:
            s = default
        if check:
            err = check(s)
            if err:
                say(f"  ! {err}")
                continue
        return s


def ask_yes(prompt, default=False):
    d = "Y/n" if default else "y/N"
    while True:
        s = input(f"{prompt} ({d}): ").strip().lower()
        if not s:
            return default
        if s in ("y", "yes", "是", "对"):
            return True
        if s in ("n", "no", "否"):
            return False


def ask_secret(prompt, default=""):
    s = getpass.getpass(f"{prompt}: ") if sys.stdin.isatty() else input(f"{prompt}: ")
    return s or default


def md5_file(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def ssh_banner(host, port, timeout=3):
    try:
        s = socket.create_connection((host, port), timeout)
        s.settimeout(timeout)
        b = s.recv(64)
        s.close()
        return b.decode(errors="replace").strip()
    except OSError:
        return None


def wait_ssh(host, port, total=420, first_delay=0):
    """wait until an SSH server answers; returns True when it does"""
    if first_delay:
        say(f"  等待路由器重启 {first_delay} 秒 ...")
        time.sleep(first_delay)
    t0 = time.time()
    while time.time() - t0 < total:
        b = ssh_banner(host, port)
        if b and b.startswith("SSH-"):
            return True
        print(".", end="", flush=True)
        time.sleep(3)
    say()
    return False


# ----------------------------------------------------------------------------- input checks
def check_ip(s):
    try:
        a = ipaddress.IPv4Address(s)
    except ValueError:
        return "不是有效的 IPv4 地址"
    if not a.is_private:
        return "请填私有地址，例如 192.168.10.1"
    if int(a) & 0xFF in (0, 255):
        return "最后一段不能是 0 或 255"
    return None


def check_port(s):
    return None if s.isdigit() and 1 <= int(s) <= 65535 else "端口应为 1-65535"


def check_ssid(s):
    if not s:
        return "不能为空"
    if len(s.encode("utf-8")) > 32:
        return "名称最长 32 字节（一个汉字占 3 字节）"
    if any(ord(c) < 32 for c in s):
        return "不能含控制字符"
    return None


def check_wifi_pw(s):
    if not 8 <= len(s) <= 63:
        return "Wi-Fi 密码要 8 到 63 个字符"
    if any(ord(c) < 32 or ord(c) > 126 for c in s):
        return "只能用英文字母、数字和常见符号"
    return None


def check_root_pw(s):
    if len(s) < 6:
        return "至少 6 个字符"
    if any(ord(c) < 32 for c in s):
        return "不能含控制字符"
    return None


# ----------------------------------------------------------------------------- SSH connection (libssh2)
class Router:
    def __init__(self, host, port, password, user="root"):
        try:
            from ssh2.session import Session  # noqa: F401
        except ImportError:
            sys.exit("缺少 ssh2-python：请先执行  pip install ssh2-python")
        self.host, self.port, self.user, self.password = host, port, user, password
        self.connect()

    def connect(self):
        from ssh2.session import Session
        try:
            s = socket.socket()
            s.settimeout(20)
            s.connect((self.host, self.port))
            self.sock = s
            self.se = Session()
            self.se.handshake(s)
            self.se.userauth_password(self.user, self.password)
        except OSError as e:
            sys.exit(f"连不上 {self.host}:{self.port}（{e}）。请检查：地址和端口对不对、网线是否接在 LAN 口、电脑 Wi-Fi 是否已断开。")
        except Exception as e:  # noqa: BLE001
            if type(e).__name__ == "AuthenticationError":
                sys.exit(f"SSH 登录失败：{self.user} 的密码不对。（原厂开 SSH 后默认是 root；刷完 OpenWrt 且设过密码的，用你设的密码。）")
            raise
        self.se.set_timeout(600000)

    def run(self, cmd):
        ch = self.se.open_session()
        ch.execute(cmd)
        out = b""
        while True:
            n, d = ch.read(4096)
            if n <= 0:
                break
            out += d
        ch.wait_eof()
        ch.close()
        ch.wait_closed()
        return out.decode(errors="replace"), ch.get_exit_status()

    def put(self, local, remote):
        data = open(local, "rb").read()
        total = len(data)
        for attempt in range(1, 4):
            try:
                ch = self.se.open_session()
                ch.execute(f"cat > {shlex.quote(remote)}")
                mv, sent, last = memoryview(data), 0, -1
                while sent < total:
                    r = ch.write(bytes(mv[sent:sent + 16384]))
                    k = r[1] if isinstance(r, tuple) else r
                    if k <= 0:
                        raise IOError("write returned %r" % (r,))
                    sent += k
                    if sent * 100 // total // 10 != last:
                        last = sent * 100 // total // 10
                        print(f"\r  上传 {sent * 100 // total}%", end="", flush=True)
                ch.send_eof()
                ch.wait_eof()
                ch.close()
                ch.wait_closed()
                say()
                return
            except Exception as e:  # noqa: BLE001
                say(f"\n  上传出错（{type(e).__name__}），重试 {attempt}/3")
                time.sleep(3)
                self.connect()
        raise RuntimeError("上传失败")

    def pull(self, cmd, local):
        ch = self.se.open_session()
        ch.execute(cmd)
        h, total = hashlib.md5(), 0
        with open(local, "wb") as f:
            while True:
                n, d = ch.read(65536)
                if n <= 0:
                    break
                f.write(d)
                h.update(d)
                total += n
        ch.close()
        return total, h.hexdigest()


# ----------------------------------------------------------------------------- firmware
def check_ram(r, need_bytes, margin_kb=8192):
    """the image is first written to /tmp, which is RAM: refuse when it would squeeze the router"""
    out, _ = r.run("awk '/^MemAvailable:/ {print $2}' /proc/meminfo")
    if not out.strip().isdigit():
        out, _ = r.run("free -k | awk 'NR==2{print $NF}'")
    avail = int(out.strip()) if out.strip().isdigit() else 0
    need = need_bytes // 1024 + margin_kb
    say(f"  路由器可用内存 {avail // 1024} MB，上传需要约 {need // 1024} MB（固件 {need_bytes // 1048576} MB + 余量）")
    if avail < need:
        sys.exit("可用内存不够，上传固件会把路由器上别的进程挤掉。请先停掉占内存的服务"
                 "（例如 /etc/init.d/xray stop）或重启一次路由器再试。什么都没有修改。")


def find_firmware(explicit=None):
    if explicit:
        return os.path.abspath(explicit)
    cands = []
    for p in glob.glob(os.path.join(FW_DIR, "openwrt-*-4a-gigabit-squashfs-sysupgrade.bin")):
        m = re.search(r"openwrt-(\d+(?:\.\d+)*)-", os.path.basename(p))
        if m and "-v2-" not in p:
            cands.append((tuple(int(x) for x in m.group(1).split(".")), p))
    return max(cands)[1] if cands else None


def verify_firmware(path):
    """returns the sha256, or raises SystemExit if the file looks wrong"""
    name = os.path.basename(path)
    if not os.path.isfile(path):
        sys.exit(f"找不到固件文件：{path}")
    if "4a-gigabit" not in name or "sysupgrade" not in name:
        sys.exit(f"这不像 4A 千兆版的 sysupgrade 固件：{name}")
    if "-v2-" in name:
        sys.exit("这是 v2 的固件！本脚本只支持 v1，刷错可能变砖。")
    digest = sha256_file(path)
    sums = os.path.join(os.path.dirname(path), "sha256sums")
    expected = None
    if os.path.isfile(sums):
        for line in open(sums, encoding="utf-8", errors="replace"):
            parts = line.split()
            if len(parts) >= 2 and parts[1].lstrip("*") == name:
                expected = parts[0]
    if expected is None:
        say("  ! 没有找到这个固件的官方校验值（同目录 sha256sums），无法自动核对。")
        if not ask_yes("  仍要继续吗？", False):
            sys.exit("已取消。")
    elif expected != digest:
        sys.exit(f"固件 SHA256 与官方清单不一致，文件可能损坏或被改过：\n  实际 {digest}\n  官方 {expected}")
    else:
        say("  固件 SHA256 与官方清单一致。")
    return digest


# ----------------------------------------------------------------------------- stock firmware checks / backup
MTD_RE = re.compile(r'mtd(\d+): ([0-9a-f]+) ([0-9a-f]+) "([^"]+)"')


def parse_mtd(text):
    return {m.group(4): (int(m.group(1)), int(m.group(2), 16)) for m in MTD_RE.finditer(text)}


def check_stock(r):
    """refuse anything that is not a Mi Router 4A Gigabit v1 on stock firmware"""
    out, _ = r.run("uname -a; cat /proc/mtd")
    mtd = parse_mtd(out)
    bad = []
    if not re.search(r"MiWiFi-R4A-\d", out):
        bad.append("系统不是小米 4A 千兆版 v1 的原厂固件（uname 里没有 MiWiFi-R4A-x.x.x）")
    for name, size in (("OS1", 0xD00000), ("Factory", 0x10000), ("Bootloader", 0x30000)):
        if name not in mtd or mtd[name][1] != size:
            bad.append(f"分区 {name} 不存在或大小不是 0x{size:x}")
    return mtd, out, bad


def backup_partitions(r, mtd, names, dest):
    os.makedirs(dest, exist_ok=True)
    for name in names:
        idx = mtd[name][0]
        ro, _ = r.run(f"[ -e /dev/mtd{idx}ro ] && echo ro || echo plain")
        dev = f"/dev/mtd{idx}ro" if ro.strip() == "ro" else f"/dev/mtd{idx}"
        local = os.path.join(dest, f"mtd{idx}_{name}.bin")
        say(f"  备份 {name}（{dev}）...")
        size, got = r.pull(f"cat {dev}", local)
        want, _ = r.run(f"md5sum {dev}")
        want = want.split()[0] if want.split() else ""
        if size != mtd[name][1] or want != got:
            sys.exit(f"备份 {name} 校验失败（大小 {size}/{mtd[name][1]}，MD5 {got}/{want}），已停止，什么都没改。")
        say(f"    OK  {size} 字节，MD5 {got}")
    return dest


# ----------------------------------------------------------------------------- post-flash configuration
RESTART_NET = "( sleep 2; /etc/init.d/network restart; sleep 5; wifi reload ) >/dev/null 2>&1 &"


def build_postconfig(c, test_dir=None, restart=True):
    """shell script that applies the answers. test_dir: run on a copy of /etc/config and do not touch services.
    restart=False leaves the network untouched (the caller restarts it later with RESTART_NET)."""
    U = f"uci -c {test_dir}" if test_dir else "uci"
    q = shlex.quote
    sae = "sae" in c["enc"]
    L = ["# time zone",
         f"{U} set system.@system[0].zonename='Asia/Shanghai'",
         f"{U} set system.@system[0].timezone='CST-8'",
         f"{U} commit system",
         "# wi-fi (both radios are off by default on a fresh OpenWrt)",
         f"for i in 0 1; do {U} set wireless.radio$i.country='CN'; {U} set wireless.radio$i.disabled='0'; "
         f"{U} set wireless.default_radio$i.disabled='0'; {U} set wireless.default_radio$i.encryption={q(c['enc'])}; "
         f"{U} set wireless.default_radio$i.key={q(c['wifi_pw'])}; "
         f"{U} set wireless.default_radio$i.ieee80211w='{'1' if sae else '0'}'; done",
         f"{U} set wireless.default_radio0.ssid={q(c['ssid2'])}",
         f"{U} set wireless.default_radio1.ssid={q(c['ssid5'])}",
         f"{U} commit wireless"]
    if c["ipv6_off"]:
        L += ["# turn IPv6 off on the LAN",
              f"{U} set dhcp.lan.ra='disabled'; {U} set dhcp.lan.dhcpv6='disabled'; {U} set dhcp.lan.ndp='disabled'",
              f"{U} set network.wan6.disabled='1' 2>/dev/null || true",
              f"{U} commit dhcp; {U} commit network"]
    if c["lan_ip"]:
        L += ["# LAN address: the /24 is essential, without it the mask becomes /32 and DHCP stops working",
              f"{U} set network.lan.ipaddr={q(c['lan_ip'] + '/24')}",
              f"{U} commit network"]
    if not test_dir:
        L += ["# root password",
              f"printf '%s\\n%s\\n' {q(c['root_pw'])} {q(c['root_pw'])} | passwd root >/dev/null"]
        if restart:
            L += ["# apply in the background so this session can finish first", RESTART_NET]
        L += ["echo CONFIG-APPLIED"]
    return "\n".join(L) + "\n"


def mask_script(s, c):
    for k in ("wifi_pw", "root_pw"):
        if c.get(k):
            s = s.replace(shlex.quote(c[k]), "'******'")
    return s


def ask_postconfig():
    say("\n--- 刷完后的基本设置（直接回车用默认值）---")
    c = {}
    c["lan_ip"] = ask("路由器新的 LAN 地址（光猫也是 192.168.1.1 时必须改；输入 - 表示保持 192.168.1.1）", "192.168.10.1",
                      lambda s: None if s == "-" else check_ip(s))
    if c["lan_ip"] in ("-", "192.168.1.1"):
        c["lan_ip"] = ""
    c["root_pw"] = ""
    while True:
        c["root_pw"] = ask_secret("root 密码（至少 6 位，登录后台和 SSH 用）")
        err = check_root_pw(c["root_pw"])
        if err:
            say(f"  ! {err}")
            continue
        if ask_secret("再输入一次") == c["root_pw"]:
            break
        say("  ! 两次不一致")
    c["ssid2"] = ask("2.4G Wi-Fi 名称", "OpenWrt", check_ssid)
    c["ssid5"] = ask("5G Wi-Fi 名称", c["ssid2"] + "_5G", check_ssid)
    while True:
        c["wifi_pw"] = ask_secret("Wi-Fi 密码（8-63 位，两个频段共用）")
        err = check_wifi_pw(c["wifi_pw"])
        if err:
            say(f"  ! {err}")
            continue
        break
    c["enc"] = "psk2+ccmp" if ask("加密方式：1=WPA2（老设备也能连，推荐） 2=WPA2/WPA3 混合", "1", lambda s: None if s in ("1", "2") else "输入 1 或 2") == "1" else "sae-mixed"
    c["ipv6_off"] = ask_yes("关闭 LAN 的 IPv6？（设备只走 IPv4；用透明代理时建议关）", False)
    return c


def run_post_system_ssh(host, script):
    ssh = shutil.which("ssh")
    if not ssh:
        sys.exit("找不到系统的 ssh 命令（需要 OpenSSH 客户端），请手动执行下面这段脚本。")
    # a fresh OpenWrt accepts an empty password ("none" authentication), which libssh2 cannot do - the system ssh can
    cmd = [ssh, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", "-o", f"UserKnownHostsFile={os.devnull}",
           "-o", "ConnectTimeout=10", f"root@{host}", "sh -s"]
    p = subprocess.run(cmd, input=script, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    return p.returncode, (p.stdout + p.stderr)


# ----------------------------------------------------------------------------- optional: the two self-made services
PROXY_DIR = os.path.join(ROOT, "7-自制代理与上网记录页面")
S, R_, C_ = "脚本与页面", "路由器程序", "规则与配置"
PROXY_FILES = [  # (path inside PROXY_DIR, path on the router, mode)
    (f"{R_}/xr", "/usr/bin/xr", "755"),
    (f"{S}/xray-sub", "/usr/bin/xray-sub", "755"),
    (f"{S}/xray.init", "/etc/init.d/xray", "755"),
    (f"{S}/xray.js", "/www/luci-static/resources/view/xray.js", "644"),
    (f"{S}/luci-app-xray.menu.json", "/usr/share/luci/menu.d/luci-app-xray.json", "644"),
    (f"{S}/luci-app-xray.acl.json", "/usr/share/rpcd/acl.d/luci-app-xray.json", "644"),
    (f"{S}/netmon", "/usr/bin/netmon", "755"),
    (f"{S}/netmon.js", "/www/luci-static/resources/view/netmon.js", "644"),
    (f"{S}/luci-app-netmon.menu.json", "/usr/share/luci/menu.d/luci-app-netmon.json", "644"),
    (f"{S}/luci-app-netmon.acl.json", "/usr/share/rpcd/acl.d/luci-app-netmon.json", "644"),
    (f"{C_}/xray.nft", "/etc/xray/xray.nft", "600"),
]
CRON_LINES = [("xray-sub watchdog", "* * * * * /usr/bin/xray-sub watchdog >/dev/null 2>&1"),
              ("xray-sub update", "0 4 * * * /usr/bin/xray-sub update >/dev/null 2>&1 && /etc/init.d/xray restart >/dev/null 2>&1")]


def ask_proxy_options():
    say("\n--- 代理页面 / 上网记录页面 ---")
    say("需要订阅地址（v2rayN 通用格式，含 vless:// 节点）。留空也可以：先把程序和页面装好，之后在页面里再填。")
    sub = ask_secret("订阅地址（输入时不显示，可留空）")
    if sub and not re.match(r"^https?://\S+$", sub):
        say("  ! 这不像一个网址，已忽略（之后可在页面里填）。")
        sub = ""
    rec = ask_yes("同时开启“上网记录”（记录各设备访问的域名，只存在内存里）？你需要知道这相当于在记录家里每个人的上网情况", False)
    return {"sub": sub, "records": rec}


def install_proxy(r, opts, prefix=""):
    """install the proxy + records pages. prefix != '' installs into a sandbox directory and touches no service (for tests)."""
    missing = [p for p, _, _ in PROXY_FILES if not os.path.isfile(os.path.join(PROXY_DIR, p))]
    if missing:
        sys.exit("缺少文件：" + ", ".join(missing))
    rel = r.run("cat /etc/openwrt_release")[0]
    arch = re.search(r"DISTRIB_ARCH='([^']+)'", rel)
    if not prefix and (not arch or arch.group(1) != "mipsel_24kc"):
        sys.exit(f"这套程序是给 mipsel_24kc 编译的，当前路由器是 {arch.group(1) if arch else '未知'}，已停止。")
    total = sum(os.path.getsize(os.path.join(PROXY_DIR, p)) for p, _, _ in PROXY_FILES)
    if not prefix:
        ov = r.run("df -k /overlay | tail -1")[0].split()
        free = int(ov[3]) if len(ov) >= 4 and ov[3].isdigit() else 0
        say(f"  可写区剩余 {free} KB，需要约 {total // 1024} KB")
        if free < total // 1024 + 600:
            sys.exit("可写区空间不够（装完要留余量，否则下次重启配置会被清空，见教程 8.1）。已停止，什么都没有安装。")
    check_ram(r, os.path.getsize(os.path.join(PROXY_DIR, f"{R_}/xr")))
    if not prefix:
        r.run("/etc/init.d/xray stop 2>/dev/null; true")        # a running binary cannot be overwritten
    r.run("rm -rf /tmp/xf_inst; mkdir -p /tmp/xf_inst")
    for i, (rel_p, dest, mode) in enumerate(PROXY_FILES):
        local = os.path.join(PROXY_DIR, rel_p)
        say(f"  安装 {dest}")
        r.put(local, f"/tmp/xf_inst/f{i}")
        want, got = md5_file(local), r.run(f"md5sum /tmp/xf_inst/f{i}")[0].split()[0:1]
        if not got or got[0] != want:
            sys.exit(f"{dest} 上传后 MD5 不一致，已停止。")
        d = prefix + dest
        move = "mv" if prefix else "cp"      # in the sandbox the files stay in RAM, a rename costs nothing
        out, _ = r.run(f"mkdir -p \"$(dirname {shlex.quote(d)})\" && {move} /tmp/xf_inst/f{i} {shlex.quote(d)} && chmod {mode} {shlex.quote(d)} && rm -f /tmp/xf_inst/f{i}; echo done=$?")
        if "done=0" not in out:
            sys.exit(f"写入 {d} 失败：{out.strip()[-120:]}")
    # configuration: never overwrite an existing one, only fill in what was asked for
    cfgdir = f"{prefix}/etc/config"
    U = f"uci -c {cfgdir}" if prefix else "uci"
    r.run(f"mkdir -p {cfgdir}")
    if "no" in r.run(f"[ -f {cfgdir}/xray ] && echo yes || echo no")[0]:
        r.put(os.path.join(PROXY_DIR, f"{C_}/xray.uci"), "/tmp/xf_inst/xray.uci")
        r.run(f"cp /tmp/xf_inst/xray.uci {cfgdir}/xray && chmod 600 {cfgdir}/xray && {U} set xray.main.node_name='' && {U} commit xray")
    if opts.get("sub"):
        r.run(f"{U} set xray.main.sub_url={shlex.quote(opts['sub'])} && {U} set xray.main.enabled=1 && {U} commit xray")
    # cron entries (only added when missing)
    cron = f"{prefix}/etc/crontabs/root"
    cmd = f"mkdir -p {prefix}/etc/crontabs; touch {cron}; "
    for key, line in CRON_LINES:
        cmd += f"grep -q {shlex.quote(key)} {cron} || echo {shlex.quote(line)} >> {cron}; "
    r.run(cmd)
    r.run("rm -rf /tmp/xf_inst")
    if prefix:
        return
    r.run("/etc/init.d/cron enable; /etc/init.d/cron restart; /etc/init.d/xray enable; /etc/init.d/rpcd restart; "
          "rm -f /tmp/luci-indexcache* /tmp/luci-modulecache/*")
    started = False
    have_sub = bool(r.run("uci -q get xray.main.sub_url")[0].strip())
    if have_sub:
        say("  正在拉取订阅（路由器需要能上外网，这一步可能要十几秒到几十秒）...")
        out, _ = r.run("/usr/bin/xray-sub update 2>&1")
        if re.search(r"\d+ nodes", out):
            say("  " + out.strip().splitlines()[-1] + "。启动代理 ...")
            r.run("/etc/init.d/xray start")
            time.sleep(12)
            st = r.run("/usr/bin/xray-sub status")[0]
            started = "running" in st
            say("  " + "；".join(l.strip() for l in st.splitlines() if l.startswith(("xr", "rules", "sub")))[:140])
        else:
            say(f"  ! 订阅没拉下来（{out.strip()[-100:]}）。多半是 WAN 口还没接光猫。接好后在页面点“立即拉取订阅”，"
                "或 SSH 执行  xray-sub update && /etc/init.d/xray restart")
    if opts.get("records"):
        r.run("/usr/bin/netmon on")
        say("  上网记录已开启。")
    say("\n  安装完成：" + ("代理已运行。" if started else "代理还没有运行（缺订阅或订阅没拉下来）。")
        + "\n  后台打开  服务 -> VLESS 代理 / 上网记录。第一次进代理页面请选一个节点并保存。")


def mode_install(args):
    ip = ask("路由器地址", "192.168.10.1", check_ip)
    port = int(ask("SSH 端口", "22", check_port))
    pw = ask_secret("root 密码")
    r = Router(ip, port, pw)
    opts = ask_proxy_options()
    say("\n将安装约 4.4MB 的程序和页面（装完可写区只剩约 2MB）。已有的代理配置不会被覆盖。")
    if args.dry_run:
        say("[演练模式] 到此为止，没有安装任何东西。检查项（架构、空间、内存）：")
        rel = r.run("cat /etc/openwrt_release")[0]
        say("  架构：" + (re.search(r"DISTRIB_ARCH='([^']+)'", rel) or [None, "?"])[1])
        say("  可写区：" + r.run("df -k /overlay | tail -1")[0].strip())
        check_ram(r, os.path.getsize(os.path.join(PROXY_DIR, f"{R_}/xr")))
        return
    if input("确认请输入  确认安装  : ").strip() != "确认安装":
        sys.exit("没有输入确认词，已取消。")
    install_proxy(r, opts)


# ----------------------------------------------------------------------------- network pre-flight text
def netcheck_text():
    say("""
刷机前请确认（做错了不会坏，但会让你以为路由器坏了）：
  1. 电脑用网线接路由器的 LAN 口（不是 WAN 口）
  2. 路由器的 WAN 口先不要接光猫
  3. 电脑的 Wi-Fi 先断开：刷完后路由器地址常和光猫同为 192.168.1.1，Wi-Fi 连着光猫会抢走这个地址
  4. 刷机过程中绝对不要断电""")
    if not ask_yes("以上都做到了吗？", False):
        sys.exit("请先处理好再运行。")


# ----------------------------------------------------------------------------- mode 1: stock -> OpenWrt
def mode_stock(args):
    fw = find_firmware(args.fw)
    if not fw:
        sys.exit(f"在 {FW_DIR} 里没有找到固件，请用 --fw 指定。")
    say(f"固件：{os.path.basename(fw)}")
    sha = verify_firmware(fw)
    netcheck_text()

    ip = ask("原厂路由器地址", "192.168.31.1", check_ip)
    port = int(ask("SSH 端口（xmir-patcher 开的是 122）", "122", check_port))
    pw = ask_secret("SSH root 密码（xmir-patcher 的默认值是 root）", "root")

    if not ssh_banner(ip, port):
        say(f"\n{ip}:{port} 上没有 SSH，需要先在原厂系统里开启（用 xmir-patcher）。")
        if not os.path.isfile(os.path.join(PATCHER, "connect.py")):
            sys.exit(f"找不到 {PATCHER}\\connect.py")
        web = ask_secret("原厂后台（网页）的登录密码")
        say("  正在运行 xmir-patcher（需要 pyftpdlib、ssh2-python；它会往路由器上传一小段利用代码来开启 SSH）...")
        p = subprocess.run([sys.executable, "connect.py", ip], cwd=PATCHER, input=web + "\n", capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=300)
        out = (p.stdout + p.stderr).strip()
        say("\n".join("    " + l for l in out.splitlines()[-12:]))
        if not ssh_banner(ip, port):
            sys.exit("SSH 仍然没有开起来。把上面的输出发给我或按原作者说明重试（可先用救砖工具刷一遍原厂固件）。")
    say("  SSH 可用。")

    r = Router(ip, port, pw)
    mtd, info, bad = check_stock(r)
    if bad:
        say("\n这台设备没有通过检查，为了安全已停止，什么都没有修改：")
        for b in bad:
            say("  - " + b)
        say("\n（设备信息）\n" + "\n".join("  " + l for l in info.splitlines()[:3]))
        sys.exit(2)
    say("  设备检查通过：" + [l for l in info.splitlines() if "MiWiFi" in l][0].strip()[:90])

    # backup
    say("\n--- 备份 ---")
    choice = ask("1=只备份关键分区（Bootloader/Config/Bdata/Factory） 2=再加整盘 ALL（推荐） 3=不备份", "2",
                 lambda s: None if s in ("1", "2", "3") else "输入 1、2 或 3")
    if choice != "3":
        names = [n for n in ("Bootloader", "Config", "Bdata", "Factory") if n in mtd]
        if choice == "2" and "ALL" in mtd:
            names = ["ALL"] + names
        dest = os.path.join(BACKUP_ROOT, "脚本备份-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
        backup_partitions(r, mtd, names, dest)
        say(f"  备份保存在：{dest}\n  其中含这台路由器的 MAC 和 Wi-Fi 校准数据（Factory），请妥善保管，别发给别人。")
    else:
        say("  已跳过备份。Factory 分区丢了就没法恢复 Wi-Fi 校准，请确认你已经有备份。")

    # upload + verify
    say("\n--- 上传并校验固件 ---")
    check_ram(r, os.path.getsize(fw))
    r.put(fw, "/tmp/fw.bin")
    local, remote = md5_file(fw), r.run("md5sum /tmp/fw.bin")[0].split()[0]
    say(f"  电脑 MD5  {local}\n  路由器 MD5 {remote}")
    if local != remote:
        sys.exit("MD5 不一致，已停止（什么都没刷）。请重新运行。")
    say("  一致。")

    cfg = ask_postconfig() if ask_yes("\n刷完后让脚本帮你做基本设置（改 LAN 地址、root 密码、Wi-Fi、时区）吗？", True) else None
    proxy = None
    if cfg:
        if ask_yes("刷完后顺便安装“代理页面 + 上网记录页面”吗？（可选，装完可写区只剩约 2MB）", False):
            proxy = ask_proxy_options()
    else:
        say("（自动安装代理页面需要先设置 root 密码，所以这次不提供；以后可以用本脚本的模式 3 单独安装。）")

    say("\n=================== 最后确认 ===================")
    say(f"将把 {os.path.basename(fw)} 写入这台路由器的 OS1 分区（命令：mtd -r write /tmp/fw.bin OS1）。")
    say("这一步不可撤销；写入过程中断电可能变砖；刷完后没有 Breed，只能靠原厂救砖工具恢复（我没有测试过救砖）。")
    if args.dry_run:
        say("\n[演练模式] 到此为止，没有写入任何东西。")
        if cfg:
            say("\n刷完后将执行的设置脚本（密码已隐藏）：\n" + mask_script(build_postconfig(cfg, restart=not proxy), cfg))
            if proxy:
                say("然后会安装代理页面和上网记录页面（共 %d 个文件），最后才重启网络。" % len(PROXY_FILES))
        return
    if input('确认请输入  确认刷机  : ').strip() != "确认刷机":
        sys.exit("没有输入确认词，已取消，路由器没有被修改。")
    say("\n正在刷入，请不要断电 ...")
    try:
        out, _ = r.run("mtd -r write /tmp/fw.bin OS1 2>&1")
        say("  " + out.strip()[-160:])
    except Exception as e:  # noqa: BLE001  (the connection drops when the router reboots)
        say(f"  连接已断开（{type(e).__name__}），这是重启造成的，正常。")

    say("\n等待 OpenWrt 启动（默认地址 192.168.1.1）...")
    if not wait_ssh("192.168.1.1", 22, total=420, first_delay=40):
        sys.exit("7 分钟内没等到 192.168.1.1 的 SSH。请检查：电脑 Wi-Fi 是否断开、网线是否在 LAN 口、网卡是否重新获取了 IP。")
    say("\n  OpenWrt 已经起来了。")
    if cfg:
        say("正在应用基本设置 ...")
        # with the proxy install the network restart is held back: a new LAN address would cut this PC off until it renews its lease
        rc, out = run_post_system_ssh("192.168.1.1", build_postconfig(cfg, restart=not proxy))
        if rc != 0 or "CONFIG-APPLIED" not in out:
            say(f"  设置脚本返回异常（rc={rc}）：\n{out[-300:]}\n  路由器仍可用，请手动设置（教程第 6 节）。")
        else:
            if proxy:
                say("  设置已写入。现在安装代理页面和上网记录页面（此时网络还没重启，地址仍是 192.168.1.1）...")
                try:
                    r2 = Router("192.168.1.1", 22, cfg["root_pw"])
                    install_proxy(r2, proxy)
                except SystemExit as e:
                    say(f"  ! 安装中止：{e}\n  基本设置已生效，路由器可用，之后可用本脚本的模式 3 重装。")
                except Exception as e:  # noqa: BLE001
                    say(f"  ! 安装出错（{type(e).__name__}: {e}）。基本设置已生效，之后可用本脚本的模式 3 重装。")
                finally:
                    # whatever happened above, the held-back network restart must still run
                    try:
                        Router("192.168.1.1", 22, cfg["root_pw"]).run(RESTART_NET)
                    except Exception as e:  # noqa: BLE001
                        say(f"  ! 无法触发网络重启（{type(e).__name__}）。请给路由器断电再通电一次，设置就会生效。")
            say("  已应用。路由器会在几秒后重启网络。")
            new = cfg["lan_ip"] or "192.168.1.1"
            say(f"\n接下来：\n  1. 把电脑网线拔掉再插上，让它重新获取地址\n  2. 浏览器打开 http://{new} ，用户 root，密码是你刚设的\n  3. 确认后再把光猫接到 WAN 口"
                + ("\n  4. 光猫接好后，在“服务 → VLESS 代理”里点“立即拉取订阅”，选一个节点" if proxy else ""))
    else:
        say("\n没有做基本设置：现在用 ssh root@192.168.1.1 登录（没有密码），按教程第 6 节设置。")


# ----------------------------------------------------------------------------- mode 2: OpenWrt upgrade
def mode_upgrade(args):
    fw = find_firmware(args.fw)
    if not fw:
        sys.exit(f"在 {FW_DIR} 里没有找到固件，请用 --fw 指定。")
    say(f"固件：{os.path.basename(fw)}")
    verify_firmware(fw)
    ip = ask("路由器地址", "192.168.10.1", check_ip)
    port = int(ask("SSH 端口", "22", check_port))
    pw = ask_secret("root 密码")
    r = Router(ip, port, pw)

    rel = r.run("cat /etc/openwrt_release")[0]
    cur = re.search(r"DISTRIB_RELEASE='([^']+)'", rel)
    tgt = re.search(r"DISTRIB_TARGET='([^']+)'", rel)
    board = r.run("cat /tmp/sysinfo/board_name 2>/dev/null")[0].strip()
    say(f"  当前：OpenWrt {cur.group(1) if cur else '?'}，target {tgt.group(1) if tgt else '?'}，board {board or '?'}")
    if board and "4a-gigabit" not in board or (board and "v2" in board):
        sys.exit(f"board 是 {board}，不是 xiaomi,mi-router-4a-gigabit（v1），已停止。")
    mine = re.search(r"openwrt-([\d.]+)-", os.path.basename(fw))
    if mine and cur and mine.group(1) == cur.group(1):
        say("  ! 固件版本和当前相同。")
        if not ask_yes("  仍要继续吗？", False):
            sys.exit("已取消。")

    # the overlay is only ~7 MB: a nearly full one makes the restore after the upgrade fail
    ov = r.run("df -k /overlay | tail -1")[0].split()
    state = r.run("ls -l /overlay/.fs_state 2>/dev/null")[0].strip()
    free = int(ov[3]) if len(ov) >= 4 and ov[3].isdigit() else -1
    say(f"  可写区剩余 {free} KB；标记：{state.split('/overlay/')[-1] if state else '无'}")
    keep = [l for l in r.run("grep -v '^#' /etc/sysupgrade.conf 2>/dev/null | grep -v '^$'")[0].splitlines() if l.strip()]
    if keep:
        say("  ! /etc/sysupgrade.conf 里有额外的保留项（升级时会被恢复，占用可写区）：\n" + "\n".join("      " + k for k in keep[:12]))
    if free != -1 and free < 1500:
        say("  ! 可写区剩余不足 1.5MB，升级后恢复可能把它撑满，导致下次重启配置被清空（教程第 8.1 节）。")
        if not ask_yes("  仍要继续吗？（不建议）", False):
            sys.exit("已取消。")

    dest = os.path.join(BACKUP_ROOT, "脚本升级前备份-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    had_proxy = r.run("[ -x /usr/bin/xr ] && echo yes || echo no")[0].strip() == "yes"
    if had_proxy:
        say("  检测到你装过自制的代理程序。升级会把 /usr/bin 里的程序清掉（配置会保留），升级后脚本会问你要不要重装。")
    os.makedirs(dest, exist_ok=True)
    r.run("sysupgrade -b /tmp/xf_backup.tar.gz")
    size, got = r.pull("cat /tmp/xf_backup.tar.gz", os.path.join(dest, "config-backup.tar.gz"))
    say(f"  配置备份已取回：{dest}\\config-backup.tar.gz（{size} 字节）\n  它含 root 密码哈希和 Wi-Fi 密码，请勿外传。")

    say("\n--- 上传并校验固件 ---")
    check_ram(r, os.path.getsize(fw))
    r.put(fw, "/tmp/xf_fw.bin")
    want = sha256_file(fw)
    have = r.run("sha256sum /tmp/xf_fw.bin")[0].split()[0:1]
    say(f"  电脑   {want}\n  路由器 {have[0] if have else '?'}")
    if not have or have[0] != want:
        sys.exit("SHA256 不一致，已停止（什么都没刷）。")
    out, rc = r.run("sysupgrade -T /tmp/xf_fw.bin 2>&1; echo rc=$?")
    say("  sysupgrade -T 试跑：" + out.strip().replace("\n", " | ")[-120:])
    if not out.strip().endswith("rc=0"):
        sys.exit("试跑没通过，已停止（什么都没刷）。")

    say("\n=================== 最后确认 ===================")
    say("将执行 sysupgrade（保留配置），约 2 分钟，期间断网。")
    if args.dry_run:
        say("\n[演练模式] 到此为止，没有升级。")
        r.run("rm -f /tmp/xf_fw.bin /tmp/xf_backup.tar.gz")
        return
    if input('确认请输入  确认升级  : ').strip() != "确认升级":
        r.run("rm -f /tmp/xf_fw.bin /tmp/xf_backup.tar.gz")
        sys.exit("没有输入确认词，已取消，路由器没有被修改。")
    try:
        r.run("sysupgrade -v /tmp/xf_fw.bin 2>&1")
    except Exception as e:  # noqa: BLE001
        say(f"  连接已断开（{type(e).__name__}），正常。")
    say("等待路由器重启 ...")
    if not wait_ssh(ip, port, total=420, first_delay=60):
        sys.exit("等不到 SSH。请检查网线，必要时拔插网线让电脑重新获取 IP。")
    time.sleep(20)
    r = Router(ip, port, pw)
    say("  新版本：" + (re.search(r"DISTRIB_RELEASE='([^']+)'", r.run("cat /etc/openwrt_release")[0]) or [None, "?"])[1])
    if "No such file" in r.run("ls /etc/board.json 2>&1")[0]:
        say("  /etc/board.json 缺失（会导致 Wi-Fi 起不来），正在重新生成 ...")
        r.run("/bin/board_detect; wifi reload")
    say("  升级完成。apk 装的软件（中文包、主题等）已被清掉，需要重装。")
    say("  先别急着多次重启：用  ls -l /overlay/.fs_state  确认指向 2、可写区还有空间。")
    if had_proxy and "no" in r.run("[ -x /usr/bin/xr ] && echo yes || echo no")[0]:
        if ask_yes("\n升级清掉了自制的代理程序和页面，现在重新安装吗？（订阅等配置还在，不会被覆盖）", True):
            try:
                install_proxy(r, {"sub": "", "records": False})
            except SystemExit as e:
                say(f"  ! 重装中止：{e}\n  可以之后用本脚本的模式 3 再试。")


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="小米 4A 千兆版 v1 一键刷 OpenWrt")
    ap.add_argument("--dry-run", action="store_true", help="演练：不做不可逆的写入")
    ap.add_argument("--fw", help="固件文件路径")
    ap.add_argument("--backup-dir", help="备份保存目录（默认 4-刷机前备份-仅限本机/）")
    args = ap.parse_args()
    if args.backup_dir:
        global BACKUP_ROOT
        BACKUP_ROOT = os.path.abspath(args.backup_dir)

    say("=" * 62)
    say(" 小米路由器 4A 千兆版 (v1) 一键刷 OpenWrt" + ("   [演练模式]" if args.dry_run else ""))
    say("=" * 62)
    say("""风险提示：刷机有变砖的风险。这个脚本只在 v1 + 原厂 2.28.38 上验证过流程，
遇到型号或分区对不上会直接停止。v2 不能用。""")
    say("\n请选择：\n  1) 原厂系统  ->  OpenWrt（首次刷机）\n  2) 已经是 OpenWrt，升级到新版\n  3) 已经是 OpenWrt，只安装“代理页面 + 上网记录页面”（自制，可选）")
    try:
        mode = ask("输入 1、2 或 3", None, lambda s: None if s in ("1", "2", "3") else "输入 1、2 或 3")
        {"1": mode_stock, "2": mode_upgrade, "3": mode_install}[mode](args)
    except (EOFError, KeyboardInterrupt):
        sys.exit("\n已中断。（如果屏幕上已经出现“正在刷入”，请不要断电，等 5 分钟再看路由器状态。）")


if __name__ == "__main__":
    main()
