package main

import (
	"encoding/base64"
	"encoding/hex"
	"flag"
	"fmt"
	"net/url"
	"os"
	"os/signal"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"syscall"

	"google.golang.org/protobuf/proto"

	"github.com/xtls/xray-core/app/dispatcher"
	"github.com/xtls/xray-core/app/proxyman"
	"github.com/xtls/xray-core/common/net"
	"github.com/xtls/xray-core/common/protocol"
	"github.com/xtls/xray-core/common/serial"
	"github.com/xtls/xray-core/common/uuid"
	"github.com/xtls/xray-core/core"
	"github.com/xtls/xray-core/proxy/dokodemo"
	xhttp "github.com/xtls/xray-core/proxy/http"
	"github.com/xtls/xray-core/proxy/shadowsocks"
	"github.com/xtls/xray-core/proxy/socks"
	"github.com/xtls/xray-core/proxy/vless"
	"github.com/xtls/xray-core/proxy/vless/outbound"
	"github.com/xtls/xray-core/transport/internet"
	"github.com/xtls/xray-core/transport/internet/reality"
	"github.com/xtls/xray-core/transport/internet/tls"
	"github.com/xtls/xray-core/transport/internet/websocket"

	applog "github.com/xtls/xray-core/app/log"
	clog "github.com/xtls/xray-core/common/log"
	_ "github.com/xtls/xray-core/app/policy"
	_ "github.com/xtls/xray-core/app/proxyman/inbound"
	_ "github.com/xtls/xray-core/app/proxyman/outbound"
	_ "github.com/xtls/xray-core/proxy/dokodemo"
	_ "github.com/xtls/xray-core/proxy/freedom"
	_ "github.com/xtls/xray-core/transport/internet/tcp"
	_ "github.com/xtls/xray-core/transport/internet/udp"
)

type node struct {
	name, host, id, flow, typ, sec, sni, fp, pbk, sid, wsHost, path string
	port                                                              int
}

// Provider "info" entries ("剩余流量：23 TB", "套餐到期：长期有效", ...) are fake nodes. They always carry a colon,
// so a real node that merely mentions one of these words (e.g. "官网-香港 01") is no longer thrown away.
var infoWord = regexp.MustCompile(`流量|到期|套餐|官网|重置|订阅|剩余|过期|公告|客服|网址|更新|通知|群`)

func isInfo(name string) bool {
	return (strings.Contains(name, "：") || strings.Contains(name, ":")) && infoWord.MatchString(name)
}

type stats struct {
	total, vless, kept, info int
	other, badTransport      map[string]int
}

func decodeSub(raw []byte) string {
	t := strings.TrimSpace(string(raw))
	if !strings.Contains(t, "://") {
		t = strings.TrimRight(t, "=")
		for _, enc := range []*base64.Encoding{base64.RawStdEncoding, base64.RawURLEncoding} {
			if b, err := enc.DecodeString(t); err == nil {
				t = string(b)
				break
			}
		}
	}
	return t
}

// parseAll accepts a v2rayN-style subscription (base64 of lines, or plain lines) and also reports what it dropped.
func parseAll(raw []byte) ([]node, stats) {
	st := stats{other: map[string]int{}, badTransport: map[string]int{}}
	var out []node
	for _, l := range strings.Fields(decodeSub(raw)) {
		i := strings.Index(l, "://")
		if i <= 0 {
			continue
		}
		st.total++
		if l[:i] != "vless" {
			st.other[l[:i]]++
			continue
		}
		st.vless++
		u, err := url.Parse(l)
		if err != nil || u.User == nil {
			continue
		}
		p, _ := strconv.Atoi(u.Port())
		q := u.Query()
		n := node{name: u.Fragment, host: u.Hostname(), port: p, id: u.User.Username(),
			flow: q.Get("flow"), typ: q.Get("type"), sec: q.Get("security"), sni: q.Get("sni"),
			fp: q.Get("fp"), pbk: q.Get("pbk"), sid: q.Get("sid"), wsHost: q.Get("host"), path: q.Get("path")}
		if isInfo(n.name) {
			st.info++
			continue
		}
		if n.name == "" || n.port == 0 {
			continue
		}
		if n.typ == "" || n.typ == "tcp" || n.typ == "ws" {
			out = append(out, n)
			st.kept++
		} else {
			st.badTransport[n.typ]++
		}
	}
	return out, st
}

func parse(raw []byte) []node {
	n, _ := parseAll(raw)
	return n
}

// outbound builds the VLESS outbound for this node. dialer, when set, is the tag of another outbound that this
// connection must be dialed through (that is how a chain works: the exit is dialed via the front node).
func (n node) outbound(tag, dialer string) (*core.OutboundHandlerConfig, error) {
	u, err := uuid.ParseString(n.id)
	if err != nil {
		return nil, err
	}
	sc := &internet.StreamConfig{ProtocolName: "tcp"}
	if dialer != "" {
		sc.SocketSettings = &internet.SocketConfig{DialerProxy: dialer}
	}
	sni := n.sni
	if sni == "" {
		sni = n.host
	}
	fp := n.fp
	if fp == "" {
		fp = "chrome"
	}
	if n.typ == "ws" {
		sc.ProtocolName = "websocket"
		path := n.path
		if path == "" {
			path = "/"
		}
		sc.TransportSettings = []*internet.TransportConfig{{
			ProtocolName: "websocket",
			Settings:     serial.ToTypedMessage(&websocket.Config{Host: n.wsHost, Path: path}),
		}}
	}
	switch n.sec {
	case "reality":
		pub, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(n.pbk, "="))
		if err != nil || len(pub) != 32 {
			return nil, fmt.Errorf("bad reality public key")
		}
		sid, err := hex.DecodeString(n.sid)
		if err != nil || len(sid) > 8 {
			return nil, fmt.Errorf("bad short id")
		}
		sid = append(sid, make([]byte, 8-len(sid))...)
		sc.SecurityType = serial.GetMessageType(&reality.Config{})
		sc.SecuritySettings = []*serial.TypedMessage{serial.ToTypedMessage(&reality.Config{
			Fingerprint: fp, ServerName: sni, PublicKey: pub, ShortId: sid,
			SpiderX: "/", SpiderY: make([]int64, 10)})}
	case "tls":
		sc.SecurityType = serial.GetMessageType(&tls.Config{})
		sc.SecuritySettings = []*serial.TypedMessage{serial.ToTypedMessage(&tls.Config{ServerName: sni, Fingerprint: fp})}
	}
	return &core.OutboundHandlerConfig{
		Tag:            tag,
		SenderSettings: serial.ToTypedMessage(&proxyman.SenderConfig{StreamSettings: sc}),
		ProxySettings: serial.ToTypedMessage(&outbound.Config{Vnext: &protocol.ServerEndpoint{
			Address: net.NewIPOrDomain(net.ParseAddress(n.host)), Port: uint32(n.port),
			User: &protocol.User{Account: serial.ToTypedMessage(&vless.Account{Id: u.String(), Flow: n.flow, Encryption: "none"})}}}),
	}, nil
}

var verbose bool

/* ---------- chain proxy: the selected node is the FRONT hop, the chain proxy is the EXIT ----------
   client -> front (selected node) -> exit (e.g. a residential socks5) -> website
   Accepted exits: socks5://[user:pass@]host:port  http://[user:pass@]host:port  vless://...  ss://... */

type chainSpec struct {
	scheme, host, user, pass, method string
	port                             int
	vless                            *node
}

func decodeB64(s string) ([]byte, error) {
	s = strings.TrimRight(s, "=")
	if b, err := base64.RawStdEncoding.DecodeString(s); err == nil {
		return b, nil
	}
	return base64.RawURLEncoding.DecodeString(s)
}

func parseSS(c *chainSpec, body string) (*chainSpec, error) {
	bad := fmt.Errorf("cannot parse the ss:// address (expected ss://method:password@host:port or the base64 form)")
	if !strings.Contains(body, "@") { // legacy form: everything is base64
		b, err := decodeB64(body)
		if err != nil {
			return nil, bad
		}
		body = string(b)
	}
	u, err := url.Parse("ss://" + body)
	if err != nil || u.User == nil || u.Hostname() == "" {
		return nil, bad
	}
	if pw, ok := u.User.Password(); ok {
		c.method, c.pass = u.User.Username(), pw
	} else {
		b, err := decodeB64(u.User.Username())
		mp := strings.SplitN(string(b), ":", 2)
		if err != nil || len(mp) != 2 {
			return nil, bad
		}
		c.method, c.pass = mp[0], mp[1]
	}
	c.host = u.Hostname()
	c.port, _ = strconv.Atoi(u.Port())
	if c.port == 0 {
		return nil, bad
	}
	return c, nil
}

func parseChain(raw string) (*chainSpec, error) {
	raw = strings.TrimSpace(raw)
	i := strings.Index(raw, "://")
	if i <= 0 {
		return nil, fmt.Errorf("chain proxy must look like socks5://user:pass@host:port")
	}
	scheme := strings.ToLower(raw[:i])
	switch scheme {
	case "vless":
		if !strings.Contains(raw, "#") {
			raw += "#chain"
		}
		ns, _ := parseAll([]byte(raw))
		if len(ns) != 1 {
			return nil, fmt.Errorf("unsupported vless link (only tcp or ws, with reality / tls / none)")
		}
		return &chainSpec{scheme: "vless", vless: &ns[0]}, nil
	case "socks5", "socks", "http", "ss":
	default:
		return nil, fmt.Errorf("unsupported chain scheme %q (use socks5, http, vless or ss)", scheme)
	}
	c := &chainSpec{scheme: scheme}
	if scheme == "socks" {
		c.scheme = "socks5"
	}
	if scheme == "ss" {
		body := raw[i+3:]
		if h := strings.Index(body, "#"); h >= 0 {
			body = body[:h]
		}
		return parseSS(c, body)
	}
	u, err := url.Parse(raw)
	if err != nil || u.Hostname() == "" {
		return nil, fmt.Errorf("cannot parse the chain proxy address")
	}
	c.host = u.Hostname()
	c.port, _ = strconv.Atoi(u.Port())
	if c.port == 0 {
		c.port = 1080
		if scheme == "http" {
			c.port = 8080
		}
	}
	if u.User != nil {
		c.user = u.User.Username()
		c.pass, _ = u.User.Password()
	}
	return c, nil
}

var ssCipher = map[string]shadowsocks.CipherType{
	"aes-128-gcm": shadowsocks.CipherType_AES_128_GCM, "aes-256-gcm": shadowsocks.CipherType_AES_256_GCM,
	"chacha20-ietf-poly1305": shadowsocks.CipherType_CHACHA20_POLY1305, "chacha20-poly1305": shadowsocks.CipherType_CHACHA20_POLY1305,
	"xchacha20-ietf-poly1305": shadowsocks.CipherType_XCHACHA20_POLY1305,
}

func (c *chainSpec) outbound(dialer string) (*core.OutboundHandlerConfig, error) {
	if c.vless != nil {
		return c.vless.outbound("chain", dialer)
	}
	sc := &internet.StreamConfig{ProtocolName: "tcp"}
	if dialer != "" {
		sc.SocketSettings = &internet.SocketConfig{DialerProxy: dialer}
	}
	ep := &protocol.ServerEndpoint{Address: net.NewIPOrDomain(net.ParseAddress(c.host)), Port: uint32(c.port)}
	var ps proto.Message
	switch c.scheme {
	case "socks5":
		if c.user != "" || c.pass != "" {
			ep.User = &protocol.User{Account: serial.ToTypedMessage(&socks.Account{Username: c.user, Password: c.pass})}
		}
		ps = &socks.ClientConfig{Server: ep}
	case "http":
		if c.user != "" || c.pass != "" {
			ep.User = &protocol.User{Account: serial.ToTypedMessage(&xhttp.Account{Username: c.user, Password: c.pass})}
		}
		ps = &xhttp.ClientConfig{Server: ep}
	case "ss":
		ct, ok := ssCipher[strings.ToLower(c.method)]
		if !ok {
			return nil, fmt.Errorf("unsupported shadowsocks cipher %q (aes-128-gcm, aes-256-gcm, chacha20-ietf-poly1305, xchacha20-ietf-poly1305)", c.method)
		}
		ep.User = &protocol.User{Account: serial.ToTypedMessage(&shadowsocks.Account{Password: c.pass, CipherType: ct})}
		ps = &shadowsocks.ClientConfig{Server: ep}
	default:
		return nil, fmt.Errorf("unsupported chain scheme")
	}
	return &core.OutboundHandlerConfig{
		Tag:            "chain",
		SenderSettings: serial.ToTypedMessage(&proxyman.SenderConfig{StreamSettings: sc}),
		ProxySettings:  serial.ToTypedMessage(ps),
	}, nil
}

// build assembles the whole config. socksPort > 0 is a debugging aid: a local socks inbound on 127.0.0.1 instead of the redirect inbound.
func build(n node, port uint32, chain *chainSpec, socksPort uint32, noFront bool) (*core.Config, error) {
	front, err := n.outbound("proxy", "")
	if err != nil {
		return nil, err
	}
	outs := []*core.OutboundHandlerConfig{front}
	if chain != nil {
		dialer := "proxy"
		if noFront {
			dialer = ""
		}
		exit, err := chain.outbound(dialer)
		if err != nil {
			return nil, err
		}
		outs = []*core.OutboundHandlerConfig{exit, front} // the first outbound is the default route: traffic leaves through the exit
	}
	in := &core.InboundHandlerConfig{
		Tag: "in",
		ReceiverSettings: serial.ToTypedMessage(&proxyman.ReceiverConfig{
			PortList:                   &net.PortList{Range: []*net.PortRange{{From: port, To: port}}},
			ReceiveOriginalDestination: true,
			SniffingSettings:           &proxyman.SniffingConfig{Enabled: true, DestinationOverride: []string{"http", "tls"}},
			StreamSettings: &internet.StreamConfig{ProtocolName: "tcp",
				SocketSettings: &internet.SocketConfig{Tproxy: internet.SocketConfig_Redirect}},
		}),
		ProxySettings: serial.ToTypedMessage(&dokodemo.Config{
			AllowedNetworks: []net.Network{net.Network_TCP}, FollowRedirect: true}),
	}
	if socksPort > 0 {
		in = &core.InboundHandlerConfig{
			Tag: "dbg",
			ReceiverSettings: serial.ToTypedMessage(&proxyman.ReceiverConfig{
				PortList:       &net.PortList{Range: []*net.PortRange{{From: socksPort, To: socksPort}}},
				Listen:         net.NewIPOrDomain(net.LocalHostIP),
				StreamSettings: &internet.StreamConfig{ProtocolName: "tcp"},
			}),
			ProxySettings: serial.ToTypedMessage(&socks.ServerConfig{AuthType: socks.AuthType_NO_AUTH}),
		}
	}
	return &core.Config{
		App: []*serial.TypedMessage{
			serial.ToTypedMessage(logCfg()),
			serial.ToTypedMessage(&dispatcher.Config{}),
			serial.ToTypedMessage(&proxyman.InboundConfig{}),
			serial.ToTypedMessage(&proxyman.OutboundConfig{}),
		},
		Inbound:  []*core.InboundHandlerConfig{in},
		Outbound: outs,
	}, nil
}

func logCfg() *applog.Config {
	lv := clog.Severity_Warning
	if verbose {
		lv = clog.Severity_Debug
	}
	return &applog.Config{ErrorLogType: applog.LogType_Console, ErrorLogLevel: lv}
}

func main() {
	sub := flag.String("sub", "/etc/xray/sub.txt", "subscription file (v2rayN base64 or plain vless:// lines)")
	idx := flag.Int("n", 1, "node index (1-based, see -list)")
	name := flag.String("name", "", "pick the first node whose name matches this regexp (overrides -n)")
	list := flag.Bool("list", false, "list nodes and exit")
	showStats := flag.Bool("stats", false, "print what the subscription contains and what was dropped, then exit")
	port := flag.Uint("port", 12345, "redirect listen port")
	pbout := flag.String("pbout", "", "write generated config as protobuf and exit (debug)")
	v := flag.Bool("v", false, "debug log")
	chainURL := flag.String("chain", "", "exit proxy: the selected node becomes the front hop (socks5://, http://, vless://, ss://)")
	checkChain := flag.String("check-chain", "", "validate a chain address and exit (0 = ok)")
	socksPort := flag.Uint("socks", 0, "debug: local socks inbound on 127.0.0.1:PORT instead of the redirect inbound")
	noFront := flag.Bool("nofront", false, "debug: dial the chain exit directly, without going through the selected node")
	flag.Parse()
	verbose = *v
	if *checkChain != "" {
		c, err := parseChain(*checkChain)
		if err == nil {
			_, err = c.outbound("proxy")
		}
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Println("ok")
		return
	}
	var chain *chainSpec
	if *chainURL != "" {
		c, err := parseChain(*chainURL)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		chain = c
	}
	raw, err := os.ReadFile(*sub)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	nodes, st := parseAll(raw)
	if *showStats {
		fmt.Printf("total=%d\nvless=%d\nkept=%d\ninfo=%d\n", st.total, st.vless, st.kept, st.info)
		kv := func(key string, m map[string]int) {
			var parts []string
			for k, v := range m {
				parts = append(parts, fmt.Sprintf("%s:%d", k, v))
			}
			sort.Strings(parts)
			fmt.Printf("%s=%s\n", key, strings.Join(parts, ","))
		}
		kv("other", st.other)
		kv("badtransport", st.badTransport)
		return
	}
	if *list {
		for i, n := range nodes {
			fmt.Printf("%d\t%s\t%s/%s\n", i+1, n.name, n.typ, n.sec)
		}
		return
	}
	if *name != "" {
		re, err := regexp.Compile(*name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		*idx = 0
		for i, n := range nodes {
			if re.MatchString(n.name) {
				*idx = i + 1
				break
			}
		}
	}
	if *idx < 1 || *idx > len(nodes) {
		fmt.Fprintf(os.Stderr, "node %d out of range (1-%d)\n", *idx, len(nodes))
		os.Exit(1)
	}
	cfg, err := build(nodes[*idx-1], uint32(*port), chain, uint32(*socksPort), *noFront)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if *pbout != "" {
		b, _ := proto.Marshal(cfg)
		os.WriteFile(*pbout, b, 0600)
		return
	}
	s, err := core.New(cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := s.Start(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	s.Close()
}
