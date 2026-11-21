import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { localDay, fetchTodayCount, main } from './render.mjs';

const now = new Date('2026-11-21T07:35:00Z');
const reply = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });
const calendar = days => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: days }] } } } } });
const args = { login: 'octocat', token: 't', now, timeZone: 'Asia/Bangkok' };
const tmpOut = () => join(tmpdir(), `maple-${process.pid}-${Math.random().toString(36).slice(2)}.svg`);

test('the local day flips at local midnight', () => {
	assert.deepEqual(localDay(new Date('2026-11-20T16:59:59Z'), 'Asia/Bangkok'), { date: '2026-11-20', offset: '+07:00' });
	assert.deepEqual(localDay(new Date('2026-11-20T17:00:00Z'), 'Asia/Bangkok'), { date: '2026-11-21', offset: '+07:00' });
});
test('the offset follows daylight saving time', () => {
	assert.deepEqual(localDay(new Date('2026-07-01T12:00:00Z'), 'America/New_York'), { date: '2026-07-01', offset: '-04:00' });
	assert.deepEqual(localDay(new Date('2026-01-15T03:00:00Z'), 'America/New_York'), { date: '2026-01-14', offset: '-05:00' });
	assert.deepEqual(localDay(now, 'UTC'), { date: '2026-11-21', offset: '+00:00' });
});
test('asks GitHub for the whole local day', async () => {
	let sent;
	const fetchImpl = async (url, init) => { sent = JSON.parse(init.body).variables; return reply(calendar([]))(); };
	await fetchTodayCount({ ...args, fetchImpl });
	assert.deepEqual(sent, { login: 'octocat', from: '2026-11-21T00:00:00+07:00', to: '2026-11-21T23:59:59+07:00' });
});
test('returns the count for today', async () => {
	const fetchImpl = reply(calendar([{ date: '2026-11-20', contributionCount: 17 }, { date: '2026-11-21', contributionCount: 2 }]));
	assert.equal(await fetchTodayCount({ ...args, fetchImpl }), 2);
});
test('missing day counts as zero', async () => {
	assert.equal(await fetchTodayCount({ ...args, fetchImpl: reply(calendar([])) }), 0);
});
test('graphql errors, null user, and http errors throw', async () => {
	await assert.rejects(fetchTodayCount({ ...args, fetchImpl: reply({ errors: [{ message: 'x' }] }) }));
	await assert.rejects(fetchTodayCount({ ...args, fetchImpl: reply({ data: { user: null } }) }));
	await assert.rejects(fetchTodayCount({ ...args, fetchImpl: reply({}, 502) }));
});
test('rejects an invalid --count', async () => {
	for (const bad of ['-1', '2.5', 'abc']) await assert.rejects(main(['--count', bad, '--out', 'x.svg'], {}), /non-negative integer/);
	await assert.rejects(main(['--count=-1', '--out', 'x.svg'], {}), /non-negative integer/);
});
test('rejects an unknown time zone before writing', async () => {
	const out = tmpOut();
	await assert.rejects(main(['--count', '3', '--timezone', 'Mars/Olympus', '--out', out], {}), /time zone/);
	assert.equal(existsSync(out), false);
});
test('without a login it fails and writes nothing', async () => {
	const out = tmpOut();
	await assert.rejects(main(['--out', out], { GITHUB_TOKEN: 't' }), /login/);
	assert.equal(existsSync(out), false);
});
test('without a token it fails and writes nothing', async () => {
	const out = tmpOut();
	await assert.rejects(main(['--out', out, '--login', 'octocat'], {}), /GITHUB_TOKEN/);
	assert.equal(existsSync(out), false);
});
