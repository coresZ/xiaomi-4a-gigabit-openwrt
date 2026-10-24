import socket, sys
from ssh2.session import Session
def conn(pw="root"):
    s=socket.socket(); s.settimeout(10); s.connect(("192.168.31.1",122))
    se=Session(); se.handshake(s); se.userauth_password("root",pw); return se
def run(se,cmd):
    ch=se.open_session(); ch.execute(cmd)
    out=b""
    while True:
        n,d=ch.read(4096)
        if n<=0: break
        out+=d
    ch.wait_eof(); ch.close(); ch.wait_closed()
    return out.decode(errors="replace"), ch.get_exit_status()
def put(se,local,remote):
    ch=se.open_session(); ch.execute(f"cat > {remote}")
    with open(local,"rb") as f:
        while (b:=f.read(32768)):
            while b:
                r=ch.write(b)
                n=r[1] if isinstance(r,tuple) else r
                b=b[n:]
    ch.send_eof(); ch.wait_eof(); ch.close(); ch.wait_closed()
