const W = 128, H = 64, C = 5, SY = 29, FY = 63;
const SCENE_SEED = 21, SPOT_SEED = 5, MAX_SPOTS = 120, SPOT_TRIES = 20000;

const HAZE = '#D6D0C6', WHAZE = '#BFDCEE';
const AUT = ['#B9471C', '#D2672A', '#E0892F', '#E8A93C', '#C98A1A', '#8E3518', '#D9B24A'];
const GOLD = ['#7A5200', '#A87400', '#C98F00', '#E0A800', '#F2C230'];
const PEB = ['#9A948A', '#B5AFA4', '#7D776E', '#C9C2B5', '#A8A196'];
const LIT = ['#8B4A2B', '#A0522D', '#7A3E22', '#B5652E', '#6B4A2E'];
const WAT = ['#2F78A8', '#2A6B99', '#3E8CBE', '#256190'];
const GRN = ['#2C5A26', '#3B7432', '#4E8C3C', '#67A84A'];
const OUTLINE = { leaf: '#4A3000', trunk: '#2A1808', bench: '#0E1A12' };
const PETAL = '#D7263D', CENTER = '#FFE08A', RIPPLE = '#EAF6FF';

function mulberry32(seed) {
	let s = seed;
	return () => {
		s |= 0; s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

function mix(h1, h2, t) {
	const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
	return '#' + [16, 8, 0].map(s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function stream(y) {
	const t = (FY - y) / (FY - SY);
	return { t, cx: 30 + 42 * t + Math.sin(t * 4) * 6 * (1 - t), w: 1.5 + 26 * Math.pow(1 - t, 1.3) };
}

function buildScene() {
	const r = mulberry32(SCENE_SEED);
	const pick = a => a[Math.floor(r() * a.length)];
	const G = Array.from({ length: H }, () => Array(W).fill('#ECE8E0'));
	const owner = Array.from({ length: H }, () => Array(W).fill(null));
	const set = (x, y, c, o) => {
		x = Math.round(x); y = Math.round(y);
		if (x >= 0 && x < W && y >= 0 && y < H) { G[y][x] = c; if (o) owner[y][x] = o; }
	};

	for (let x = 0; x < W; x++) {
		const top = 3 + Math.sin(x * .35) * 1.5 + Math.sin(x * .9) + r() * 1.5;
		for (let y = 0; y < SY; y++) if (y > top) set(x, y, mix(pick(AUT), HAZE, .58 + r() * .12 - (y / SY) * .1));
	}
	for (let i = 0; i < 46; i++) {
		const x = Math.floor(r() * W), y0 = 7 + r() * 14;
		for (let y = y0; y < SY; y++) if (r() < .85) set(x, y, mix(r() < .6 ? '#D9D2C4' : '#5E4634', HAZE, .45));
	}

	const ripples = [];
	for (let y = SY; y < H; y++) {
		const { t, cx, w } = stream(y), lb = 2 + 6 * (1 - t), rb = 3 + 28 * (1 - t);
		for (let x = 0; x < W; x++) {
			const dx = x - cx;
			if (Math.abs(dx) < w / 2) { set(x, y, mix(pick(WAT), WHAZE, t * .45)); if (r() < .08) ripples.push([x, y]); }
			else if ((dx < 0 && -dx < w / 2 + lb) || (dx > 0 && dx < w / 2 + rb)) set(x, y, mix(r() < .12 ? pick(LIT) : pick(PEB), HAZE, t * .4));
			else set(x, y, mix(pick(LIT), HAZE, t * .4));
		}
	}

	const bush = (cx, yb, s) => {
		const rx = 1.5 + 5 * s, ry = 1 + 3.2 * s, cy = yb - ry * .6;
		for (let y = Math.floor(cy - ry - 1); y <= yb; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
			const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
			if (d < .8 + r() * .3) {
				const lit = (cy - y) / ry * .9 + (cx - x) / rx * .3 + r() * .8;
				set(x, y, mix(GRN[Math.max(0, Math.min(3, Math.floor(1.3 + lit * 1.4)))], HAZE, (1 - s) * .5));
			}
		}
	};
	const tree = (x, yb, s) => {
		const h = Math.round(5 + 24 * s), tw = s > .6 ? 2 : 1, tc = r() < .55 ? '#D9D2C4' : '#4A3626';
		for (let y = yb - h; y <= yb; y++) for (let k = 0; k < tw; k++) set(x + k, y, mix(tc, HAZE, (1 - s) * .45));
		const cx = x + (r() - .5) * 2, cy = yb - h * .82, rx = 2.5 + 9 * s, ry = 3 + 8 * s;
		for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let xx = Math.floor(cx - rx - 1); xx <= cx + rx + 1; xx++) {
			const d = ((xx - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
			if (d < .75 + r() * .35) set(xx, y, mix(pick(AUT), HAZE, (1 - s) * .55));
		}
	};

	const items = [
		...[.04, .12, .2, .3, .4, .52, .66, .82, 1].map(d => [d, 'L', 'tree']),
		...[.06, .16, .26, .36, .48, .58].map(d => [d, 'R', 'tree']),
		...[.1, .22, .34, .46, .6, .74, .9, .98].map(d => [d, 'L', 'bush']),
		...[.14, .28, .42, .55, .7].map(d => [d, 'R', 'bush']),
	].sort((a, b) => a[0] - b[0]);
	for (const [d, side, kind] of items) {
		const yb = Math.round(FY - (1 - d) * (FY - SY)), { t, cx, w } = stream(yb);
		const off = kind === 'tree' ? (2 + 5 * d) + r() * 3 : r() * (4 + 10 * d);
		const x = Math.round(side === 'L' ? cx - w / 2 - (2 + 6 * (1 - t)) - off : cx + w / 2 + (3 + 28 * (1 - t)) + 1 + off);
		if (kind === 'tree') { tree(x, yb, d); if (r() < .6) bush(x + (r() - .5) * 4, yb + 1, d * .8); }
		else bush(x, yb, d);
	}
	bush(112, 62, 1); bush(122, 60, .85); bush(73, 61, .9); bush(4, 62, 1);

	const MX = 101, MY = 21, RX = 25, RY = 16, canopy = [];
	for (let y = 34; y <= 60; y++) {
		const l = y >= 57 ? 98 : 99, h = y >= 57 ? 103 : 102;
		for (let x = l; x <= h; x++) set(x, y, x === h ? '#4A2E12' : '#6B4420', 'trunk');
	}
	for (let t = 0; t < 9; t++) {
		set(99 - t, 36 - t, '#6B4420', 'trunk'); set(98 - t, 36 - t, '#6B4420', 'trunk');
		set(103 + t, 37 - t, '#4A2E12', 'trunk'); set(104 + t, 37 - t, '#4A2E12', 'trunk');
	}
	for (let y = 0; y < 42; y++) for (let x = 70; x < W; x++) {
		const d = ((x - MX) / RX) ** 2 + ((y - MY) / RY) ** 2;
		if (d < .82 + r() * .3) {
			const v = (MX - x) * .015 + (MY - y) * .035 + r() * .8 + .5;
			set(x, y, GOLD[Math.max(0, Math.min(4, Math.floor(v * 2)))], 'leaf');
			if (d < .72) canopy.push([x, y]);
		}
	}

	for (let x = 80; x <= 94; x++) set(x, 59, '#3E2616');
	const BG = '#2F5E3A', BD = '#1B3A24', BL = '#4C8456';
	for (let x = 81; x <= 92; x++) { set(x, 50, BL, 'bench'); set(x, 52, BG, 'bench'); set(x, 54, BL, 'bench'); set(x, 55, BG, 'bench'); }
	for (let y = 50; y <= 53; y++) { set(81, y, BD, 'bench'); set(92, y, BD, 'bench'); }
	for (let y = 56; y <= 58; y++) { set(82, y, BD, 'bench'); set(91, y, BD, 'bench'); }
	for (const [x, y] of [[80, 53], [80, 54], [93, 53], [93, 54]]) set(x, y, BD, 'bench');

	const benchGap = (x, y) => x > 81 && x < 92 && y > 50 && y < 54;
	const outline = [];
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (owner[y][x] || benchGap(x, y)) continue;
		for (const [a, b] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
			const o = owner[y + b]?.[x + a];
			if (o) { outline.push([x, y, OUTLINE[o]]); break; }
		}
	}
	for (const [x, y, c] of outline) G[y][x] = c;

	const rippleDelays = ripples.map(() => (r() * 2.4).toFixed(2));
	const fallingLeaves = Array.from({ length: 10 }, (_, i) => {
		const x = (80 + Math.floor(r() * 40)) * C, y = (33 + Math.floor(r() * 5)) * C;
		const color = GOLD[1 + Math.floor(r() * 4)];
		const q = v => Math.round(v / 5) * 5;
		const a = q(r() * 30 - 15), b = q(r() * 40 - 20), c = q(r() * 50 - 25);
		const delay = ((i < 5 ? 0 : 3.5) + (i % 5) * .4 + r() * .2).toFixed(2);
		return { x, y, color, a, b, c, delay };
	});

	let streamPath = '';
	for (let y = SY + 1; y < H; y++) streamPath += (streamPath ? 'L' : 'M') + (stream(y).cx * C).toFixed(1) + ',' + (y * C);

	return { G, ripples: ripples.map(([x, y], i) => ({ x, y, delay: rippleDelays[i] })), fallingLeaves, streamPath, canopy };
}

function petalsTouch([ax, ay], [bx, by]) {
	const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
	return dx + dy <= 4 && Math.max(dx, dy) <= 3;
}

function placeSpots(canopy) {
	const rs = mulberry32(SPOT_SEED), spots = [];
	for (let k = 0; k < SPOT_TRIES && spots.length < MAX_SPOTS; k++) {
		const c = canopy[Math.floor(rs() * canopy.length)];
		if (spots.every(p => !petalsTouch(p, c))) spots.push(c);
	}
	return spots;
}

function pixelPaths(G) {
	const runs = new Map();
	for (let y = 0; y < H; y++) {
		let x = 0;
		while (x < W) {
			let e = x;
			while (e + 1 < W && G[y][e + 1] === G[y][x]) e++;
			const w = (e - x + 1) * C, c = G[y][x];
			if (!runs.has(c)) runs.set(c, []);
			runs.get(c).push(`M${x * C} ${y * C}h${w}v${C}h-${w}z`);
			x = e + 1;
		}
	}
	return [...runs].map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
}

const STYLE = `<style>
.bloom{transform-box:fill-box;transform-origin:center;transform:scale(0);animation:bloom .45s steps(3,end) forwards}
@keyframes bloom{to{transform:scale(1)}}
.leaf-fall{opacity:0;animation-duration:7s;animation-timing-function:steps(26,end);animation-iteration-count:infinite}
.ripple{opacity:0;animation:ripple 2.4s steps(1,end) infinite}
@keyframes ripple{0%{opacity:0}55%{opacity:.9}85%{opacity:0}}
@media (prefers-reduced-motion:reduce){.bloom{animation:none;transform:none}.leaf-fall,.ripple{animation:none}.drift{display:none}}
KEYFRAMES</style>`;

const scene = buildScene();
const spots = placeSpots(scene.canopy);

export const FLOWER_CAPACITY = spots.length;

const staticSvg = (() => {
	const keyframes = scene.fallingLeaves.map((l, i) =>
		`@keyframes fall${i}{0%{transform:translate(0,0);opacity:0}5%{opacity:1}35%{transform:translate(${l.a}px,40px)}70%{transform:translate(${l.b}px,80px)}90%{opacity:1}100%{transform:translate(${l.c}px,110px);opacity:0}}`).join('\n');
	const ripples = scene.ripples.map(p =>
		`<rect class="ripple" x="${p.x * C}" y="${p.y * C}" width="${C}" height="${C}" fill="${RIPPLE}" style="animation-delay:${p.delay}s"/>`).join('');
	const drift = ['#E0A800', '#D2672A'].map((fill, i) => {
		const timing = `dur="16s" begin="${i * 8}s" repeatCount="indefinite"`;
		return `<rect class="drift" width="${C}" height="${C}" fill="${fill}" opacity="0"><animateMotion path="${scene.streamPath}" ${timing}/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" ${timing}/></rect>`;
	}).join('');
	const leaves = scene.fallingLeaves.map((l, i) =>
		`<g transform="translate(${l.x},${l.y})"><rect class="leaf-fall" width="${C}" height="${C}" fill="${l.color}" style="animation-name:fall${i};animation-delay:${l.delay}s"/></g>`).join('');
	return {
		head: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * C} ${H * C}" width="${W * C}" height="${H * C}" shape-rendering="crispEdges" role="img"><title>A maple tree by a stream. Each red flower is one contribution made today.</title>${STYLE.replace('KEYFRAMES', keyframes)}${pixelPaths(scene.G)}<g>${ripples}</g>${drift}`,
		tail: `<g>${leaves}</g></svg>`,
	};
})();

function flower([x, y], delay) {
	const petals = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([a, b]) => `<rect x="${a * C}" y="${b * C}" width="${C}" height="${C}" fill="${PETAL}"/>`).join('');
	return `<g class="flower" transform="translate(${x * C},${y * C})"><g class="bloom" style="animation-delay:${delay}s">${petals}<rect width="${C}" height="${C}" fill="${CENTER}"/></g></g>`;
}

export function renderScene(count) {
	if (!Number.isInteger(count) || count < 0) throw new RangeError(`count must be a non-negative integer, got ${count}`);
	const n = Math.min(count, FLOWER_CAPACITY);
	const step = n ? Math.min(0.12, 6 / n) : 0;
	const flowers = spots.slice(0, n).map((p, i) => flower(p, (0.3 + i * step).toFixed(2))).join('');
	return `${staticSvg.head}<g>${flowers}</g>${staticSvg.tail}`;
}
