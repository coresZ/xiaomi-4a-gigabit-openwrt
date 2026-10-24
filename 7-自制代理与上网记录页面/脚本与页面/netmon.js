'use strict';
'require view';
'require fs';
'require poll';
'require ui';

var BIN = '/usr/bin/netmon';

var CSS = [
	'.nm{width:100%;max-width:1100px;min-width:0;margin:0 auto;padding-top:40px;--nm-a:#4c6ef5;--nm-ok:#2bb673;--nm-bad:#e8590c;--nm-line:rgba(127,127,127,.28);--nm-soft:rgba(127,127,127,.09)}',
	'.nm *{box-sizing:border-box}',
	'.nm-title{font-size:22px;font-weight:700;margin:8px 0 2px}',
	'.nm-sub{opacity:.7;font-size:13px;margin:0 0 16px}',
	'.nm-card{min-width:0;border:1px solid var(--nm-line);border-radius:16px;padding:16px;margin:0 0 16px;background:var(--nm-soft)}',
	'.nm-h{margin:0 0 12px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
	'.nm-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
	'.nm-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--nm-line);font-size:13px;white-space:nowrap;background:rgba(127,127,127,.06)}',
	'.nm-dot{width:9px;height:9px;border-radius:50%;background:#999;display:inline-block;flex:0 0 auto}',
	'.nm-chip.ok .nm-dot{background:var(--nm-ok);box-shadow:0 0 0 3px rgba(43,182,115,.22)}',
	'.nm-chip.bad .nm-dot{background:var(--nm-bad)}',
	'.nm-btn{min-height:42px;padding:6px 16px;border-radius:12px;border:1px solid var(--nm-line);background:transparent;color:inherit;font-size:15px;cursor:pointer}',
	'.nm-btn.pri{background:var(--nm-a);border-color:var(--nm-a);color:#fff;font-weight:600}',
	'.nm-btn.warn{border-color:var(--nm-bad);color:var(--nm-bad)}',
	'.nm-field{min-height:42px;font-size:16px;padding:6px 12px;border-radius:12px;border:1px solid var(--nm-line);background:rgba(255,255,255,.04);color:inherit;width:100%}',
	'.nm-devs{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;max-width:100%;-webkit-overflow-scrolling:touch}',
	'.nm-dev{flex:0 0 auto;min-height:38px;padding:4px 14px;border-radius:12px;border:1px solid var(--nm-line);background:transparent;color:inherit;font-size:14px;cursor:pointer;text-align:left;line-height:1.25}',
	'.nm-dev small{display:block;font-size:11.5px;opacity:.7}',
	'.nm-dev.on{background:var(--nm-a);border-color:var(--nm-a);color:#fff}',
	'.nm-seg{display:inline-flex;border:1px solid var(--nm-line);border-radius:12px;overflow:hidden}',
	'.nm-seg button{min-height:40px;padding:4px 18px;border:0;background:transparent;color:inherit;font-size:15px;cursor:pointer}',
	'.nm-seg button.on{background:var(--nm-a);color:#fff;font-weight:600}',
	'.nm-opt{display:inline-flex;align-items:center;gap:6px;font-size:14px;min-height:36px;cursor:pointer}',
	'.nm-list{margin-top:8px}',
	'.nm-item{display:grid;grid-template-columns:78px minmax(90px,150px) 1fr;gap:10px;align-items:baseline;padding:9px 4px;border-bottom:1px solid var(--nm-line);font-size:14px}',
	'.nm-item:last-child{border-bottom:0}',
	'.nm-t{opacity:.65;font-variant-numeric:tabular-nums;font-size:13px}',
	'.nm-d{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
	'.nm-dom{word-break:break-all;font-weight:500}',
	'.nm-rank{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:9px 4px;border-bottom:1px solid var(--nm-line);font-size:14px}',
	'.nm-rank .bar{grid-column:1/3;height:6px;border-radius:99px;background:rgba(127,127,127,.2);overflow:hidden}',
	'.nm-rank .bar i{display:block;height:100%;background:var(--nm-a);border-radius:99px}',
	'.nm-rank .cnt{font-variant-numeric:tabular-nums;font-weight:700}',
	'.nm-rank .meta{grid-column:1/3;font-size:12px;opacity:.65}',
	'.nm-empty{padding:26px 8px;text-align:center;opacity:.65;font-size:14px}',
	'.nm-tip{font-size:12.5px;opacity:.7;margin:10px 0 0;line-height:1.55}',
	'@media (max-width:640px){',
	'.nm-card{padding:14px;border-radius:14px}',
	'.nm-item{grid-template-columns:1fr;gap:2px;padding:10px 2px}',
	'.nm-item .nm-t{display:inline}',
	'.nm-row>.nm-btn{flex:1 1 auto}',
	'.nm-seg{width:100%}.nm-seg button{flex:1}',
	'}'
].join('\n');

/* ---- helpers ---- */
function nm(args) { return fs.exec(BIN, args).then(function(r) { return (r && r.stdout) || ''; }); }
function note(msg, type) { ui.addNotification(null, E('p', {}, msg), type || 'info'); }
function lines(txt) { return txt.split('\n').filter(Boolean).map(function(l) { return l.split('\t'); }); }
function kv(txt) {
	var o = {};
	txt.split('\n').forEach(function(l) { var i = l.indexOf('='); if (i > 0) o[l.substr(0, i)] = l.substr(i + 1); });
	return o;
}
function p2(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(e) {
	var d = new Date(e * 1000), t = p2(d.getHours()) + ':' + p2(d.getMinutes());
	var today = new Date();
	return d.toDateString() === today.toDateString() ? t : p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + t;
}
function ago(sec) {
	if (sec < 90) return '刚刚';
	if (sec < 5400) return Math.round(sec / 60) + ' 分钟前';
	if (sec < 172800) return Math.round(sec / 3600) + ' 小时前';
	return Math.round(sec / 86400) + ' 天前';
}
function color(ip) {
	var h = 0, i;
	for (i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) % 360;
	return 'hsl(' + h + ',65%,52%)';
}

var SLD2 = { 'com.cn': 1, 'net.cn': 1, 'org.cn': 1, 'gov.cn': 1, 'edu.cn': 1, 'com.hk': 1, 'co.jp': 1, 'co.uk': 1, 'com.tw': 1, 'co.kr': 1, 'com.au': 1, 'com.sg': 1 };
function site(d) {
	var p = d.split('.');
	if (p.length <= 2) return d;
	return SLD2[p.slice(-2).join('.')] ? p.slice(-3).join('.') : p.slice(-2).join('.');
}

/* background chatter that is not "a site the person opened" */
var NOISE = /(^|\.)(pool\.ntp\.org|ntp\.org|time\.windows\.com|time\.apple\.com|time\.android\.com|connectivitycheck\.[a-z.]+|msftconnecttest\.com|msftncsi\.com|captive\.apple\.com|detectportal\.firefox\.com|mtalk\.google\.com|clients[0-9]*\.google\.com|gstatic\.com|push\.apple\.com|ocsp\.[a-z0-9.-]+|crl\.[a-z0-9.-]+|telemetry\.[a-z0-9.-]+|metrics\.[a-z0-9.-]+|beacons?\.[a-z0-9.-]+|doubleclick\.net|dns\.google|cloudflare-dns\.com)$/i;

return view.extend({
	handleSave: null,
	handleSaveApply: null,
	handleReset: null,

	load: function() {
		return Promise.all([ nm([ 'stats' ]), nm([ 'devices' ]), nm([ 'recent', '400', 'all' ]), nm([ 'top', 'all', '3600', '300' ]) ]);
	},

	render: function(d) {
		var self = this;
		var st = kv(d[0]), devs = lines(d[1]), recent = lines(d[2]), top = lines(d[3]);
		var S = { ip: 'all', tab: 'recent', secs: 3600, q: '', merge: false, noise: true };
		var names = {};
		function mapNames() { names = {}; devs.forEach(function(x) { names[x[0]] = x[1] && x[1] !== '-' ? x[1] : x[0]; }); }
		mapNames();
		function label(ip) { return names[ip] || ip; }

		var statusRow = E('div', { 'class': 'nm-row' });
		var devBox = E('div', { 'class': 'nm-devs' });
		var listBox = E('div', { 'class': 'nm-list' });
		var searchBox = E('input', { 'class': 'nm-field', 'type': 'text', 'placeholder': '搜索网站，如 bilibili / google', 'style': 'flex:1 1 220px;width:auto',
			'input': function() { S.q = searchBox.value.trim().toLowerCase(); drawList(); } });

		/* ---- status card ---- */
		function drawStatus() {
			while (statusRow.firstChild) statusRow.removeChild(statusRow.firstChild);
			var on = st.enabled === '1' && st.logging === '1';
			var oldest = parseInt(st.oldest, 10) || 0, now = parseInt(st.now, 10) || 0;
			statusRow.appendChild(E('span', { 'class': 'nm-chip ' + (on ? 'ok' : 'bad') }, [ E('span', { 'class': 'nm-dot' }), on ? '记录中' : '已暂停' ]));
			statusRow.appendChild(E('span', { 'class': 'nm-chip' }, '已记录 ' + (st.events || 0) + ' 条'));
			if (oldest && now) statusRow.appendChild(E('span', { 'class': 'nm-chip' }, '最早 ' + fmtTime(oldest)));
			var kb = (parseInt(st.bytes, 10) || 0) / 1024;
			statusRow.appendChild(E('span', { 'class': 'nm-chip' }, '内存占用 ' + (kb < 1 ? '不足 1 KB' : kb < 1024 ? kb.toFixed(0) + ' KB' : (kb / 1024).toFixed(1) + ' MB')));
			statusRow.appendChild(E('button', { 'type': 'button', 'class': 'nm-btn ' + (on ? '' : 'pri'), 'click': function() {
				nm([ on ? 'off' : 'on' ]).then(function() { note(on ? '已暂停记录（已有记录保留）' : '已开始记录', 'info'); window.setTimeout(refresh, 1500); });
			} }, on ? '暂停记录' : '开始记录'));
			statusRow.appendChild(E('button', { 'type': 'button', 'class': 'nm-btn warn', 'click': function() {
				if (!window.confirm('清空所有记录？此操作不能撤销。')) return;
				nm([ 'clear' ]).then(function() { note('记录已清空', 'info'); refresh(); });
			} }, '清空记录'));
		}

		/* ---- device chips ---- */
		function drawDevs() {
			while (devBox.firstChild) devBox.removeChild(devBox.firstChild);
			var total = 0;
			devs.forEach(function(x) { total += parseInt(x[3], 10) || 0; });
			function chip(ip, title, sub) {
				devBox.appendChild(E('button', { 'type': 'button', 'class': 'nm-dev' + (S.ip === ip ? ' on' : ''),
					'click': function() { S.ip = ip; drawDevs(); refresh(true); } }, [ title, E('small', {}, sub) ]));
			}
			chip('all', '全部设备', '最近 1 小时 ' + total + ' 次');
			devs.forEach(function(x) { chip(x[0], (x[1] && x[1] !== '-' ? x[1] : x[0]), x[0] + ' · ' + (x[3] || 0) + ' 次'); });
		}

		/* ---- list ---- */
		function keep(dom) {
			if (S.noise && NOISE.test(dom)) return false;
			if (S.q && dom.indexOf(S.q) < 0 && site(dom).indexOf(S.q) < 0) return false;
			return true;
		}
		function drawList() {
			while (listBox.firstChild) listBox.removeChild(listBox.firstChild);
			var now = parseInt(st.now, 10) || Math.floor(Date.now() / 1000), shown = 0;
			if (S.tab === 'recent') {
				var seen = {};
				recent.forEach(function(r) {
					var dom = S.merge ? site(r[2]) : r[2];
					if (!keep(r[2])) return;
					var k = r[1] + '|' + dom + '|' + Math.floor(r[0] / 300);
					if (S.merge) { if (seen[k]) return; seen[k] = 1; }
					if (shown >= 300) return;
					shown++;
					listBox.appendChild(E('div', { 'class': 'nm-item' }, [
						E('span', { 'class': 'nm-t' }, fmtTime(parseInt(r[0], 10))),
						E('span', { 'class': 'nm-d' }, [ E('span', { 'class': 'nm-dot', 'style': 'background:' + color(r[1]) }), label(r[1]) ]),
						E('span', { 'class': 'nm-dom' }, dom)
					]));
				});
			} else {
				var agg = {};
				top.forEach(function(r) {
					if (!keep(r[2])) return;
					var k = S.merge ? site(r[2]) : r[2];
					if (!agg[k]) agg[k] = { n: 0, last: 0 };
					agg[k].n += parseInt(r[0], 10); agg[k].last = Math.max(agg[k].last, parseInt(r[1], 10));
				});
				var arr = Object.keys(agg).map(function(k) { return { d: k, n: agg[k].n, last: agg[k].last }; }).sort(function(a, b) { return b.n - a.n; }).slice(0, 100);
				var max = arr.length ? arr[0].n : 1;
				arr.forEach(function(x) {
					shown++;
					listBox.appendChild(E('div', { 'class': 'nm-rank' }, [
						E('span', { 'class': 'nm-dom' }, x.d), E('span', { 'class': 'cnt' }, x.n + ' 次'),
						E('div', { 'class': 'bar' }, E('i', { 'style': 'width:' + Math.max(3, Math.round(x.n * 100 / max)) + '%' })),
						E('div', { 'class': 'meta' }, '最近访问：' + ago(now - x.last) + '（' + fmtTime(x.last) + '）')
					]));
				});
			}
			if (!shown) listBox.appendChild(E('div', { 'class': 'nm-empty' }, st.events > 0 ? '没有符合条件的记录。' : (st.enabled === '1' ? '还没有记录，设备上网后几十秒内会出现。' : '记录功能未开启，点上面的“开始记录”。')));
		}

		/* ---- data refresh ---- */
		function refresh(force) {
			var ip = S.ip;
			return Promise.all([ nm([ 'stats' ]), nm([ 'devices' ]), nm([ 'recent', '400', ip ]), nm([ 'top', ip, String(S.secs), '300' ]) ]).then(function(r) {
				st = kv(r[0]); devs = lines(r[1]); recent = lines(r[2]); top = lines(r[3]); mapNames();
				drawStatus(); drawDevs(); drawList();
			});
		}
		poll.add(function() { return refresh(); }, 5);

		/* ---- controls ---- */
		var bRecent = E('button', { 'type': 'button', 'class': 'on', 'click': function() { S.tab = 'recent'; setTab(); } }, '实时访问');
		var bTop = E('button', { 'type': 'button', 'click': function() { S.tab = 'top'; setTab(); } }, '访问排行');
		var period = E('select', { 'class': 'nm-field', 'style': 'width:auto;min-width:130px', 'change': function() { S.secs = parseInt(period.value, 10); refresh(true); } }, [
			E('option', { 'value': '3600' }, '最近 1 小时'), E('option', { 'value': '21600' }, '最近 6 小时'), E('option', { 'value': '86400' }, '最近 24 小时'), E('option', { 'value': '0' }, '全部记录')
		]);
		function setTab() { bRecent.className = S.tab === 'recent' ? 'on' : ''; bTop.className = S.tab === 'top' ? 'on' : ''; period.style.display = S.tab === 'top' ? '' : 'none'; drawList(); }
		period.style.display = 'none';
		var cbMerge = E('input', { 'type': 'checkbox', 'change': function() { S.merge = cbMerge.checked; drawList(); } });
		var cbNoise = E('input', { 'type': 'checkbox', 'checked': true, 'change': function() { S.noise = cbNoise.checked; drawList(); } });

		drawStatus(); drawDevs(); drawList();

		return E('div', { 'class': 'nm' }, [
			E('style', {}, CSS),
			E('div', { 'class': 'nm-title' }, '上网记录'),
			E('p', { 'class': 'nm-sub' }, '谁在什么时候访问了哪些网站（按域名）。记录只保存在路由器内存里，重启即清空，不写入闪存。'),

			E('div', { 'class': 'nm-card' }, [ E('div', { 'class': 'nm-h' }, '记录状态'), statusRow ]),

			E('div', { 'class': 'nm-card' }, [
				E('div', { 'class': 'nm-h' }, '设备'), devBox,
				E('div', { 'class': 'nm-row', 'style': 'margin:2px 0 6px' }, [ E('div', { 'class': 'nm-seg' }, [ bRecent, bTop ]), period, searchBox ]),
				E('div', { 'class': 'nm-row' }, [
					E('label', { 'class': 'nm-opt' }, [ cbMerge, '合并子域名（只看网站）' ]),
					E('label', { 'class': 'nm-opt' }, [ cbNoise, '隐藏系统后台请求' ])
				]),
				listBox,
				E('p', { 'class': 'nm-tip' }, '说明：数据来自路由器的 DNS 查询记录，设备访问网站前要先向路由器查询域名，所以能知道“访问了哪个网站”，但看不到具体页面和内容。同一设备对同一域名在一分钟内只记一次。如果设备开启了“安全 DNS / DoH”，或手动指定了别的 DNS 服务器，就不会经过路由器，这部分记录不到。')
			])
		]);
	}
});
