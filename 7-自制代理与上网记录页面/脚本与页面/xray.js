'use strict';
'require view';
'require fs';
'require poll';
'require ui';

var BIN = '/usr/bin/xray-sub';

var CSS = [
	'.xr{width:100%;max-width:1100px;min-width:0;margin:0 auto;padding-top:22px;--xr-a:#4c6ef5;--xr-ok:#2bb673;--xr-warn:#f59f00;--xr-bad:#e8590c;--xr-line:rgba(127,127,127,.28);--xr-soft:rgba(127,127,127,.09)}',
	'.xr *{box-sizing:border-box}',
	'.xr-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 14px}',
	'.xr-title{font-size:22px;font-weight:700;margin:8px 0 2px}',
	'.xr-sub{opacity:.7;font-size:13px;margin:0 0 16px}',
	'.xr-card{min-width:0;border:1px solid var(--xr-line);border-radius:16px;padding:16px;margin:0 0 16px;background:var(--xr-soft)}',
	'.xr-h{margin:0 0 12px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}',
	'.xr-chips{display:flex;flex-wrap:wrap;gap:8px}',
	'.xr-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--xr-line);font-size:13px;white-space:nowrap;background:rgba(127,127,127,.06)}',
	'.xr-dot{width:9px;height:9px;border-radius:50%;background:#999;display:inline-block}',
	'.xr-chip.ok .xr-dot{background:var(--xr-ok);box-shadow:0 0 0 3px rgba(43,182,115,.22)}',
	'.xr-chip.bad .xr-dot{background:var(--xr-bad)}',
	'.xr-now{display:flex;align-items:center;gap:12px;margin:0 0 12px}',
	'.xr-now .big{font-size:22px;line-height:1.25;font-weight:700;word-break:break-all}',
	'.xr-now .lab{font-size:12px;opacity:.65}',
	'.xr-seg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 12px}',
	'.xr-seg button{height:auto;min-height:56px;border-radius:14px;border:2px solid var(--xr-line);background:transparent;color:inherit;font-size:16px;cursor:pointer;padding:8px 10px;line-height:1.3}',
	'.xr-seg button small{display:block;font-size:12px;opacity:.7;font-weight:400}',
	'.xr-seg button.on{background:var(--xr-a);border-color:var(--xr-a);color:#fff;font-weight:700}',
	'.xr-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
	'.xr-field{width:100%;min-height:44px;font-size:16px;padding:8px 12px;border-radius:12px;border:1px solid var(--xr-line);background:rgba(255,255,255,.04);color:inherit}',
	'.xr-btn{min-height:44px;padding:8px 18px;border-radius:12px;border:1px solid var(--xr-line);background:transparent;color:inherit;font-size:15px;cursor:pointer}',
	'.xr-btn.pri{background:var(--xr-a);border-color:var(--xr-a);color:#fff;font-weight:600}',
	'.xr-btn[disabled]{opacity:.45;cursor:not-allowed}',
	'.xr-inline{flex-wrap:nowrap}.xr-inline .xr-field{flex:1 1 auto;width:auto;min-width:0}.xr-inline .xr-btn{flex:0 0 auto;white-space:nowrap}',
	'.xr-tip{font-size:12.5px;opacity:.7;margin:8px 0 0}',
	'.xr-tags{max-width:100%;display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch}',
	'.xr-tag{flex:0 0 auto;min-height:36px;padding:4px 14px;border-radius:999px;border:1px solid var(--xr-line);background:transparent;color:inherit;font-size:14px;cursor:pointer}',
	'.xr-tag.on{background:var(--xr-a);border-color:var(--xr-a);color:#fff}',
	'.xr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}',
	'.xr-node{position:relative;border:2px solid var(--xr-line);border-radius:14px;padding:12px 12px 10px;cursor:pointer;background:rgba(127,127,127,.04);transition:border-color .15s,transform .1s}',
	'.xr-node:hover{border-color:var(--xr-a)}',
	'.xr-node.sel{border-color:var(--xr-a);background:rgba(76,110,245,.12)}',
	'.xr-node.cur::after{content:"当前";position:absolute;top:8px;right:8px;background:var(--xr-ok);color:#fff;font-size:11px;padding:1px 8px;border-radius:999px}',
	'.xr-node .t{display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;padding-right:44px}',
	'.xr-node .f{font-size:22px;line-height:1}',
	'.xr-node .p{font-size:12px;opacity:.65;margin:2px 0 8px}',
	'.xr-badge{display:inline-block;font-size:11px;padding:1px 8px;border-radius:6px;border:1px solid var(--xr-line);margin-right:6px}',
	'.xr-meter{height:7px;border-radius:99px;background:rgba(127,127,127,.2);overflow:hidden;margin:8px 0 4px}',
	'.xr-meter i{display:block;height:100%;border-radius:99px;background:var(--xr-ok)}',
	'.xr-meter i.mid{background:var(--xr-warn)}.xr-meter i.low{background:var(--xr-bad)}',
	'.xr-spd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;opacity:.9}',
	'.xr-mini{min-height:30px;padding:2px 14px;border-radius:9px;border:1px solid var(--xr-line);background:transparent;color:inherit;font-size:12.5px;cursor:pointer}',
	'.xr-mini[disabled]{opacity:.45;cursor:not-allowed}',
	'.xr-prog{display:none;margin-top:14px;padding:12px 14px;border:1px solid var(--xr-line);border-radius:12px;background:rgba(127,127,127,.06)}',
	'.xr-prog.show{display:block}',
	'.xr-pbar{height:10px;border-radius:99px;background:rgba(127,127,127,.22);overflow:hidden}',
	'.xr-pbar i{display:block;height:100%;border-radius:99px;background:var(--xr-a);transition:width .5s}',
	'.xr-prog.done .xr-pbar i{background:var(--xr-ok)}',
	'.xr-ptxt{font-size:13.5px;margin-top:8px;word-break:break-all}',
	'.xr-devl{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px}',
	'.xr-dev{display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 12px;border:1px solid var(--xr-line);border-radius:12px;cursor:pointer;background:rgba(127,127,127,.04)}',
	'.xr-dev.dis{opacity:.65;cursor:default}',
	'.xr-dev input{width:20px;height:20px;flex:0 0 auto}',
	'.xr-dev .xr-dot.ok{background:var(--xr-ok);box-shadow:0 0 0 3px rgba(43,182,115,.22)}',
	'.xr-dn{flex:1 1 auto;min-width:0;font-weight:600;font-size:14.5px;word-break:break-all}',
	'.xr-dn small{display:block;font-weight:400;font-size:12px;opacity:.65;margin-top:1px}',
	'.xr-st{flex:0 0 auto;font-size:12px;opacity:.7}',
	'.xr-pager{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0}',
	'.xr-pager:empty{display:none}',
	'.xr-pg{min-width:38px;min-height:36px;padding:2px 10px;border-radius:10px;border:1px solid var(--xr-line);background:transparent;color:inherit;font-size:14px;cursor:pointer}',
	'.xr-pg.on{background:var(--xr-a);border-color:var(--xr-a);color:#fff;font-weight:700}',
	'.xr-pg[disabled]{opacity:.35;cursor:not-allowed}',
	'.xr-pgdot{opacity:.5;padding:0 2px}',
	'.xr-psize{min-height:36px;margin-left:auto;padding:2px 8px;border-radius:10px;border:1px solid var(--xr-line);background:rgba(255,255,255,.04);color:inherit;font-size:14px}',
	'.xr-pinfo{font-size:12.5px;opacity:.65}',
	'.xr-bar{position:sticky;bottom:10px;z-index:20;display:none;gap:10px;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--xr-a);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.28)}',
	'.xr-bar.show{display:flex}',
	'.xr-bar b{word-break:break-all}',
	'.xr-bar button{min-height:42px;border-radius:10px;border:0;padding:6px 18px;font-weight:700;cursor:pointer;background:#fff;color:#3b5bdb;white-space:nowrap}',
	'details.xr-det summary{cursor:pointer;font-weight:600;font-size:16px;list-style:none;display:flex;align-items:center;gap:8px;min-height:32px}',
	'details.xr-det summary::-webkit-details-marker{display:none}',
	'details.xr-det[open] summary{margin-bottom:12px}',
	'@media (max-width:640px){',
	'.xr-grid{grid-template-columns:1fr}',
	'.xr-now .big{font-size:19px}',
	'.xr-card{padding:14px;border-radius:14px}',
	'.xr-btn{flex:1 1 auto}',
	'.xr-row:not(.xr-inline)>.xr-btn{width:100%}',
	'.xr-bar{flex-direction:column;align-items:stretch;text-align:center}',
	'}'
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
		n.ws = /^ws/.test(n.kind);
		return n;
	});
}

function parseBench(txt) {
	var lines = txt.split('\n'), res = { running: lines[0] === 'running', speed: {}, done: 0, total: 0, cur: '' };
	if ((lines[1] || '').indexOf('P ') === 0) {
		var pp = lines[1].substr(2).split(' ');
		res.done = parseInt(pp[0], 10) || 0; res.total = parseInt(pp[1], 10) || 0; res.cur = pp.slice(2).join(' ');
	}
	lines.slice(1).forEach(function(l) {
		var m = l.match(/^\s*([\d.]+) Mbps\s+[\d.]+s\s+[\d.]+\/3MB\s+#(\d+) /);
		if (m) res.speed[m[2]] = parseFloat(m[1]);
	});
	return res;
}

function parseStatus(txt) {
	var s = { run: /running/.test(txt), rules: /rules\s*:\s*on/.test(txt), mem: '', nodes: '' };
	var m = txt.match(/running,\s*(\d+) kB/); if (m) s.mem = (parseInt(m[1], 10) / 1024).toFixed(1) + ' MB';
	m = txt.match(/sub\s*:\s*(\d+)/); if (m) s.nodes = m[1];
	m = txt.match(/clients:\s*(.*)$/m); s.clients = m ? m[1].trim() : '';
	m = txt.match(/^chain\s*:\s*(.*)$/m); s.chain = m ? m[1].trim() : 'none';
	s.enabled = /enabled\s*:\s*1/.test(txt);
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

function clientsText(c) {
	var t = (c || 'all').split(' ').filter(Boolean);
	if (!t.length || t[0] === 'all') return '全部设备';
	if (t[0] === 'none') return '无（没有设备走代理）';
	return '指定 ' + t.length + ' 台';
}

/* "tcp/reality", "ws/tls", "tcp/tls", "ws/none" ... */
function badgeText(kind) {
	var p = (kind || '').split('/'), t = p[0] || 'tcp', s = p[1] || 'none';
	if (s === 'reality') return 'Reality';
	if (s === 'tls') return (t === 'ws' ? 'WS' : 'TCP') + ' + TLS';
	return (t === 'ws' ? 'WS' : 'TCP') + '（无加密）';
}

/* output of "xray-sub stats": total=262 vless=129 kept=125 info=4 other=ss:72,trojan:32 badtransport=grpc:1 */
function statsLine(txt) {
	var s = kv(txt), n = function(k) { return parseInt(s[k], 10) || 0; };
	if (!n('total')) return '';
	var list = function(v) { return (v || '').split(',').filter(Boolean).map(function(x) { var p = x.split(':'); return p[0] + ' ' + p[1]; }).join('、'); };
	var out = '订阅共 ' + n('total') + ' 条，其中 VLESS ' + n('vless') + ' 条，列出 ' + n('kept') + ' 个可用节点。';
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

return view.extend({
	handleSave: null,
	handleSaveApply: null,
	handleReset: null,

	load: function() {
		return Promise.all([ sub([ 'get' ]), sub([ 'list' ]), sub([ 'status' ]), sub([ 'bench-state' ]), sub([ 'devices' ]), sub([ 'stats' ]) ]);
	},

	render: function(d) {
		var cfg = kv(d[0]), nodes = parseNodes(d[1]), bench = parseBench(d[3]), st = parseStatus(d[2]);
		var selected = null, region = '', sortSpeed = false, wantProxy = cfg.enabled === '1';
		var devs = parseDevices(d[4] || '');
		var tokens = (cfg.clients || 'all').split(' ').filter(Boolean);
		var scope = (!tokens.length || tokens[0] === 'all') ? 'all' : 'pick';
		var sel = {};
		tokens.forEach(function(t) { if (t !== 'all' && t !== 'none') sel[t.toLowerCase()] = 1; });

		/* ------------ status ------------ */
		var chips = E('div', { 'class': 'xr-chips' });
		var nowBox = E('div', { 'class': 'xr-now' });
		function drawStatus() {
			var cur = currentNode(nodes, cfg.node_name);
			while (nowBox.firstChild) nowBox.removeChild(nowBox.firstChild);
			nowBox.appendChild(E('div', {}, [
				E('div', { 'class': 'lab' }, st.enabled ? '当前节点' : '当前节点（代理已关闭）'),
				E('div', { 'class': 'big' }, cur ? ((cur.info.flag ? cur.info.flag + ' ' : '') + cur.info.title) : '未匹配到节点')
			]));
			while (chips.firstChild) chips.removeChild(chips.firstChild);
			function chip(cls, text) { chips.appendChild(E('span', { 'class': 'xr-chip ' + cls }, [ E('span', { 'class': 'xr-dot' }), text ])); }
			chip(st.run ? 'ok' : 'bad', st.run ? '代理进程运行中' : '代理进程未运行');
			chip(st.rules ? 'ok' : '', st.rules ? '转发规则已生效' : '转发规则未启用');
			if (st.mem) chip('', '内存 ' + st.mem);
			chip('', '节点 ' + (st.nodes || nodes.length));
			chip('', '代理对象：' + clientsText(cfg.clients));
			chip(st.chain && st.chain !== 'none' ? 'ok' : '', st.chain && st.chain !== 'none' ? '链式出口：' + st.chain : '链式代理：未使用');
		}

		/* ------------ mode ------------ */
		var bProxy = E('button', { 'type': 'button', 'click': function() { wantProxy = true; drawMode(); } }, [ '代理', E('small', {}, '国内直连，国外走代理') ]);
		var bDirect = E('button', { 'type': 'button', 'click': function() { wantProxy = false; drawMode(); } }, [ '直连', E('small', {}, '关闭代理，全部直连') ]);
		function drawMode() { bProxy.className = wantProxy ? 'on' : ''; bDirect.className = wantProxy ? '' : 'on'; }
		drawMode();
		/* ------------ devices: who goes through the proxy ------------ */
		var devBox = E('div', { 'class': 'xr-devl' });
		var devCount = E('span', { 'class': 'xr-tip', 'style': 'margin:0' }, '');
		var sAll = E('button', { 'type': 'button', 'click': function() { scope = 'all'; drawScope(); } }, [ '全部设备', E('small', {}, '局域网里所有设备') ]);
		var sPick = E('button', { 'type': 'button', 'click': function() { scope = 'pick'; drawScope(); } }, [ '指定设备', E('small', {}, '只有勾选的设备走代理') ]);
		function isSel(d) { return !!(sel[d.mac] || sel[d.ip]); }
		function selectedCount() {
			var n = 0, known = {};
			devs.forEach(function(d) { known[d.mac] = 1; known[d.ip] = 1; if (isSel(d)) n++; });
			Object.keys(sel).forEach(function(k) { if (!known[k]) n++; });
			return n;
		}
		function drawCount() {
			devCount.textContent = scope === 'all' ? '全部 ' + devs.length + ' 台设备都会走代理' : '已选 ' + selectedCount() + ' / ' + devs.length + ' 台';
		}
		function drawDevs() {
			while (devBox.firstChild) devBox.removeChild(devBox.firstChild);
			function row(title, subtitle, online, checked, toggle) {
				var cb = E('input', { 'type': 'checkbox', 'change': function() { toggle(cb.checked); drawCount(); } });
				cb.checked = checked || scope === 'all';
				cb.disabled = scope === 'all';
				devBox.appendChild(E('label', { 'class': 'xr-dev' + (scope === 'all' ? ' dis' : '') }, [
					cb, E('span', { 'class': 'xr-dot' + (online ? ' ok' : '') }),
					E('span', { 'class': 'xr-dn' }, [ title, E('small', {}, subtitle) ]),
					E('span', { 'class': 'xr-st' }, online ? '在线' : '空闲')
				]));
			}
			var known = {};
			devs.forEach(function(dv) {
				known[dv.mac] = 1; known[dv.ip] = 1;
				row(dv.name || '未命名设备', dv.ip + ' · ' + dv.mac, dv.online, isSel(dv), function(on) {
					if (on) sel[dv.mac] = 1; else { delete sel[dv.mac]; delete sel[dv.ip]; }
				});
			});
			Object.keys(sel).forEach(function(k) {
				if (known[k]) return;
				row('已保存的设备（当前未连接）', k, false, true, function(on) { if (!on) delete sel[k]; });
			});
			if (!devBox.firstChild) devBox.appendChild(E('p', { 'class': 'xr-tip' }, '暂时没有发现设备。'));
		}
		function drawScope() { sAll.className = scope === 'all' ? 'on' : ''; sPick.className = scope === 'pick' ? 'on' : ''; drawDevs(); drawCount(); }
		var pickAll = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { scope = 'pick'; devs.forEach(function(dv) { sel[dv.mac] = 1; }); drawScope(); } }, '全选');
		var pickNone = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() { sel = {}; scope = 'pick'; drawScope(); } }, '全不选');
		drawScope();

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

		var saveMode = E('button', { 'type': 'button', 'class': 'xr-btn pri', 'click': function() {
			var cv = clientsValue();
			if (!cv) { note('请至少勾选一台设备；或选择“全部设备”，或把模式切到“直连”。', 'danger'); return; }
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
		} }, '立即拉取订阅');

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

		/* ------------ chain proxy: the selected node is the FRONT hop, this proxy is the EXIT ------------ */
		var chainIn = E('input', { 'class': 'xr-field', 'type': 'password', 'value': cfg.chain || '',
			'placeholder': 'socks5://用户名:密码@地址:端口（留空 = 不使用链式代理）', 'autocomplete': 'off', 'autocapitalize': 'off' });
		var chainShow = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			var h = chainIn.type === 'password'; chainIn.type = h ? 'text' : 'password'; chainShow.textContent = h ? '隐藏' : '显示'; } }, '显示');
		var chainOut = E('div', { 'class': 'xr-ptxt', 'style': 'margin-top:12px' }, '');

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
			var v = chainIn.value.trim();
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
		var chainSaveBtn = E('button', { 'type': 'button', 'class': 'xr-btn pri', 'click': function() { saveChain(chainIn.value.trim()); } }, '保存并应用');
		var chainClearBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			if (!(cfg.chain || chainIn.value)) { note('当前没有设置链式代理。', 'info'); return; }
			chainIn.value = ''; saveChain('');
		} }, '清除链式代理');

		/* ------------ nodes ------------ */
		var tags = E('div', { 'class': 'xr-tags' });
		var grid = E('div', { 'class': 'xr-grid' });
		var barName = E('b', {}, '');
		var bar = E('div', { 'class': 'xr-bar' }, [ E('span', {}, [ '切换到 ', barName ]),
			E('button', { 'type': 'button', 'click': function() {
				if (selected) applyAll([ [ 'node_name', '^' + esc(selected.name) + '$' ], [ 'enabled', '1' ] ]);
			} }, '使用此节点') ]);
		var progBar = E('i', { 'style': 'width:0%' }), progTxt = E('div', { 'class': 'xr-ptxt' }, '');
		var prog = E('div', { 'class': 'xr-prog' }, [ E('div', { 'class': 'xr-pbar' }, progBar), progTxt ]);
		var benchInfo = E('span', { 'class': 'xr-tip', 'style': 'margin:0' }, '');

		var provTags = E('div', { 'class': 'xr-tags' });
		var prov = null;   /* null = every provider, '' = names without a provider prefix */

		/* ---- paging: 125 cards in one long list is a lot of scrolling ---- */
		var page = 1, pageSize = 24;
		try { var ps = parseInt(window.localStorage.getItem('xr_page_size'), 10); if (ps === 0 || ps === 12 || ps === 24 || ps === 48) pageSize = ps; } catch (e) { /* storage may be blocked */ }
		var pagerTop = E('div', { 'class': 'xr-pager' }), pagerBot = E('div', { 'class': 'xr-pager' });
		function drawPager(total) {
			var pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
			if (page > pages) page = pages;
			[ pagerTop, pagerBot ].forEach(function(box) {
				while (box.firstChild) box.removeChild(box.firstChild);
				if (total <= 12) return;   /* nothing to page through */
				function go(p) { return function() { page = p; drawNodes(); if (box === pagerBot) grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; }
				function pbtn(label, enabled, on, fn) {
					var b = E('button', { 'type': 'button', 'class': 'xr-pg' + (on ? ' on' : ''), 'click': fn }, label);
					b.disabled = !enabled; return b;
				}
				box.appendChild(pbtn('‹', page > 1, false, go(page - 1)));
				var shown = {}, last = 0;
				[ 1, page - 1, page, page + 1, pages ].forEach(function(p) { if (p >= 1 && p <= pages) shown[p] = 1; });
				Object.keys(shown).map(Number).sort(function(a, b) { return a - b; }).forEach(function(p) {
					if (last && p - last > 1) box.appendChild(E('span', { 'class': 'xr-pgdot' }, '…'));
					box.appendChild(pbtn(String(p), true, p === page, go(p))); last = p;
				});
				box.appendChild(pbtn('›', page < pages, false, go(page + 1)));
				var sel = E('select', { 'class': 'xr-psize', 'change': function() {
					pageSize = parseInt(sel.value, 10); page = 1;
					try { window.localStorage.setItem('xr_page_size', String(pageSize)); } catch (e) { /* ignore */ }
					drawNodes();
				} }, [ [ 12, '每页 12' ], [ 24, '每页 24' ], [ 48, '每页 48' ], [ 0, '全部显示' ] ].map(function(o) { return E('option', { 'value': String(o[0]) }, o[1]); }));
				sel.value = String(pageSize);
				box.appendChild(sel);
				box.appendChild(E('span', { 'class': 'xr-pinfo' }, '共 ' + total + ' 个'));
			});
		}

		/* regions / providers, most nodes first */
		function tally(key) {
			var c = {}, order = [];
			nodes.forEach(function(n) { var k = key(n); if (!(k in c)) { c[k] = 0; order.push(k); } c[k]++; });
			return order.sort(function(a, b) { return c[b] - c[a]; }).map(function(k) { return [ k, c[k] ]; });
		}
		var regions = tally(function(n) { return n.info.region; });
		var provs = tally(function(n) { return n.info.provider; });

		function visible() {
			return nodes.filter(function(n) { return (!region || n.info.region === region) && (prov === null || n.info.provider === prov); });
		}
		/* the exact node numbers shown, so a benchmark tests precisely what you are looking at */
		function visibleIdx() {
			if (!region && prov === null) return '.';
			return visible().map(function(n) { return n.idx; }).join(',') || '0';
		}

		function drawTags() {
			function fill(box, items, cur, onPick, allLabel) {
				while (box.firstChild) box.removeChild(box.firstChild);
				[ [ null, nodes.length ] ].concat(items).forEach(function(it) {
					var on = (it[0] === null && cur === (allLabel === '全部地区' ? '' : null)) || (it[0] !== null && it[0] === cur);
					box.appendChild(E('button', { 'type': 'button', 'class': 'xr-tag' + (on ? ' on' : ''), 'click': function() { onPick(it[0]); } },
						(it[0] === null ? allLabel : (it[0] || '未标注')) + ' ' + it[1]));
				});
			}
			fill(tags, regions, region, function(r) { region = r === null ? '' : r; page = 1; drawTags(); drawNodes(); benchLabel(); }, '全部地区');
			if (provs.length > 1) fill(provTags, provs, prov, function(p) { prov = p; page = 1; drawTags(); drawNodes(); benchLabel(); }, '全部来源');
			else while (provTags.firstChild) provTags.removeChild(provTags.firstChild);
		}

		function drawNodes() {
			var cur = currentNode(nodes, cfg.node_name);
			while (grid.firstChild) grid.removeChild(grid.firstChild);
			var list = visible();
			if (sortSpeed) list = list.slice().sort(function(a, b) { return (bench.speed[b.idx] || -1) - (bench.speed[a.idx] || -1); });
			var total = list.length; drawPager(total);
			if (pageSize) list = list.slice((page - 1) * pageSize, page * pageSize);
			list.forEach(function(n) {
				var sp = bench.speed[n.idx], cls = 'xr-node' + (cur && cur.idx === n.idx ? ' cur' : '') + (selected && selected.idx === n.idx ? ' sel' : '');
				var pct = sp > 0 ? Math.min(100, Math.round(sp / 15 * 100)) : 0, mc = sp >= 8 ? '' : (sp >= 3 ? 'mid' : 'low');
				grid.appendChild(E('div', { 'class': cls, 'click': function() {
					selected = n; barName.textContent = n.info.title; bar.className = 'xr-bar show'; drawNodes(); } }, [
					E('div', { 'class': 't' }, [ E('span', { 'class': 'f' }, n.info.flag || '🌐'), E('span', {}, n.info.title) ]),
					E('div', { 'class': 'p' }, [ E('span', { 'class': 'xr-badge' }, badgeText(n.kind)), n.info.provider ]),
					E('div', { 'class': 'xr-meter' }, E('i', { 'class': mc, 'style': 'width:' + pct + '%' })),
					E('div', { 'class': 'xr-spd' }, [
						E('span', {}, sp === undefined ? '未测速' : (sp > 0 ? sp.toFixed(1) + ' Mbps' : '测速失败')),
						oneBtn(n)
					])
				]));
			});
			if (!list.length) grid.appendChild(E('p', { 'class': 'xr-tip' }, '没有节点。请先在上面“订阅”里填写地址并更新。'));
		}

		var sortBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			sortSpeed = !sortSpeed; page = 1; sortBtn.textContent = sortSpeed ? '按原顺序' : '按速度排序'; drawNodes(); } }, '按速度排序');
		/* benchmark exactly these node numbers ("." = all); also used by the per-card "测速" button */
		function startBench(re, desc) {
			return sub([ 'bench-start', re ]).then(function(out) {
				var ok = out.indexOf('started') >= 0;
				note(ok ? '已开始测速：' + desc + '，每个节点约 10 秒，期间网络可正常使用。' : out.trim(), ok ? 'info' : 'danger');
				if (ok) { benchInfo.textContent = '测速中…'; bench.running = true; bench.done = 0; bench.total = 0; bench.cur = ''; drawProgress(); drawNodes(); }
			});
		}
		function oneBtn(n) {
			var testing = bench.running && bench.cur === n.name;
			var b = E('button', { 'type': 'button', 'class': 'xr-mini', 'click': function(ev) { ev.stopPropagation(); startBench(n.idx, n.info.title); } }, testing ? '测速中…' : '测速');
			b.disabled = bench.running;
			return b;
		}
		var benchBtn = E('button', { 'type': 'button', 'class': 'xr-btn', 'click': function() {
			startBench(visibleIdx(), region ? '（' + region + '）' : '全部节点');
		} }, '给全部节点测速');
		function benchLabel() {
			var c = visible().length, what = [ region, prov === null ? '' : (prov || '未标注') ].filter(Boolean).join(' · ');
			benchBtn.textContent = what ? '测速：' + what + '（' + c + ' 个节点）' : '给全部节点测速（' + c + ' 个）';
		}

		function bestNode() {
			var best = null;
			nodes.forEach(function(n) { var s = bench.speed[n.idx]; if (s > 0 && (!best || s > bench.speed[best.idx])) best = n; });
			return best;
		}
		function drawProgress() {
			benchBtn.disabled = bench.running;
			if (bench.running) {
				var pct = bench.total ? Math.round(bench.done * 100 / bench.total) : 4;
				prog.className = 'xr-prog show';
				progBar.style.width = Math.max(pct, 4) + '%';
				progTxt.textContent = '测速中 ' + bench.done + ' / ' + (bench.total || '…') + (bench.cur ? ' · 正在测：' + parseName(bench.cur).title : '');
			} else if (bench.total > 0 && bench.done >= bench.total) {
				var b = bestNode();
				prog.className = 'xr-prog show done';
				progBar.style.width = '100%';
				progTxt.textContent = '✔ 测速完成，共测 ' + bench.total + ' 个节点' + (b ? '；速度最快：' + b.info.title + '（' + bench.speed[b.idx].toFixed(1) + ' Mbps）' : '；没有节点测通');
			} else {
				prog.className = 'xr-prog';
			}
		}

		drawStatus(); drawTags(); drawNodes(); benchLabel(); drawProgress();
		if (bench.running) benchInfo.textContent = '测速中…';

		var pollN = 0, devSig = JSON.stringify(devs);
		poll.add(function() {
			pollN++;
			var wantDevs = (pollN % 2 === 0);   /* devices every 10 s, the rest every 5 s */
			return Promise.all([ sub([ 'status' ]), sub([ 'bench-state' ]), wantDevs ? sub([ 'devices' ]) : Promise.resolve(null) ]).then(function(r) {
				st = parseStatus(r[0]);
				var was = bench.running;
				bench = parseBench(r[1]);
				benchInfo.textContent = bench.running ? '测速中…' : '';
				drawStatus(); drawProgress();
				if (r[2] !== null) {
					var nd = parseDevices(r[2]), sig = JSON.stringify(nd);
					if (sig !== devSig) { devSig = sig; devs = nd; drawDevs(); drawCount(); }
				}
				if (was && !bench.running) note('测速完成：共测 ' + bench.total + ' 个节点，结果已显示在节点卡片上。', 'info');
				if (bench.running || was) drawNodes();
			});
		}, 5);

		return E('div', { 'class': 'xr' }, [
			E('style', {}, CSS),
			E('div', { 'class': 'xr-head' }, E('div', { 'class': 'xr-title' }, 'VLESS 透明代理')),
			E('p', { 'class': 'xr-sub' }, '国内 IP 直连，其余 TCP 流量走所选节点（仅 VLESS：Reality / WS+TLS，不支持 UDP）。'),

			E('div', { 'class': 'xr-card' }, [ E('div', { 'class': 'xr-h' }, '运行状态'), nowBox, chips,
				E('div', { 'class': 'xr-row', 'style': 'margin-top:14px' }, [ restartBtn, pullBtn ]) ]),

			E('div', { 'class': 'xr-card' }, [
				E('div', { 'class': 'xr-h' }, '模式'),
				E('div', { 'class': 'xr-seg' }, [ bProxy, bDirect ]),
				E('div', { 'class': 'xr-h', 'style': 'margin-top:18px' }, [ '哪些设备走代理', E('span', { 'class': 'xr-tip', 'style': 'margin:0 0 0 auto;font-weight:400' }, devCount) ]),
				E('div', { 'class': 'xr-seg' }, [ sAll, sPick ]),
				E('div', { 'class': 'xr-row', 'style': 'margin:0 0 10px' }, [ pickAll, pickNone ]),
				devBox,
				E('p', { 'class': 'xr-tip' }, '按设备的 MAC 地址记录，设备换了 IP 也不受影响。“空闲”表示最近没有通信，不一定已经离开；手机省电时常会这样。给全部设备开启前请注意：本机内存有限，设备或连接很多时可能吃紧。'),
				E('div', { 'class': 'xr-row', 'style': 'margin-top:12px' }, saveMode)
			]),

			E('div', { 'class': 'xr-card' }, [
				E('div', { 'class': 'xr-h' }, [ '节点', E('span', { 'class': 'xr-tip', 'style': 'margin:0 0 0 auto' }, benchInfo) ]),
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 10px' }, statsLine(d[5] || '')),
				tags, provTags, pagerTop, grid, pagerBot,
				E('div', { 'class': 'xr-row', 'style': 'margin-top:12px' }, [ benchBtn, sortBtn ]),
				prog,
				bar
			]),

			E('div', { 'class': 'xr-card' }, [
				E('div', { 'class': 'xr-h' }, '链式代理（家宽出口）'),
				E('p', { 'class': 'xr-tip', 'style': 'margin:0 0 10px' }, '留空：流量直接从上面所选的节点出去。填写后：所选节点作为前置，流量再经过这个代理出去，网站看到的是它的 IP（比如家宽出口）。支持 socks5://、http://、vless://、ss:// 格式，例如 socks5://用户名:密码@地址:端口。'),
				E('div', { 'class': 'xr-row xr-inline' }, [ chainIn, chainShow ]),
				E('div', { 'class': 'xr-row', 'style': 'margin-top:10px' }, [ chainTestBtn, chainSaveBtn, chainClearBtn ]),
				chainOut,
				E('p', { 'class': 'xr-tip' }, '注意：①前置节点要能访问这个代理的地址，有些家宽代理只允许白名单 IP；②多一跳会更慢；③链式代理失效时，国外流量会直接不通，不会自动回退到所选节点；④账号密码保存在路由器里，页面上默认隐藏；⑤只支持 TCP。')
			]),

			E('div', { 'class': 'xr-card' }, E('details', { 'class': 'xr-det' }, [
				E('summary', {}, '订阅设置'),
				E('div', { 'class': 'xr-row xr-inline' }, [ subUrl, showBtn ]),
				E('p', { 'class': 'xr-tip' }, '共 ' + nodes.length + ' 个可用 VLESS 节点；“剩余流量 / 到期”等信息条目已自动忽略。订阅地址包含你的账号凭据，默认隐藏。'),
				E('div', { 'class': 'xr-row', 'style': 'margin-top:10px' }, subBtn)
			]))
		]);
	}
});
