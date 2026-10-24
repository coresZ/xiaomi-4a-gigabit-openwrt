#!/usr/bin/env python3
"""Refresh the China IP lists inside xray.nft.

Reads APNIC's delegation file, aggregates the CN IPv4/IPv6 ranges into CIDR prefixes, and replaces the
`set cn4` / `set cn6` element lists in an existing xray.nft. Everything else in the file is left untouched.

  python gen_cn_nft.py                         # download the latest APNIC data, update xray.nft in place
  python gen_cn_nft.py --apnic delegated.txt   # use a file you already downloaded
  python gen_cn_nft.py --out new.nft           # write somewhere else instead of overwriting

Source: https://ftp.apnic.net/stats/apnic/delegated-apnic-latest
After updating, copy xray.nft to /etc/xray/xray.nft on the router and run:  xray-sub rules on
"""
import argparse, ipaddress, re, sys, urllib.request

URL = "https://ftp.apnic.net/stats/apnic/delegated-apnic-latest"


def cn_prefixes(text):
    v4, v6 = [], []
    for line in text.splitlines():
        p = line.strip().split("|")
        if len(p) < 7 or p[1] != "CN" or p[6] not in ("allocated", "assigned"):
            continue
        if p[2] == "ipv4":
            a = ipaddress.IPv4Address(p[3])
            v4 += ipaddress.summarize_address_range(a, ipaddress.IPv4Address(int(a) + int(p[4]) - 1))
        elif p[2] == "ipv6":
            v6.append(ipaddress.IPv6Network(f"{p[3]}/{p[4]}"))
    return list(ipaddress.collapse_addresses(v4)), list(ipaddress.collapse_addresses(v6))


def replace_set(nft, name, prefixes):
    # the element list of "set <name> { ... elements = {\n ... \n\t\t}\n\t}"
    pat = re.compile(r"(set %s \{.*?elements = \{\n)(.*?)(\n\t\t\})" % re.escape(name), re.S)
    if not pat.search(nft):
        sys.exit(f"could not find 'set {name}' with an element list in the nft file")
    body = ",\n".join(str(x) for x in prefixes)
    return pat.sub(lambda m: m.group(1) + body + m.group(3), nft, count=1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nft", default="xray.nft", help="rules template to update (default: ./xray.nft)")
    ap.add_argument("--apnic", help="local APNIC delegation file (default: download)")
    ap.add_argument("--out", help="output file (default: overwrite --nft)")
    a = ap.parse_args()

    if a.apnic:
        text = open(a.apnic, encoding="utf-8").read()
    else:
        print("downloading", URL, flush=True)
        text = urllib.request.urlopen(URL, timeout=120).read().decode("utf-8")
    v4, v6 = cn_prefixes(text)
    if len(v4) < 1000 or len(v6) < 100:
        sys.exit(f"suspiciously small result (IPv4 {len(v4)}, IPv6 {len(v6)} prefixes): refusing to write")

    nft = open(a.nft, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    nft = replace_set(replace_set(nft, "cn4", v4), "cn6", v6)
    out = a.out or a.nft
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(nft)
    print(f"wrote {out}: {len(v4)} IPv4 and {len(v6)} IPv6 China prefixes")


if __name__ == "__main__":
    main()
