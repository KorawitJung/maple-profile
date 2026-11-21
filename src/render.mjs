import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { renderScene, FLOWER_CAPACITY } from './scene.mjs';

const QUERY = 'query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}';
const isCount = v => Number.isInteger(v) && v >= 0;

export function localDay(now, timeZone) {
	const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
	const zone = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(now).find(p => p.type === 'timeZoneName').value;
	const offset = zone === 'GMT' ? '+00:00' : zone.slice(3);
	return { date, offset };
}

function checkTimeZone(timeZone) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
	} catch {
		throw new Error(`Unknown time zone "${timeZone}". Use an IANA name such as Asia/Bangkok or America/New_York.`);
	}
}

export async function fetchTodayCount({ login, token, now, timeZone, fetchImpl = fetch }) {
	const { date, offset } = localDay(now, timeZone);
	const res = await fetchImpl('https://api.github.com/graphql', {
		method: 'POST',
		headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'maple-profile' },
		body: JSON.stringify({ query: QUERY, variables: { login, from: `${date}T00:00:00${offset}`, to: `${date}T23:59:59${offset}` } }),
	});
	if (!res.ok) throw new Error(`GitHub GraphQL returned HTTP ${res.status}`);
	const body = await res.json();
	if (body.errors?.length) throw new Error(`GitHub GraphQL error: ${body.errors.map(e => e.message).join('; ')}`);
	const weeks = body.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
	if (!Array.isArray(weeks)) throw new Error(`No contribution calendar for user ${login}`);
	const day = weeks.flatMap(w => w.contributionDays ?? []).find(d => d.date === date);
	if (!day) return 0;
	if (!isCount(day.contributionCount)) throw new Error(`Bad contributionCount for ${date}: ${day.contributionCount}`);
	return day.contributionCount;
}

export async function main(argv, env) {
	const args = argv.flatMap((a, i) => (a === '--count' && /^-/.test(argv[i + 1] ?? '') ? [] : i > 0 && argv[i - 1] === '--count' && /^-/.test(a) ? [`--count=${a}`] : [a]));
	const { values } = parseArgs({ args, options: { out: { type: 'string' }, count: { type: 'string' }, login: { type: 'string' }, timezone: { type: 'string' } } });
	if (!values.out) throw new Error('--out <file> is required');
	const timeZone = values.timezone || env.MAPLE_TIMEZONE || 'UTC';
	checkTimeZone(timeZone);
	const now = new Date();
	let count;
	if (values.count !== undefined) {
		count = /^\d+$/.test(values.count) ? Number(values.count) : NaN;
		if (!isCount(count)) throw new Error(`--count must be a non-negative integer, got ${values.count}`);
	} else {
		const login = values.login || env.MAPLE_LOGIN;
		if (!login) throw new Error('No GitHub login. Pass --login <name> or set MAPLE_LOGIN.');
		if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
		count = await fetchTodayCount({ login, token: env.GITHUB_TOKEN, now, timeZone });
	}
	const svg = renderScene(count);
	await writeFile(values.out, svg);
	console.log(`maple: ${localDay(now, timeZone).date} (${timeZone}) ${count} contributions, ${Math.min(count, FLOWER_CAPACITY)} flowers`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main(process.argv.slice(2), process.env).catch(err => {
		console.error(`maple: ${err.message}`);
		process.exitCode = 1;
	});
}
