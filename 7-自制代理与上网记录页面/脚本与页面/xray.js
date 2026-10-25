'use strict';
'require view';
'require fs';
'require poll';
'require ui';

var BIN = '/usr/bin/xray-sub';

var CSS = [
	'.xr{width:100%;max-width:1100px;min-width:0;margin:0 auto;padding-top:40px;--xr-a:#5b7cff;--xr-a2:#8b5cf6;--xr-ok:#22c55e;--xr-bad:#ef4444;--xr-line:rgba(127,127,127,.28);--xr-soft:rgba(127,127,127,.09)}',
	'.xr *{box-sizing:border-box}',
	'.xr-title{font-size:24px;font-weight:800;letter-spacing:.5px;margin:0 0 2px}',
	'.xr-sub{opacity:.7;font-size:13px;margin:0 0 12px}',
	'.xr-card{min-width:0;border:1px solid var(--xr-line);border-radius:18px;padding:12px 14px;margin:0 0 10px;background:var(--xr-soft)}',
	/* hero: current node, state chips, the two quick actions */
	'.xr-hero{background:linear-gradient(135deg,#5b7cff 0%,#7c5cff 55%,#a35cf0 100%);color:#fff;border:0;box-shadow:0 10px 30px rgba(91,124,255,.28);position:relative;overflow:hidden;border-radius:22px;padding:16px;margin-bottom:12px}',
	'.xr-hero:before{content:"";position:absolute;right:-60px;top:-70px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.10)}',
	'.xr-hero>*{position:relative}',
	'.xr-now{margin:0 0 10px}',
	'.xr-now .lab{font-size:12px;opacity:.85}',
	'.xr-now .big{font-size:24px;line-height:1.2;font-weight:800;word-break:break-all}',
	'.xr-chips{display:flex;flex-wrap:wrap;gap:6px}',
	'.xr-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12.5px;white-space:nowrap;background:rgba(255,255,255,.18);color:#fff}',
	'.xr-dot{width:8px;height:8px;border-radius:50%;background:#cbd5e1;display:inline-block;flex:0 0 auto}',
	'.xr-chip.ok .xr-dot{background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.3)}',
	'.xr-chip.bad .xr-dot{background:#fca5a5;box-shadow:0 0 0 3px rgba(252,165,165,.3)}',
	'.xr-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}',
	'.xr-two .xr-btn{min-height:38px;padding:4px 10px;background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.38);color:#fff;font-size:14.5px;white-space:nowrap}',
	'.xr-two .xr-btn:hover{background:rgba(255,255,255,.26)}',
	/* collapsible sections */
	'details.xr-det>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:34px;font-size:15.5px;font-weight:700}',
	'details.xr-det>summary::-webkit-details-marker{display:none}',
	'details.xr-det>summary::after{content:"";flex:0 0 auto;width:8px;height:8px;margin:0 4px 3px 2px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);opacity:.55;transition:transform .15s}',
	'details.xr-det[open]>summary::after{transform:rotate(-135deg);margin-bottom:-2px}',
	'details.xr-det[open]>summary{margin-bottom:10px}',
	'.xr-hint{margin-left:auto;min-width:0;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:400;opacity:.7}',
	/* controls */
	'.xr-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
	'.xr-field{width:100%;min-height:40px;font-size:15px;padding:6px 12px;border-radius:12px;border:1px solid var(--xr-line);background:rgba(255,255,255,.04);color:inherit}',
	'.xr-btn{min-height:40px;padding:6px 16px;border-radius:12px;border:1px solid var(--xr-line);background:transparent;color:inherit;font-size:14.5px;cursor:pointer;transition:background .15s,transform .1s}',
	'.xr-btn:active{transform:scale(.98)}',
	'.xr-btn.pri{background:linear-gradient(135deg,var(--xr-a),var(--xr-a2));border-color:transparent;color:#fff;font-weight:600}',
	'.xr-btn[disabled]{opacity:.45;cursor:not-allowed}',
	'.xr-inline{flex-wrap:nowrap}.xr-inline .xr-field{flex:1 1 auto;width:auto;min-width:0}.xr-inline .xr-btn{flex:0 0 auto;white-space:nowrap}',
	'.xr-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:14px;border:1px solid var(--xr-line);background:rgba(127,127,127,.08);margin:0 0 8px}',
	'.xr-seg button{min-height:38px;border-radius:10px;border:0;background:transparent;color:inherit;font-size:14.5px;cursor:pointer;padding:4px 8px}',
	'.xr-seg button.on{background:linear-gradient(135deg,var(--xr-a),var(--xr-a2));color:#fff;font-weight:700;box-shadow:0 4px 12px rgba(91,124,255,.35)}',
	'.xr-tip{font-size:12.5px;opacity:.7;margin:8px 0 0;line-height:1.5}',
	'.xr-lab{font-size:13px;font-weight:600;margin:10px 0 6px;opacity:.85}',
	'.xr-ptxt{font-size:13.5px;margin-top:8px;word-break:break-all}',
	/* dropdown with ticks */
	'.xr-dd{min-width:0}',
	'.xr-ddbtn{width:100%;min-height:42px;display:flex;align-items:center;gap:8px;padding:4px 12px;border-radius:12px;border:1px solid var(--xr-line);background:rgba(255,255,255,.04);color:inherit;font-size:14.5px;cursor:pointer;text-align:left}',
	'.xr-ddbtn .txt{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
	'.xr-ddbtn .caret{flex:0 0 auto;opacity:.55;transition:transform .15s}',
	'.xr-dd.open .xr-ddbtn{border-color:var(--xr-a)}',
	'.xr-dd.open .xr-ddbtn .caret{transform:rotate(180deg)}',
	'.xr-ddp{display:none;margin-top:6px;border:1px solid var(--xr-line);border-radius:12px;background:rgba(127,127,127,.06);overflow:hidden}',
	'.xr-dd.open .xr-ddp{display:block}',
	'.xr-ddh{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--xr-line)}',
	'.xr-ddh .xr-field{min-height:36px;font-size:14px;padding:4px 10px;flex:1 1 120px;width:auto;min-width:0}',
	'.xr-ddh input.xr-field{background:rgba(127,127,127,.1)!important;border:1px solid var(--xr-line)!important;border-radius:10px!important}',
	'.xr-ddh .xr-btn{min-height:32px;padding:2px 12px;font-size:13px}',
	'.xr-ddc{margin-left:auto;font-size:12px;opacity:.65}',
	'.xr-ddl{max-height:min(320px,55vh);overflow-y:auto;-webkit-overflow-scrolling:touch}',
	'.xr-opt{display:flex;align-items:center;gap:8px;min-height:38px;padding:3px 10px;border-bottom:1px solid var(--xr-line);cursor:pointer;min-width:0}',
	'.xr-opt:last-child{border-bottom:0}',
	'.xr-opt:hover{background:rgba(91,124,255,.08)}',
	'.xr-opt.cur{background:rgba(91,124,255,.12)}',
	'.xr-opt input{width:18px;height:18px;flex:0 0 auto;margin:0!important;align-self:center;position:static!important;top:0!important}',
	'.xr-grp{padding:5px 10px;font-size:12px;font-weight:700;opacity:.8;background:rgba(127,127,127,.12);border-bottom:1px solid var(--xr-line)}',
	'.xr-grp small{font-weight:400;opacity:.7;margin-left:4px}',
	'.xr-opt .f{flex:0 0 auto;font-size:17px;line-height:1}',
	'.xr-opt .n{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}',
	'.xr-opt .n small{font-weight:400;font-size:11.5px;opacity:.6;margin-left:6px}',
	'.xr-opt.two{min-height:52px;padding:6px 12px;gap:10px}',
	'.xr-opt.two .n{font-size:15px}',
	'.xr-opt.two .n small{display:block;margin:2px 0 0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
	'.xr-opt.two .f{font-size:22px}',
	'.xr-opt .t{flex:0 0 auto;font-size:11px;padding:0 7px;line-height:18px;border-radius:99px;border:1px solid var(--xr-line);opacity:.85;white-space:nowrap}',
	'.xr-opt .t.on{background:var(--xr-ok);border-color:transparent;color:#fff;opacity:1}',
	'.xr-opt .s{flex:0 0 auto;font-size:11.5px;opacity:.65}',
	'.xr-opt .xr-dot{background:#94a3b8}.xr-opt .xr-dot.ok{background:var(--xr-ok)}',
	'.xr-opt .d{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}',
	'.xr-opt .d small{font-weight:400;font-size:11.5px;opacity:.6;margin-left:6px}',
	'.xr-form{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}',
	'.xr-f{display:block;min-width:0}',
	'.xr-f.full{grid-column:1/3}',
	'.xr-fl{display:block;font-size:12px;opacity:.7;margin:0 0 3px}',
	'.xr-ta{min-height:92px;resize:vertical;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13.5px;line-height:1.5}',
	'.xr-two3{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
	'.xr-status{margin:10px 0 0;padding:8px 12px;border-radius:12px;border:1px solid var(--xr-line);background:rgba(127,127,127,.06);font-size:13px;line-height:1.6}',
	'.xr-status b{font-weight:700}',
	'.xr-empty{padding:16px 8px;text-align:center;opacity:.65;font-size:13.5px}',
	'.xr-sel{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
	'.xr-sel:empty{display:none}',
	'.xr-sc{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:2px 4px 2px 10px;border-radius:99px;border:1px solid var(--xr-line);background:rgba(91,124,255,.1);font-size:13px}',
	'.xr-sc span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
	'.xr-sc button{flex:0 0 auto;width:22px;height:22px;border:0;border-radius:50%;background:rgba(127,127,127,.2);color:inherit;font-size:14px;line-height:1;cursor:pointer;padding:0}',
	'.xr-use{display:none;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:8px 8px 8px 12px;border-radius:12px;background:linear-gradient(135deg,var(--xr-a),var(--xr-a2));color:#fff}',
	'.xr-use.show{display:flex}',
	'.xr-use span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}',
	'.xr-use button{flex:0 0 auto;min-height:34px;border-radius:9px;border:0;padding:2px 14px;font-weight:700;cursor:pointer;background:#fff;color:#3b5bdb}',
	'@media (max-width:640px){',
	'.xr-now .big{font-size:20px}',
	'.xr-hero{padding:14px}',
	'.xr-card{padding:10px 12px;border-radius:14px}',
	'.xr-row:not(.xr-inline)>.xr-btn{flex:1 1 auto}',
	'}',
	'.xr-card:not(.xr-hero){background:#fff;border-color:rgba(91,124,255,.10);box-shadow:0 8px 24px rgba(30,41,80,.05);position:relative;overflow:hidden}',
	'.xr-card:not(.xr-hero):before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#5b7cff,#8b5cf6)}',
	'.xr-two .xr-btn{background:rgba(255,255,255,.24);border-color:rgba(255,255,255,.62)}',
	'details.xr-det>summary:hover .xr-hint{opacity:1}',
	'html.dark .xr-card{background:rgba(255,255,255,.05)}',
].join('\n');

function sub(args) {
	return fs.exec(BIN, args).then(function(r) { return (r && r.stdout) || ''; });
}

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function kv(txt) {
	var o = {};
	txt.split('\n').forEach(function(l) {
		var i = l.indexOf('=');
		if (i > 0) o[l.substr(0, i)] = l.substr(i + 1);
	});
	return o;
}

/* region label -> words that identify it in a node name (Chinese name, or the 2-letter code standing alone) */
var REGIONS = [
	['台湾', '台湾|台灣|TW'], ['香港', '香港|HK'], ['日本', '日本|JP'], ['新加坡', '新加坡|狮城|SG'], ['韩国', '韩国|南韩|KR'],
	['美国', '美国|US'], ['英国', '英国|GB|UK'], ['德国', '德国|DE'], ['法国', '法国|FR'], ['荷兰', '荷兰|NL'],
	['俄罗斯', '俄罗斯|RU'], ['马来西亚', '马来西亚|马来|MY'], ['泰国', '泰国|TH'], ['墨西哥', '墨西哥|MX'], ['塞尔维亚', '塞尔维亚|RS'],
	['丹麦', '丹麦|DK'], ['加拿大', '加拿大|CA'], ['澳大利亚', '澳大利亚|澳洲|AU'], ['印度', '印度|IN'], ['土耳其', '土耳其|TR'],
	['巴西', '巴西|BR'], ['阿根廷', '阿根廷|AR'], ['意大利', '意大利|IT'], ['西班牙', '西班牙|ES'], ['瑞典', '瑞典|SE'],
	['瑞士', '瑞士|CH'], ['芬兰', '芬兰|FI'], ['波兰', '波兰|PL'], ['乌克兰', '乌克兰|UA'], ['印尼', '印尼|ID'],
	['菲律宾', '菲律宾|PH'], ['越南', '越南|VN'], ['阿联酋', '阿联酋|AE'], ['以色列', '以色列|IL'], ['南非', '南非|ZA'],
	['挪威', '挪威|NO'], ['爱尔兰', '爱尔兰|IE'], ['奥地利', '奥地利|AT'], ['中国大陆', '中国大陆|CN']
].map(function(r) {
	var parts = r[1].split('|');
	var words = parts.map(function(w) { return /^[A-Z]{2}$/.test(w) ? '(^|[^A-Za-z])' + w + '([^A-Za-z]|$)' : w; });
	var codes = parts.filter(function(w) { return /^[A-Z]{2}$/.test(w); });
	return { label: r[0], re: new RegExp(words.join('|')), code: codes[0] };
});

function flagCode(flag) {
	if (!flag) return '';
	var a = flag.codePointAt(0), b = flag.codePointAt(2);
	return String.fromCharCode(a - 0x1F1E6 + 65, b - 0x1F1E6 + 65);
}

/* "吹雪云-🇰🇷韩国•移联01", "🇯🇵 日本 01", "cf-🇭🇰 HK 官方优选[...]" -> provider, flag, region label, display title */
function parseName(name) {
	var m = name.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u), flag = m ? m[0] : '';
	var rest = name.replace(flag, '').replace(/^\s+/, '');
	var dash = rest.indexOf('-'), provider = dash > 0 ? rest.substr(0, dash).trim() : '';
	var title = (dash > 0 ? rest.substr(dash + 1) : rest).trim() || name;
	var region = '', i, fc = flagCode(flag);
	for (i = 0; i < REGIONS.length && !region; i++) if (REGIONS[i].re.test(rest)) region = REGIONS[i].label;
	for (i = 0; i < REGIONS.length && !region && fc; i++) if (REGIONS[i].code === fc) region = REGIONS[i].label;
	return { flag: flag, provider: provider, title: title, region: region || '其他' };
}

function parseNodes(txt) {
	return txt.split('\n').filter(Boolean).map(function(l) {
		var p = l.split('\t'), n = { idx: p[0], name: p[1] || '', kind: (p[2] || '').replace(/^\//, '') };
		n.info = parseName(n.name);
		return n;
	});
}

function parseStatus(txt) {
	var s = { run: /running/.test(txt), rules: /rules\s*:\s*on/.test(txt), mem: '', nodes: '' };
	var m = txt.match(/running,\s*(\d+) kB/); if (m) s.mem = (parseInt(m[1], 10) / 1024).toFixed(1) + ' MB';
	m = txt.match(/sub\s*:\s*(\d+)/); if (m) s.nodes = m[1];
	m = txt.match(/clients:\s*(.*)$/m); s.clients = m ? m[1].trim() : '';
	m = txt.match(/^chain\s*:\s*(.*)$/m); s.chain = m ? m[1].trim() : 'none';
	s.enabled = /enabled\s*:\s*1/.test(txt);
	m = txt.match(/node:\s*(.*)\/\d+\s+clients:/); s.node = m ? m[1] : '';
	m = txt.match(/^proxied\s*:\s*(\d+)\s+(\d+)/m); s.px = m ? +m[1] : 0; s.pall = m ? +m[2] : 0;
	return s;
}

/* "ip <TAB> name <TAB> mac <TAB> online" */
function parseDevices(txt) {
	return txt.split('\n').filter(Boolean).map(function(l) {
		var p = l.split('\t');
		return { ip: p[0], name: p[1] && p[1] !== '-' ? p[1] : '', mac: (p[2] || '').toLowerCase(), online: p[3] === '1' };
	}).sort(function(a, b) {
		if (a.online !== b.online) return a.online ? -1 : 1;
		return parseInt(a.ip.split('.')[3], 10) - parseInt(b.ip.split('.')[3], 10);
	});
}

function fmtB(b) {
	b = b || 0;
	if (b < 1024) return Math.round(b) + ' B';
	if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
	if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
	return (b / 1073741824).toFixed(2) + ' GB';
}
function p2(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(ts) {
	ts = +ts || 0; if (!ts) return '';
	var d = new Date(ts * 1000), t = p2(d.getHours()) + ':' + p2(d.getMinutes());
	return d.toDateString() === new Date().toDateString() ? '今天 ' + t : p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + t;
}

function clientsText(c) {
	var t = (c || 'all').split(' ').filter(Boolean);
	if (!t.length || t[0] === 'all') return '全部设备';
	if (t[0] === 'none') return '无（没有设备走代理）';
	return '指定 ' + t.length + ' 台';
}

/* "tcp/reality", "ws/tls", "tcp/tls", "ws/none" ... */
function badgeText(kind) {
	var p = (kind || '').split('/'), t = p[0] || 'tcp', s = p[1] || 'none';
	if (t === 'ss') return 'Shadowsocks';
	if (t.indexOf('trojan') === 0) return 'Trojan' + (t === 'trojan-ws' ? ' · WS' : '') + ' + TLS';
	if (s === 'reality') return 'Reality';
	if (s === 'tls') return (t === 'ws' ? 'WS' : 'TCP') + ' + TLS';
	return (t === 'ws' ? 'WS' : 'TCP') + '（无加密）';
}

/* output of "xray-sub stats": total=262 vless=129 kept=125 info=4 other=ss:72,trojan:32 badtransport=grpc:1 */
function statsLine(txt) {
	var s = kv(txt), n = function(k) { return parseInt(s[k], 10) || 0; };
	if (!n('total')) return '';
	var list = function(v) { return (v || '').split(',').filter(Boolean).map(function(x) { var p = x.split(':'); return p[0] + ' ' + p[1]; }).join('、'); };
	var out = '订阅共 ' + n('total') + ' 条（VLESS ' + n('vless') + (n('ss') ? '、Shadowsocks ' + n('ss') : '') + (n('trojan') ? '、Trojan ' + n('trojan') : '') + '），列出 ' + n('kept') + ' 个可用节点。';
	if (n('info')) out += '已忽略 ' + n('info') + ' 条“剩余流量 / 到期”之类的信息条目。';
	if (s.other) out += '不支持的协议（未列出）：' + list(s.other) + '。';
	if (s.badtransport) out += '不支持的传输方式（未列出）：' + list(s.badtransport) + '。';
	return out;
}

function currentNode(nodes, pattern) {
	if (!pattern) return null;
	var re;
	try { re = new RegExp(pattern); } catch (e) { return null; }
	for (var i = 0; i < nodes.length; i++) if (re.test(nodes[i].name)) return nodes[i];
	return null;
}

function note(msg, type) { ui.addNotification(null, E('p', {}, msg), type || 'info'); }

/* a button that opens a panel right below it (inline, so it never gets clipped on a phone); clicking outside closes it */
var DROPS = [];
document.addEventListener('click', function(ev) {
	DROPS.forEach(function(d) { if (d.root.classList.contains('open') && !d.root.contains(ev.target)) d.root.classList.remove('open'); });
});
function dropdown() {
	var txt = E('span', { 'class': 'txt' }), panel = E('div', { 'class': 'xr-ddp' });
	var btn = E('button', { 'type': 'button', 'class': 'xr-ddbtn' }, [ txt, E('span', { 'class': 'caret' }, '▾') ]);
	var root = E('div', { 'class': 'xr-dd' }, [ btn, panel ]);
	btn.addEventListener('click', function() { root.classList.toggle('open'); });
	var d = { root: root, txt: txt, panel: panel, close: function() { root.classList.remove('open'); } };
	DROPS.push(d);
	return d;
}

/* a collapsible section: click the title to open, click again to close */
function section(title, hintEl, body) {
	return E('div', { 'class': 'xr-card' }, E('details', { 'class': 'xr-det' }, [
		E('summary', {}, [ E('span', {}, title), hintEl ]),
		body
	]));
}

return view.extend({
	handleSave: null,
	handleSaveApply: null,
	handleReset: null,

	load: function() {
		return Promise.all([ sub([ 'get' ]), sub([ 'list' ]), sub([ 'status' ]), sub([ 'devices' ]), sub([ 'stats' ]), sub([ 'health' ]), sub([ 'chain-history' ]) ]);
	},

	render: function(d) {
		var cfg = kv(d[0]), nodes = parseNodes(d[1]), st = parseStatus(d[2]);
		var wantProxy = cfg.enabled === '1';
		var health = kv(d[5] || ''), autoSw = cfg.auto_switch === '1';
		var chainHist = (d[6] || '').split('\n').filter(Boolean);
		var devs = parseDevices(d[3] || '');
		var tokens = (cfg.clients || 'all').split(' ').filter(Boolean);
		var scope = (!tokens.length || tokens[0] === 'all') ? 'all' : 'pick';
		var sel = {};
		tokens.forEach(function(t) { if (t !== 'all' && t !== 'none') sel[t.toLowerCase()] = 1; });
		var hMode = E('span', { 'class': 'xr-hint' }), hNode = E('span', { 'class': 'xr-hint' }), hChain = E('span', { 'class': 'xr-hint' }), hSub = E('span', { 'class': 'xr-hint' });
		var hSplit = E('span', { 'class': 'xr-hint' }), hBak = E('span', { 'class': 'xr-hint' }, '导出 / 导入设置');

		/* ------------ status ------------ */
		var chips = E('div', { 'class': 'xr-chips' });
		var nowBox = E('div', { 'class': 'xr-now' });
		function drawStatus() {
			var cur = currentNode(nodes, cfg.node_name);
			while (nowBox.firstChild) nowBox.removeChild(nowBox.firstChild);
			nowBox.appendChild(E('div', { 'class': 'lab' }, st.enabled ? '当前节点' : '当前节点（代理已关闭）'));
			nowBox.appendChild(E('div', { 'class': 'big' }, cur ? ((cur.info.flag ? cur.info.flag + ' ' : '') + cur.info.title) : '未匹配到节点'));
			while (chips.firstChild) chips.removeChild(chips.firstChild);
			function chip(cls, text) { chips.appendChild(E('span', { 'class': 'xr-chip ' + cls }, [ E('span', { 'class': 'xr-dot' }), text ])); }
			chip(st.run ? 'ok' : 'bad', st.run ? '代理运行中' : '代理未运行');
			chip(st.rules ? 'ok' : '', st.rules ? '转发已生效' : '转发未启用');
			if (st.mem) chip('', '内存 ' + st.mem);
			chip('', '节点 ' + (st.nodes || nodes.length));
			chip('', clientsText(cfg.clients));
			chip(st.chain && st.chain !== 'none' ? 'ok' : '', st.chain && st.chain !== 'none' ? '链式：' + st.chain : '链式：未使用');
			if (st.pall > 0) chip('', '经代理 ' + fmtB(st.px) + '（' + Math.round(st.px * 100 / st.pall) + '%）');
			chip(health.last === 'ok' ? 'ok' : (health.last === 'fail' ? 'bad' : ''), health.last === 'ok' ? '线路检测正常' : (health.last === 'fail' ? '线路检测失败 ' + (health.fails || 0) + ' 次' : (health.last === 'wan-down' ? '外网不通' : '线路检测等待中')));
		}

		/* ------------ restart / pull subscription ------------ */
		var restartBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在重启代理服务，请稍候…'));
			sub([ 'restart' ]).then(function(out) { return new Promise(function(r) { window.setTimeout(function() { r(out); }, 8000); }); })
				.then(function(out) {
					return sub([ 'status' ]).then(function(s) {
						st = parseStatus(s); drawStatus(); ui.hideModal();
						var ok = out.indexOf('restarted') >= 0;
						note(ok ? '代理服务已重启。' : '代理目前是关闭状态，没有重启。', ok ? 'info' : 'danger');
					});
				}).catch(function(e) { ui.hideModal(); note('重启失败：' + e, 'danger'); });
		} }, '重启代理服务');
		var pullBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在拉取订阅…'));
			sub([ 'update' ]).then(function(out) {
				ui.hideModal();
				var ok = /nodes/.test(out);
				note('订阅更新：' + (out.trim() || '无输出'), ok ? 'info' : 'danger');
				if (ok) window.setTimeout(function() { location.reload(); }, 1200);
			}).catch(function(e) { ui.hideModal(); note('拉取失败：' + e, 'danger'); });
		} }, '拉取订阅');

		/* ------------ mode + devices ------------ */
		var bProxy = E('button', { 'type': 'button', 'click': function() { wantProxy = true; drawMode(); } }, '代理');
		var bDirect = E('button', { 'type': 'button', 'click': function() { wantProxy = false; drawMode(); } }, '直连');
		function drawMode() { bProxy.className = wantProxy ? 'on' : ''; bDirect.className = wantProxy ? '' : 'on'; drawHints(); }
		var sAll = E('button', { 'type': 'button', 'click': function() { scope = 'all'; drawScope(); } }, '全部设备');
		var sPick = E('button', { 'type': 'button', 'click': function() { scope = 'pick'; drawScope(); } }, '指定设备');

		var devDD = dropdown(), devHead = E('div', { 'class': 'xr-ddh' }), devList = E('div', { 'class': 'xr-ddl' });
		var devChips = E('div', { 'class': 'xr-sel' }), devWrap = E('div', {}), devAllTip = E('p', { 'class': 'xr-tip' }, '');
		function isSel(dv) { return !!(sel[dv.mac] || sel[dv.ip]); }
		function selectedCount() {
			var n = 0, known = {};
			devs.forEach(function(dv) { known[dv.mac] = 1; known[dv.ip] = 1; if (isSel(dv)) n++; });
			Object.keys(sel).forEach(function(k) { if (!known[k]) n++; });
			return n;
		}
		function devLabel(dv) { return dv.name || dv.ip; }
		function drawDevs() {
			var n = selectedCount();
			devDD.txt.textContent = n ? '已选 ' + n + ' 台设备（点开修改）' : '点这里选择设备';
			while (devList.firstChild) devList.removeChild(devList.firstChild);
			function row(title, subtitle, online, checked, toggle) {
				var cb = E('input', { 'type': 'checkbox', 'change': function() { toggle(cb.checked); drawDevs(); drawHints(); } });
				cb.checked = checked;
				devList.appendChild(E('label', { 'class': 'xr-opt' }, [
					cb, E('span', { 'class': 'xr-dot' + (online ? ' ok' : '') }),
					E('span', { 'class': 'd' }, [ title, E('small', {}, subtitle) ]),
					E('span', { 'class': 's' }, online ? '在线' : '空闲')
				]));
			}
			var known = {};
			devs.forEach(function(dv) {
				known[dv.mac] = 1; known[dv.ip] = 1;
				row(dv.name || '未命名设备', dv.ip, dv.online, isSel(dv), function(on) {
					if (on) sel[dv.mac] = 1; else { delete sel[dv.mac]; delete sel[dv.ip]; }
				});
			});
			Object.keys(sel).forEach(function(k) {
				if (known[k]) return;
				row('已保存的设备', k, false, true, function(on) { if (!on) delete sel[k]; });
			});
			if (!devList.firstChild) devList.appendChild(E('div', { 'class': 'xr-empty' }, '暂时没有发现设备。'));
			/* what is selected, shown as removable chips under the dropdown */
			while (devChips.firstChild) devChips.removeChild(devChips.firstChild);
			function chip(label, remove) {
				devChips.appendChild(E('span', { 'class': 'xr-sc' }, [ E('span', {}, label), E('button', { 'type': 'button', 'title': '取消选择', 'click': function() { remove(); drawDevs(); drawHints(); } }, '×') ]));
			}
			devs.forEach(function(dv) { if (isSel(dv)) chip(devLabel(dv), function() { delete sel[dv.mac]; delete sel[dv.ip]; }); });
			Object.keys(sel).forEach(function(k) { if (!known[k]) chip(k, function() { delete sel[k]; }); });
		}
		function drawScope() {
			sAll.className = scope === 'all' ? 'on' : ''; sPick.className = scope === 'pick' ? 'on' : '';
			devWrap.style.display = scope === 'pick' ? '' : 'none';
			devAllTip.style.display = scope === 'all' ? '' : 'none';
			devAllTip.textContent = '局域网里全部 ' + devs.length + ' 台设备都会走代理。设备或连接很多时，路由器内存可能吃紧。';
			drawDevs(); drawHints();
		}
		devHead.appendChild(E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { devs.forEach(function(dv) { sel[dv.mac] = 1; }); drawDevs(); drawHints(); } }, '全选'));
		devHead.appendChild(E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { sel = {}; drawDevs(); drawHints(); } }, '全不选'));
		devHead.appendChild(E('span', { 'class': 'xr-ddc' }, '按 MAC 地址记录，换 IP 不受影响'));
		devDD.panel.appendChild(devHead); devDD.panel.appendChild(devList);
		devWrap.appendChild(devDD.root); devWrap.appendChild(devChips);
		devWrap.appendChild(E('p', { 'class': 'xr-tip' }, '“空闲”表示最近没有通信，不一定已经离开；手机省电时常会这样。'));

		/* what gets stored: "all", or a list of device MACs (stable across DHCP renewals) */
		function clientsValue() {
			if (scope === 'all') return 'all';
			var out = {};
			devs.forEach(function(dv) { if (isSel(dv)) out[dv.mac] = 1; });
			Object.keys(sel).forEach(function(k) {
				var m = false;
				devs.forEach(function(dv) { if (dv.mac === k || dv.ip === k) m = true; });
				if (!m) out[k] = 1;
			});
			return Object.keys(out).join(' ');
		}

		function applyAll(pairs) {
			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在应用，请稍候…'));
			var chain = Promise.resolve();
			pairs.forEach(function(p) { chain = chain.then(function() { return sub([ 'set', p[0], p[1] ]); }); });
			return chain.then(function() { return sub([ 'apply' ]); })
				.then(function() { return new Promise(function(r) { window.setTimeout(r, 6000); }); })
				.then(function() { location.reload(); })
				.catch(function(e) { ui.hideModal(); note('应用失败：' + e, 'danger'); });
		}

		var quicCb = E('input', { 'type': 'checkbox', 'change': function() {
			var on = quicCb.checked;
			sub([ 'set', 'block_quic', on ? '1' : '0' ]).then(function(out) {
				if ((out || '').trim() !== 'ok') { quicCb.checked = !on; note((out || '').trim(), 'danger'); return null; }
				cfg.block_quic = on ? '1' : '0';
				if (!st.run) { note('已保存，代理开启后生效。', 'info'); return null; }
				return sub([ 'rules', 'on' ]).then(function() { note(on ? '已拦截 QUIC，App 会改走 TCP 再经过代理。' : '已取消拦截，UDP 443 恢复直连。', 'info'); });
			}).catch(function(e) { quicCb.checked = !on; note('设置失败：' + e, 'danger'); });
		} });
		quicCb.checked = cfg.block_quic !== '0';
		var saveMode = E('button', { 'type': 'button', 'class': 'xr-btn pri', 'click': function() {
			var cv = clientsValue();
			if (!cv) { note('请至少选择一台设备；或选择“全部设备”，或把模式切到“直连”。', 'danger'); return; }
			if ((wantProxy ? '1' : '0') !== cfg.enabled) {
				applyAll([ [ 'enabled', wantProxy ? '1' : '0' ], [ 'clients', cv ] ]);
				return;
			}
			/* only the device list changed: reload the forwarding rules, no need to restart the proxy */
			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在应用…'));
			sub([ 'set', 'clients', cv ]).then(function() { return sub([ 'rules', 'on' ]); })
				.then(function() { return new Promise(function(r) { window.setTimeout(r, 1500); }); })
				.then(function() { location.reload(); })
				.catch(function(e) { ui.hideModal(); note('应用失败：' + e, 'danger'); });
		} }, '保存并应用');

		/* ------------ nodes: pick a region first, then a node of that region ------------ */
		var cur0 = currentNode(nodes, cfg.node_name), selected = cur0;
		var q = '';
		var regionDD = dropdown(), regionList = E('div', { 'class': 'xr-ddl' });
		var nodeDD = dropdown(), nodeList = E('div', { 'class': 'xr-ddl' }), nodeCount = E('span', { 'class': 'xr-ddc' }, '');
		var useName = E('span', {}, ''), useBox = E('div', { 'class': 'xr-use' }, [ useName,
			E('button', { 'type': 'button', 'click': function() {
				if (selected) applyAll([ [ 'node_name', '^' + esc(selected.name) + '$' ], [ 'enabled', '1' ], [ 'auto_switch', '0' ] ]);   /* a node picked by hand is pinned */
			} }, '使用此节点') ]);
		var useBtn = useBox.querySelector('button');

		/* sources (providers), the biggest first; null = all of them */
		var prov = null, provCount = {}, provOrder = [];
		nodes.forEach(function(n) { var k = n.info.provider; if (!(k in provCount)) { provCount[k] = 0; provOrder.push(k); } provCount[k]++; });
		provOrder.sort(function(x, y) { return provCount[y] - provCount[x]; });
		var provDD = dropdown(), provList = E('div', { 'class': 'xr-ddl' });
		function provText() { return prov === null ? '全部来源（' + nodes.length + ' 个节点）' : (prov || '未标注') + '（' + provCount[prov] + ' 个节点）'; }

		/* regions of the chosen source, the biggest first, each with a flag taken from one of its nodes */
		var regionCount, regionFlag, regionOrder, region = cur0 ? cur0.info.region : '';
		function computeRegions() {
			regionCount = {}; regionFlag = {}; regionOrder = [];
			nodes.forEach(function(n) {
				if (prov !== null && n.info.provider !== prov) return;
				var k = n.info.region;
				if (!(k in regionCount)) { regionCount[k] = 0; regionOrder.push(k); }
				regionCount[k]++;
				if (!regionFlag[k] && n.info.flag) regionFlag[k] = n.info.flag;
			});
			regionOrder.sort(function(x, y) { return regionCount[y] - regionCount[x]; });
			if (!(region in regionCount)) region = regionOrder[0] || '';
		}
		computeRegions();

		function regionText(k) { return (regionFlag[k] ? regionFlag[k] + ' ' : '') + k + '（' + regionCount[k] + ' 个节点）'; }
		function visible() {
			return nodes.filter(function(n) { return n.info.region === region && (prov === null || n.info.provider === prov) && (!q || n.name.toLowerCase().indexOf(q) >= 0); });
		}
		function drawNodeBtn() {
			provDD.txt.textContent = provText();
			regionDD.txt.textContent = region ? regionText(region) : '点这里选择地区';
			var inRegion = selected && selected.info.region === region;
			nodeDD.txt.textContent = inRegion ? (selected.info.flag ? selected.info.flag + ' ' : '') + selected.info.title : (region ? '请选择 ' + region + ' 的节点' : '先选地区');
			var cur = currentNode(nodes, cfg.node_name), changed = selected && (!cur || cur.idx !== selected.idx);
			useBox.className = 'xr-use' + (changed ? ' show' : '');
			useName.textContent = changed ? '切换到 ' + selected.info.title : '';
			useBtn.textContent = autoSw ? '使用并固定' : '使用此节点';
		}
		function drawProvs() {
			while (provList.firstChild) provList.removeChild(provList.firstChild);
			[ null ].concat(provOrder).forEach(function(k) {
				var cb = E('input', { 'type': 'checkbox', 'change': function() {
					prov = k; q = ''; computeRegions(); drawNodeBtn(); drawProvs(); drawRegions(); drawNodes(); provDD.close();
					regionDD.root.classList.add('open');   /* then the region */
				} });
				cb.checked = k === prov;
				provList.appendChild(E('label', { 'class': 'xr-opt two' + (k === prov ? ' cur' : '') }, [
					cb, E('span', { 'class': 'n' }, k === null ? '全部来源' : (k || '未标注')),
					E('span', { 'class': 's' }, (k === null ? nodes.length : provCount[k]) + ' 个')
				]));
			});
		}
		function drawRegions() {
			while (regionList.firstChild) regionList.removeChild(regionList.firstChild);
			regionOrder.forEach(function(k) {
				var cb = E('input', { 'type': 'checkbox', 'change': function() {
					region = k; q = ''; drawNodeBtn(); drawRegions(); drawNodes(); regionDD.close();
					nodeDD.root.classList.add('open');   /* go straight on to the node list */
				} });
				cb.checked = k === region;
				regionList.appendChild(E('label', { 'class': 'xr-opt two' + (k === region ? ' cur' : '') }, [
					cb, E('span', { 'class': 'f' }, regionFlag[k] || '🌐'), E('span', { 'class': 'n' }, k),
					E('span', { 'class': 's' }, regionCount[k] + ' 个')
				]));
			});
			if (!regionOrder.length) regionList.appendChild(E('div', { 'class': 'xr-empty' }, '没有节点。请先在“订阅设置”里填写地址并更新。'));
		}
		function drawNodes() {
			var cur = currentNode(nodes, cfg.node_name), list = visible();
			while (nodeList.firstChild) nodeList.removeChild(nodeList.firstChild);
			nodeCount.textContent = list.length + ' 个';
			list.forEach(function(n) {
				var on = !!(selected && selected.idx === n.idx);
				var cb = E('input', { 'type': 'checkbox', 'change': function() { selected = n; drawNodeBtn(); drawNodes(); nodeDD.close(); } });
				cb.checked = on;
				nodeList.appendChild(E('label', { 'class': 'xr-opt two' + (on ? ' cur' : ''), 'title': n.name }, [
					cb,
					E('span', { 'class': 'n' }, [ n.info.title, E('small', {}, badgeText(n.kind) + (n.info.provider ? ' · ' + n.info.provider : '')) ]),
					cur && cur.idx === n.idx ? E('span', { 'class': 't on' }, '当前') : ''
				]));
			});
			if (!list.length) nodeList.appendChild(E('div', { 'class': 'xr-empty' }, '没有符合条件的节点。'));
		}
		(function buildNodePanels() {
			provDD.panel.appendChild(provList);
			regionDD.panel.appendChild(regionList);
			var search = E('input', { 'class': 'xr-field', 'type': 'text', 'placeholder': '在这个地区里搜索', 'autocomplete': 'off',
				'input': function() { q = search.value.trim().toLowerCase(); drawNodes(); } });
			nodeDD.panel.appendChild(E('div', { 'class': 'xr-ddh' }, [ search, nodeCount ]));
			nodeDD.panel.appendChild(nodeList);
		})();

		/* ---- manual / automatic: a node chosen by hand is pinned and always wins; automatic only moves on when the line is dead ---- */
		var mManual = E('button', { 'type': 'button', 'click': function() { setNodeMode(false); } }, '手动指定');
		var mAuto = E('button', { 'type': 'button', 'click': function() { setNodeMode(true); } }, '自动选择');
		var modeTip = E('p', { 'class': 'xr-tip', 'style': 'margin:-2px 0 8px' }, '');
		var healthBox = E('div', { 'class': 'xr-status' }, '');
		function drawNodeMode() {
			mManual.className = autoSw ? '' : 'on'; mAuto.className = autoSw ? 'on' : '';
			modeTip.textContent = autoSw
				? (cfg.chain ? '自动选择：已设置链式出口，为避免来回换节点，这时不会自动切换。' : '自动选择：线路连续 3 次检测失败（约 9 分钟）时，切到同一来源的下一个节点。你在下面手动选一个节点并使用，就会改回“手动指定”并固定它。')
				: '手动指定：固定使用你选的节点，不会自动更换，即使它不通。';
			drawNodeBtn(); drawHints();
		}
		function setNodeMode(a) {
			if (a === autoSw) return;
			autoSw = a; drawNodeMode();
			sub([ 'set', 'auto_switch', a ? '1' : '0' ]).then(function(out) {
				if (out.trim() !== 'ok') { note('保存失败：' + out.trim(), 'danger'); return; }
				cfg.auto_switch = a ? '1' : '0';
				note(a ? '已改为自动选择。' : '已改为手动指定，不会再自动换节点。', 'info');
			}).catch(function(e) { note('保存失败：' + e, 'danger'); });
		}
		function drawHealth() {
			while (healthBox.firstChild) healthBox.removeChild(healthBox.firstChild);
			var t = fmtTime(health.last_ts), line;
			if (health.last === 'ok') line = [ E('b', {}, '线路检测：正常'), t ? '（' + t + '）' : '' ];
			else if (health.last === 'fail') line = [ E('b', {}, '线路检测：失败 ' + (health.fails || 0) + ' 次'), autoSw && !cfg.chain ? '（连续 3 次会自动切换）' : '' ];
			else if (health.last === 'wan-down') line = [ E('b', {}, '线路检测：'), '外网本身不通，没有计入失败。' ];
			else line = [ E('b', {}, '线路检测：'), '每 3 分钟一次，还没有结果。' ];
			healthBox.appendChild(E('div', {}, line));
			if (health.sw_ts && health.sw_to) healthBox.appendChild(E('div', {}, '上次自动切换：' + fmtTime(health.sw_ts) + ' 切到 ' + parseName(health.sw_to).title));
		}
		var probeBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'style': 'margin-top:8px', 'click': function() {
			probeBtn.disabled = true; probeBtn.textContent = '检测中…（最多十几秒）';
			sub([ 'probe' ]).then(function(out) {
				probeBtn.disabled = false; probeBtn.textContent = '立即检测';
				if (/proxy ok/.test(out)) note('线路正常：已通过代理拿到外网的网页响应。', 'info');
				else if (/FAILED/.test(out)) note('线路不通：外网本身是通的，但经过代理没有拿到响应。可以换个节点，或者用自动选择。', 'danger');
				else note('外网本身不通（光猫 / 宽带问题），不是代理的问题。', 'danger');
			}).catch(function(e) { probeBtn.disabled = false; probeBtn.textContent = '立即检测'; note('检测失败：' + e, 'danger'); });
		}, }, '立即检测');

		/* ------------ subscription ------------ */
		var subUrl = E('input', { 'class': 'xr-field', 'type': 'password', 'value': cfg.sub_url || '',
			'placeholder': 'https://…（v2rayN 通用订阅，需包含 vless:// 节点）', 'autocomplete': 'off' });
		var showBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			var h = subUrl.type === 'password'; subUrl.type = h ? 'text' : 'password'; showBtn.textContent = h ? '隐藏' : '显示'; } }, '显示');
		var subBtn = E('button', { 'type': 'button', 'class': 'xr-btn pri', 'click': function() {
			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在更新订阅…'));
			sub([ 'set', 'sub_url', subUrl.value.trim() ]).then(function() { return sub([ 'update' ]); })
				.then(function(out) {
					ui.hideModal();
					note('订阅更新：' + (out.trim() || '无输出'), /nodes/.test(out) ? 'info' : 'danger');
					if (/nodes/.test(out)) window.setTimeout(function() { location.reload(); }, 1200);
				}).catch(function(e) { ui.hideModal(); note('更新失败：' + e, 'danger'); });
		} }, '保存并更新订阅');

		var subHours = E('select', { 'class': 'xr-field', 'change': function() {
			sub([ 'set', 'sub_hours', subHours.value ]).then(function(out) {
				if (out.trim() !== 'ok') { note('保存失败：' + out.trim(), 'danger'); return; }
				cfg.sub_hours = subHours.value; drawHints(); note('已保存：' + (subHours.value === '0' ? '不再自动更新订阅。' : '订阅每 ' + subHours.value + ' 小时检查一次，内容没变就不重启代理。'), 'info');
			}).catch(function(e) { note('保存失败：' + e, 'danger'); });
		} }, [ [ '0', '不自动更新' ], [ '6', '每 6 小时' ], [ '12', '每 12 小时' ], [ '24', '每天（默认）' ], [ '48', '每 2 天' ], [ '168', '每周' ] ].map(function(o) { return E('option', { 'value': o[0] }, o[1]); }));
		subHours.value = cfg.sub_hours || '24';
		var subInfo = E('p', { 'class': 'xr-tip' }, '');
		function drawSubInfo() {
			subInfo.textContent = '上次检查：' + (fmtTime(cfg.sub_check) || '开机后还没检查') + '；订阅内容上次变化：' + (fmtTime(cfg.sub_change) || '未知') + '。只有节点本身变了才会重启代理（节点名里的延迟数字变化不算）。';
		}

		/* ------------ split routing exceptions ------------ */
		var IP4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
		function excItems() {
			var out = [];
			function add(kind, key, ip) { (cfg[key] || '').split(' ').filter(Boolean).forEach(function(v) { out.push({ kind: kind, v: v, ip: ip }); }); }
			add('direct', 'direct_domains', false); add('direct', 'direct_ips', true);
			add('proxy', 'proxy_domains', false); add('proxy', 'proxy_ips', true);
			return out;
		}
		var excDD = dropdown(), excList = E('div', { 'class': 'xr-ddl' });
		excDD.panel.appendChild(excList);
		function drawExc() {
			var items = excItems();
			excDD.txt.textContent = items.length ? '已生效 ' + items.length + ' 条（点开查看或删除）' : '还没有例外规则';
			while (excList.firstChild) excList.removeChild(excList.firstChild);
			items.forEach(function(it) {
				excList.appendChild(E('div', { 'class': 'xr-opt' }, [
					E('span', { 'class': 't' + (it.kind === 'proxy' ? ' on' : '') }, it.kind === 'proxy' ? '走代理' : '直连'),
					E('span', { 'class': 'n' }, it.v),
					E('button', { 'type': 'button', 'class': 'xr-mini', 'title': '删除这条规则', 'click': function(ev) { ev.preventDefault(); ev.stopPropagation(); removeExc(it); } }, '×')
				]));
			});
			if (!items.length) excList.appendChild(E('div', { 'class': 'xr-empty' }, '还没有规则。在上面输入域名或 IP 后点按钮添加。'));
			drawHints();
		}
		function commitExc(msg) {
			var parts = [ [ 'direct_ips', cfg.direct_ips || '' ], [ 'direct_domains', cfg.direct_domains || '' ], [ 'proxy_ips', cfg.proxy_ips || '' ], [ 'proxy_domains', cfg.proxy_domains || '' ] ];
			var chain = Promise.resolve();
			parts.forEach(function(p) { chain = chain.then(function() { return sub([ 'set', p[0], p[1] ]); }).then(function(out) { if ((out || '').trim() !== 'ok') throw new Error((out || '').trim()); }); });
			return chain.then(function() { return st.run ? sub([ 'exc-apply' ]) : ''; }).then(function() { drawExc(); note(msg, 'info'); }, function(e) { note('保存失败：' + (e.message || e), 'danger'); });
		}
		function excLists() {
			return { direct_domains: (cfg.direct_domains || '').split(' ').filter(Boolean), direct_ips: (cfg.direct_ips || '').split(' ').filter(Boolean), proxy_domains: (cfg.proxy_domains || '').split(' ').filter(Boolean), proxy_ips: (cfg.proxy_ips || '').split(' ').filter(Boolean) };
		}
		function removeExc(it) {
			var L = excLists(), key = (it.kind === 'direct' ? 'direct_' : 'proxy_') + (it.ip ? 'ips' : 'domains');
			L[key] = L[key].filter(function(v) { return v !== it.v; });
			Object.keys(L).forEach(function(k) { cfg[k] = L[k].join(' '); });
			commitExc('已删除 ' + it.v + (st.run ? '，之后新建的连接生效。' : '，代理开启后生效。'));
		}
		var excIn = E('input', { 'class': 'xr-field', 'type': 'text', 'placeholder': '域名或 IP，如 example.com', 'autocomplete': 'off', 'spellcheck': 'false' });
		function addExc(kind) {
			var raw = excIn.value.split(/[\s,;，；]+/).filter(Boolean);
			if (!raw.length) { note('请先输入域名或 IP。', 'danger'); return; }
			var L = excLists();
			raw.forEach(function(t) {
				var ip = IP4.test(t);
				var mine = kind === 'direct' ? (ip ? L.direct_ips : L.direct_domains) : (ip ? L.proxy_ips : L.proxy_domains);
				var other = kind === 'direct' ? (ip ? L.proxy_ips : L.proxy_domains) : (ip ? L.direct_ips : L.direct_domains);
				var i = other.indexOf(t); if (i >= 0) other.splice(i, 1);
				if (mine.indexOf(t) < 0) mine.push(t);
			});
			Object.keys(L).forEach(function(k) { cfg[k] = L[k].join(' '); });
			excIn.value = '';
			commitExc('已加入' + (kind === 'direct' ? '强制直连' : '强制走代理') + (st.run ? '，之后新建的连接生效。' : '，代理开启后生效。'));
		}
		var addDirectBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { addExc('direct'); } }, '强制直连');
		var addProxyBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { addExc('proxy'); } }, '强制走代理');

		/* ------------ backup: export / import the settings of this page ------------ */
		var BAK_KEYS = [ 'enabled', 'node_name', 'auto_switch', 'block_quic', 'clients', 'sub_url', 'sub_hours', 'chain', 'direct_ips', 'proxy_ips', 'direct_domains', 'proxy_domains' ];
		var expBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			sub([ 'get' ]).then(function(t) {
				var c = kv(t), o = {}, now = new Date();
				BAK_KEYS.forEach(function(k) { o[k] = c[k] || ''; });
				o.auto_switch = c.auto_switch === '1' ? '1' : '0';   /* never set = manual */
				var blob = new Blob([ JSON.stringify({ type: 'xray-sub-settings', version: 1, exported: now.toISOString(), config: o }, null, 2) ], { type: 'application/json' });
				var a = E('a', { 'href': URL.createObjectURL(blob), 'download': 'xray-settings-' + now.getFullYear() + p2(now.getMonth() + 1) + p2(now.getDate()) + '.json' });
				document.body.appendChild(a); a.click(); document.body.removeChild(a);
			}).catch(function(e) { note('导出失败：' + e, 'danger'); });
		} }, '导出设置');
		var impIn = E('input', { 'type': 'file', 'accept': '.json,application/json', 'style': 'display:none' });
		impIn.addEventListener('change', function() {
			var f = impIn.files && impIn.files[0]; if (!f) return;
			var rd = new FileReader();
			rd.onload = function() {
				impIn.value = '';
				var o; try { o = JSON.parse(rd.result); } catch (e) { o = null; }
				if (!o || o.type !== 'xray-sub-settings' || !o.config || typeof o.config !== 'object') { note('这不是本页导出的设置文件。', 'danger'); return; }
				var pairs = [];
				[ 'sub_hours', 'auto_switch', 'block_quic', 'direct_ips', 'proxy_ips', 'direct_domains', 'proxy_domains', 'chain', 'sub_url', 'clients', 'node_name', 'enabled' ].forEach(function(k) {
					var v = o.config[k]; if (typeof v !== 'string') return;
					if ((k === 'sub_hours' || k === 'auto_switch') && v === '') return;
					pairs.push([ k, v ]);
				});
				if (!pairs.length) { note('文件里没有可导入的设置。', 'danger'); return; }
				if (!window.confirm('将用文件里的设置覆盖当前的：' + pairs.map(function(p) { return p[0]; }).join('、') + '。\n应用后会重启代理。继续吗？')) return;
				ui.showModal(null, E('p', { 'class': 'spinning' }, '正在导入设置…'));
				var chain = Promise.resolve();
				pairs.forEach(function(p) {
					chain = chain.then(function() { return sub([ 'set', p[0], p[1] ]); }).then(function(out) {
						if (out.trim() !== 'ok') throw new Error(p[0] + '：' + out.trim());
						if (p[0] === 'sub_url' && p[1]) return sub([ 'update' ]);
					});
				});
				chain.then(function() { return sub([ 'apply' ]); })
					.then(function() { return new Promise(function(r) { window.setTimeout(r, 8000); }); })
					.then(function() { location.reload(); })
					.catch(function(e) { ui.hideModal(); note('导入失败：' + (e.message || e), 'danger'); });
			};
			rd.readAsText(f);
		});
		var impBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { impIn.click(); } }, '导入设置');

		/* ------------ chain proxy: the selected node is the FRONT hop, this proxy is the EXIT ------------ */
		var chainIn = E('input', { 'class': 'xr-field', 'type': 'password', 'value': cfg.chain || '',
			'placeholder': 'socks5://用户名:密码@地址:端口，也可以是 http:// vless:// ss://', 'autocomplete': 'off', 'autocapitalize': 'off' });
		var chainShow = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			var h = chainIn.type === 'password'; chainIn.type = h ? 'text' : 'password'; chainShow.textContent = h ? '隐藏' : '显示'; } }, '显示');
		var chainOut = E('div', { 'class': 'xr-ptxt', 'style': 'margin-top:10px' }, '');

		/* two ways to enter it: separate fields (protocol / address / port / user / password), or one complete link */
		var cProto = E('select', { 'class': 'xr-field' }, [ E('option', { 'value': 'socks5' }, 'SOCKS5'), E('option', { 'value': 'http' }, 'HTTP') ]);
		var cHost = E('input', { 'class': 'xr-field', 'type': 'text', 'placeholder': '例如 1.2.3.4 或 proxy.example.com', 'autocomplete': 'off', 'autocapitalize': 'off', 'spellcheck': 'false' });
		var cPort = E('input', { 'class': 'xr-field', 'type': 'text', 'inputmode': 'numeric', 'placeholder': '例如 1080', 'autocomplete': 'off' });
		var cUser = E('input', { 'class': 'xr-field', 'type': 'text', 'placeholder': '没有就留空', 'autocomplete': 'off', 'autocapitalize': 'off' });
		var cPass = E('input', { 'class': 'xr-field', 'type': 'password', 'placeholder': '没有就留空', 'autocomplete': 'new-password' });
		var cPassShow = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			var h = cPass.type === 'password'; cPass.type = h ? 'text' : 'password'; cPassShow.textContent = h ? '隐藏' : '显示'; } }, '显示');
		function fld(label, el, full) { return E('div', { 'class': 'xr-f' + (full ? ' full' : '') }, [ E('span', { 'class': 'xr-fl' }, label), el ]); }
		var chainForm = E('div', { 'class': 'xr-form' }, [
			fld('协议', cProto), fld('端口', cPort), fld('地址', cHost, true), fld('用户名', cUser, true),
			fld('密码', E('div', { 'class': 'xr-row xr-inline' }, [ cPass, cPassShow ]), true)
		]);
		var chainLink = E('div', {}, [ E('div', { 'class': 'xr-row xr-inline' }, [ chainIn, chainShow ]),
			E('p', { 'class': 'xr-tip' }, '支持 socks5://、http://、vless://、ss:// 开头的完整链接。vless / ss 只能用完整链接。') ]);
		var chainMode = 'fields';
		var mFields = E('button', { 'type': 'button', 'click': function() {
			if (chainMode === 'link') {
				var l = chainIn.value.trim();
				if (l && !fillFields(l)) { note('这个链接不是 socks5 / http 格式，没法拆成分项，请继续用完整链接。', 'info'); return; }
				chainMode = 'fields'; drawChainMode();
			}
		} }, '分项填写');
		var mLink = E('button', { 'type': 'button', 'click': function() {
			if (chainMode === 'fields') {
				var r = chainFromFields();
				if (r.value !== undefined) chainIn.value = r.value;
				chainMode = 'link'; drawChainMode();
			}
		} }, '完整链接');
		function drawChainMode() {
			mFields.className = chainMode === 'fields' ? 'on' : ''; mLink.className = chainMode === 'link' ? 'on' : '';
			chainForm.style.display = chainMode === 'fields' ? '' : 'none'; chainLink.style.display = chainMode === 'link' ? '' : 'none';
		}
		/* fields -> link; an error text when something is missing or wrong */
		function chainFromFields() {
			var host = cHost.value.trim(), port = cPort.value.trim(), user = cUser.value, pass = cPass.value;
			if (!host && !port && !user && !pass) return { value: '' };
			if (!host) return { err: '请填写地址。' };
			if (/[\s\/@?#]/.test(host)) return { err: '地址里不能有空格，也不能有 / @ ? # 这些符号。' };
			if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) return { err: '端口要填 1–65535 之间的数字。' };
			if (pass && !user) return { err: '填了密码就需要填用户名。' };
			var h = host.indexOf(':') >= 0 && host.charAt(0) !== '[' ? '[' + host + ']' : host;
			var auth = user ? encodeURIComponent(user) + (pass ? ':' + encodeURIComponent(pass) : '') + '@' : '';
			return { value: cProto.value + '://' + auth + h + ':' + (+port) };
		}
		/* link -> fields; false when it is not a plain socks5 / http link */
		function fillFields(link) {
			var m = link.match(/^(socks5|socks|http):\/\/(?:([^:@\/]*)(?::([^@\/]*))?@)?(\[[^\]]+\]|[^:\/?#]+):(\d+)\/?$/i);
			if (!m) return false;
			var dec = function(x) { try { return decodeURIComponent(x || ''); } catch (e) { return x || ''; } };
			cProto.value = /^http$/i.test(m[1]) ? 'http' : 'socks5';
			cUser.value = dec(m[2]); cPass.value = dec(m[3]);
			cHost.value = m[4].replace(/^\[|\]$/g, ''); cPort.value = m[5];
			return true;
		}
		/* what to test / save: null = invalid (the reason has been shown) */
		function chainValue() {
			if (chainMode === 'link') return chainIn.value.trim();
			var r = chainFromFields();
			if (r.err) { note(r.err, 'danger'); return null; }
			return r.value;
		}
		if (cfg.chain && !fillFields(cfg.chain)) chainMode = 'link';

		function renderChain(txt, running) {
			var lines = txt.split('\n'), trace = '', info = null, done = false, err = '';
			lines.slice(1).forEach(function(l) {
				if (l.indexOf('trace=') === 0) trace = l.substr(6).trim();
				else if (l.indexOf('info=') === 0) { try { info = JSON.parse(l.substr(5)); } catch (e) { info = null; } }
				else if (l.indexOf('error=') === 0) err = l.substr(6).trim();
				else if (l.indexOf('done=') === 0) done = true;
			});
			if (running && !done) { chainOut.textContent = '正在测试…（先连前置节点，再连这个代理，约 10–30 秒）'; return; }
			if (err) { chainOut.textContent = '⚠ ' + err + '。这不代表链式代理有问题。'; return; }
			if (!done && !trace && !info) { chainOut.textContent = ''; return; }
			if (info && info.status === 'success') {
				var kind = info.hosting ? '机房 / 数据中心 IP' : (info.mobile ? '移动网络 IP' : '住宅 / 家宽 IP');
				chainOut.textContent = '✔ 链式代理可用。出口：' + [ info.country, info.regionName, info.city ].filter(Boolean).join(' · ') +
					'；运营商：' + info.isp + (info.org ? '（' + info.org + '）' : '') + '；类型：' + kind +
					(info.proxy ? '（该 IP 被数据库标记为代理）' : '') + (info.query ? '；出口 IP：' + info.query : '') + '。';
			} else if (trace) {
				chainOut.textContent = '✔ 链式代理可用，出口：' + trace + '（没能查到运营商信息）。';
			} else {
				chainOut.textContent = '✘ 测试失败：通过前置节点连不上这个链式代理。请检查地址、端口、账号密码，以及它是否允许前置节点所在的 IP 访问。';
			}
		}
		function pollChainTest() {
			return sub([ 'chain-test-state' ]).then(function(txt) {
				var running = txt.split('\n')[0] === 'running';
				renderChain(txt, running);
				if (running) window.setTimeout(pollChainTest, 2000); else chainTestBtn.disabled = false;
			});
		}
		var chainTestBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			var v = chainValue();
			if (v === null) return;
			if (!v) { note('请先填写链式代理地址。', 'danger'); return; }
			chainTestBtn.disabled = true; chainOut.textContent = '正在启动测试…';
			sub([ 'chain-test-start', v ]).then(function(out) {
				if (out.indexOf('started') < 0) { chainTestBtn.disabled = false; chainOut.textContent = ''; note(out.trim(), 'danger'); return; }
				window.setTimeout(pollChainTest, 3000);
			}).catch(function(e) { chainTestBtn.disabled = false; note('测试失败：' + e, 'danger'); });
		} }, '测试出口');
		function saveChain(v) {
			ui.showModal(null, E('p', { 'class': 'spinning' }, v ? '正在保存并应用链式代理，代理会重启几秒…' : '正在清除链式代理…'));
			sub([ 'set', 'chain', v ]).then(function(out) {
				if (out.trim() !== 'ok') { ui.hideModal(); note('保存失败：' + out.trim(), 'danger'); return null; }
				return sub([ 'apply' ]).then(function() { return new Promise(function(r) { window.setTimeout(r, 8000); }); })
					.then(function() { location.reload(); });
			}).catch(function(e) { ui.hideModal(); note('保存失败：' + e, 'danger'); });
		}
		var chainSaveBtn = E('button', { 'type': 'button', 'class': 'xr-btn pri', 'click': function() { var v = chainValue(); if (v !== null) saveChain(v); } }, '保存并应用');
		var chainClearBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			chainIn.value = ''; cHost.value = ''; cPort.value = ''; cUser.value = ''; cPass.value = '';
			if (!cfg.chain) { note('当前没有设置链式代理。', 'info'); return; }
			saveChain('');
		} }, '清除链式代理');
		function chainLabel(u) {
			var m = String(u).match(/^([a-z0-9]+):\/\/(?:[^@/?#]+@)?(\[[^\]]+\]|[^:/?#]+):(\d+)/i);
			return m ? m[1] + '://' + m[2] + ':' + m[3] : String(u).slice(0, 42);
		}
		function fillChain(u) {
			chainIn.value = u;
			if (fillFields(u)) chainMode = 'fields'; else chainMode = 'link';
			drawChainMode();
			note('已填入，确认无误后点“保存并应用”。', 'info');
		}
		var histBox = E('div', { 'class': 'xr-sel' });
		chainHist.forEach(function(u) {
			if (u === (cfg.chain || '')) return;
			var chip = E('span', { 'class': 'xr-sc' }, [
				E('span', { 'style': 'cursor:pointer', 'title': '填回这个地址', 'click': function() { fillChain(u); } }, chainLabel(u)),
				E('button', { 'type': 'button', 'title': '不再记住', 'click': function() {
					sub([ 'chain-forget', u ]).then(function() { if (chip.parentNode) chip.parentNode.removeChild(chip); });
				} }, '×')
			]);
			histBox.appendChild(chip);
		});

		/* ------------ summaries shown next to each section title ------------ */
		function drawHints() {
			hMode.textContent = (wantProxy ? '代理' : '直连') + ' · ' + (scope === 'all' ? '全部设备' : '指定 ' + selectedCount() + ' 台');
			var cur = currentNode(nodes, cfg.node_name);
			hNode.textContent = (autoSw ? '自动 · ' : '手动 · ') + (cur ? cur.info.title : '未选择');
			hChain.textContent = cfg.chain ? '已启用' : '未使用';
			hSub.textContent = nodes.length + ' 个节点 · ' + (cfg.sub_hours === '0' ? '不自动更新' : '每 ' + (cfg.sub_hours || '24') + ' 小时');
			var nTok = function(v) { return (v || '').split(' ').filter(Boolean).length; };
			var nd = nTok(cfg.direct_ips) + nTok(cfg.direct_domains), np = nTok(cfg.proxy_ips) + nTok(cfg.proxy_domains);
			hSplit.textContent = (nd ? '直连 ' + nd : '') + (nd && np ? ' · ' : '') + (np ? '代理 ' + np : '') || '无';
		}

		drawStatus(); drawMode(); drawScope(); drawNodeBtn(); drawProvs(); drawRegions(); drawNodes(); drawChainMode(); drawNodeMode(); drawHealth(); drawSubInfo(); drawExc(); drawHints();

		var pollN = 0, devSig = JSON.stringify(devs);
		poll.add(function() {
			pollN++;
			var wantDevs = (pollN % 2 === 0), wantGet = (pollN % 3 === 0);   /* devices every 10 s, settings every 15 s, the status every 5 s */
			return Promise.all([ sub([ 'status' ]), sub([ 'health' ]), wantDevs ? sub([ 'devices' ]) : Promise.resolve(null), wantGet ? sub([ 'get' ]) : Promise.resolve(null) ]).then(function(r) {
				st = parseStatus(r[0]); health = kv(r[1]);
				/* the node can change by itself (automatic switch): follow it */
				if (st.node && st.node !== cfg.node_name) {
					var before = currentNode(nodes, cfg.node_name), pinned = !selected || (before && selected.idx === before.idx);
					cfg.node_name = st.node;
					var now = currentNode(nodes, cfg.node_name);
					if (pinned && now) { selected = now; region = now.info.region; computeRegions(); drawRegions(); }
					drawNodeBtn(); drawNodes(); if (now) note('节点已切换为：' + now.info.title, 'info');
				}
				if (r[3] !== null) { var g = kv(r[3]); cfg.sub_check = g.sub_check; cfg.sub_change = g.sub_change; if (g.auto_switch !== undefined && (g.auto_switch === '1') !== autoSw) { autoSw = g.auto_switch === '1'; cfg.auto_switch = g.auto_switch; drawNodeMode(); } drawSubInfo(); }
				drawStatus(); drawHealth(); drawHints();
				if (r[2] !== null) {
					var nd = parseDevices(r[2]), sig = JSON.stringify(nd);
					if (sig !== devSig) { devSig = sig; devs = nd; drawScope(); }
				}
			});
		}, 5);

		return E('div', { 'class': 'xr' }, [
			E('style', {}, CSS),
			E('div', { 'class': 'xr-title' }, 'VLESS 透明代理'),
			E('p', { 'class': 'xr-sub' }, '国内 IP 直连，其余 TCP 流量走所选节点（支持 VLESS、Shadowsocks、Trojan，不支持 UDP）。'),

			E('div', { 'class': 'xr-card xr-hero' }, [ nowBox, chips, E('div', { 'class': 'xr-two' }, [ restartBtn, pullBtn ]) ]),

			section('代理模式与设备', hMode, E('div', {}, [
				E('div', { 'class': 'xr-seg' }, [ bProxy, bDirect ]),
				E('p', { 'class': 'xr-tip', 'style': 'margin:-2px 0 10px' }, '代理：国内直连，国外走代理；直连：关闭代理，全部直连。'),
				E('div', { 'class': 'xr-lab' }, '哪些设备走代理'),
				E('div', { 'class': 'xr-seg' }, [ sAll, sPick ]),
				devAllTip, devWrap,
				E('label', { 'class': 'xr-opt', 'style': 'margin-top:14px' }, [ quicCb, '拦截 QUIC（UDP 443），避免 App 判定在不支持的地区' ]),
				E('p', { 'class': 'xr-tip' }, '只对走代理的设备生效。拦截后这些设备的 QUIC 连接会失败并自动改走 TCP，从而经过代理。'),
				E('div', { 'class': 'xr-row', 'style': 'margin-top:12px' }, saveMode)
			])),

			section('节点选择', hNode, E('div', {}, [
				E('div', { 'class': 'xr-seg' }, [ mManual, mAuto ]), modeTip,
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 8px' }, statsLine(d[4] || '')),
				provOrder.length > 1 ? E('div', {}, [ E('div', { 'class': 'xr-lab', 'style': 'margin-top:0' }, '来源'), provDD.root ]) : '',
				E('div', { 'class': 'xr-lab', 'style': provOrder.length > 1 ? '' : 'margin-top:0' }, '地区'), regionDD.root,
				E('div', { 'class': 'xr-lab' }, '节点'), nodeDD.root, useBox,
				healthBox, probeBtn
			])),

			section('分流例外', hSplit, E('div', {}, [
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 8px' }, '默认是“国内 IP 直连，其余走代理”。在下面输入一个域名（如 example.com，子域名一并生效）或 IPv4 地址 / 网段，点按钮加入。已经生效的在下拉列表里，点 × 删除：强制走代理的优先于强制直连的，两者都优先于国内 IP 表。只对走代理的设备生效，不影响已经建立的连接。域名由路由器解析成地址再写进规则，每 5 分钟更新一次，也会参考设备解析过的结果（需要开启“上网记录”的访问记录）；用自带 DNS 的 App 可能解析到别的地址，那部分不受影响。更方便的做法：在“上网记录”里点开设备，在某条网站记录下面直接点“强制走代理 / 强制直连”。'),
				E('div', { 'class': 'xr-row xr-inline' }, [ excIn, addDirectBtn, addProxyBtn ]),
					E('div', { 'class': 'xr-lab' }, '已生效的规则'), excDD.root
			])),

			section('链式代理（家宽出口）', hChain, E('div', {}, [
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 10px' }, '留空：流量直接从所选节点出去。填写后：所选节点作为前置，流量再经过这个代理出去，网站看到的是它的 IP（比如家宽出口）。'),
				E('div', { 'class': 'xr-seg' }, [ mFields, mLink ]),
				chainForm, chainLink,
				histBox.firstChild ? E('div', { 'class': 'xr-lab' }, '以前填过的（点一下填回，不会自动生效）') : '',
				histBox,
				E('div', { 'class': 'xr-row', 'style': 'margin-top:12px' }, [ chainTestBtn, chainSaveBtn, chainClearBtn ]),
				chainOut,
				E('p', { 'class': 'xr-tip' }, '注意：①前置节点要能访问这个代理的地址，有些家宽代理只允许白名单 IP；②多一跳会更慢；③链式代理失效时，国外流量会直接不通，不会自动回退到所选节点；④账号密码保存在路由器里，页面上默认隐藏；⑤只支持 TCP。')
			])),

			section('订阅设置', hSub, E('div', {}, [
				E('div', { 'class': 'xr-row xr-inline' }, [ subUrl, showBtn ]),
				E('p', { 'class': 'xr-tip' }, '“剩余流量 / 到期”等信息条目已自动忽略。订阅地址包含你的账号凭据，默认隐藏。'),
				E('div', { 'class': 'xr-lab' }, '自动检查更新'), subHours, subInfo,
				E('div', { 'class': 'xr-row', 'style': 'margin-top:10px' }, subBtn)
			])),

			section('备份与恢复', hBak, E('div', {}, [
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 10px' }, '把本页的设置（节点、设备范围、订阅地址、链式出口、分流例外等）存成一个文件，重刷固件或换路由器后导入即可恢复。注意：文件里包含订阅地址和链式代理的账号密码，请妥善保管，不要发给别人。'),
				E('div', { 'class': 'xr-row' }, [ expBtn, impBtn, impIn ])
			]))
		]);
	}
});
