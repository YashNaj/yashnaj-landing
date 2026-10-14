import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker/index';

const assets = vi.fn(async () => new Response('asset'));
const env = { ASSETS: { fetch: assets }, BREVO_API_KEY: 'br_test', TURNSTILE_SECRET: 'ts_test' };
const good: Record<string, string | string[]> = {
	name: 'Ana Ruiz',
	business: 'Ana’s Tacos',
	email: 'ana@example.com',
	phone: '',
	need: ['website'],
	budget: '$1,000–2,500',
	message: 'Need a site',
	fax: '',
	'cf-turnstile-response': 'tok'
};

function post(fields: Record<string, string | string[]>, accept = 'application/json') {
	const body = new URLSearchParams();
	for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) body.append(k, x);
	return new Request('https://yashnaj.dev/api/quote', {
		method: 'POST',
		body,
		headers: { accept, 'content-type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.7' }
	});
}

let calls: { url: string; init: RequestInit }[];
let turnstile: 'ok' | 'fail' | 'down';
let mailer: 'ok' | 'fail' | 'down';
beforeEach(() => {
	calls = [];
	turnstile = 'ok';
	mailer = 'ok';
	assets.mockClear();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit) => {
			calls.push({ url: String(url), init });
			const state = String(url).includes('challenges.cloudflare.com') ? turnstile : mailer;
			if (state === 'down') throw new TypeError('network down');
			if (String(url).includes('challenges.cloudflare.com'))
				return Response.json(state === 'ok' ? { success: true } : { success: false, 'error-codes': ['invalid-input-secret'] });
			return state === 'ok'
				? new Response('{"messageId":"<m@brevo>"}', { status: 201 })
				: Response.json({ code: 'unauthorized', message: 'Key not found' }, { status: 401 });
		})
	);
});
afterEach(() => vi.unstubAllGlobals());

const sendCall = () => calls.find((c) => c.url === 'https://api.brevo.com/v3/smtp/email');

describe('POST /api/quote', () => {
	it('emails a valid quote to the inbox, reply-to the lead', async () => {
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		const ts = calls.find((c) => c.url.includes('challenges.cloudflare.com'))!;
		const tsBody = ts.init.body as FormData;
		expect([tsBody.get('secret'), tsBody.get('response'), tsBody.get('remoteip')]).toEqual(['ts_test', 'tok', '203.0.113.7']);
		const r = sendCall()!;
		expect((r.init.headers as Record<string, string>)['api-key']).toBe('br_test');
		const mail = JSON.parse(String(r.init.body));
		expect(mail.sender).toEqual({ name: 'Yashnaj.dev quotes', email: 'quotes@send.yashnaj.dev' });
		expect(mail.to).toEqual([{ email: 'yashnaj@proton.me' }]);
		expect(mail.replyTo).toEqual({ email: 'ana@example.com' });
		expect(mail.subject).toBe('Quote request: Website — Ana’s Tacos');
		expect(mail.textContent).toContain('Business: Ana’s Tacos');
		expect(mail.textContent).toContain('Budget: $1,000–2,500');
		expect(mail.textContent).toContain('Need a site');
	});

	it('rejects missing required fields with per-field messages and calls nothing', async () => {
		const res = await worker.fetch(post({ ...good, name: ' ', email: '', need: [] }), env);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('invalid');
		expect(Object.keys(body.fields).sort()).toEqual(['email', 'name', 'need']);
		expect(calls).toEqual([]);
	});

	it('rejects a bad email, over-long fields, unknown needs and budgets', async () => {
		const res = await worker.fetch(
			post({ ...good, email: 'ana@', message: 'x'.repeat(5001), phone: '1'.repeat(41), need: ['rocket'], budget: '$1M' }),
			env
		);
		const body = await res.json();
		expect(Object.keys(body.fields).sort()).toEqual(['budget', 'email', 'message', 'need', 'phone']);
		expect(calls).toEqual([]);
	});

	it('keeps hostile input as plain text and the subject on one line', async () => {
		const res = await worker.fetch(post({ ...good, business: 'Evil\r\nBcc: x@y.z', message: '<script>alert(1)</script>\n"quoted"' }), env);
		expect(res.status).toBe(200);
		const mail = JSON.parse(String(sendCall()!.init.body));
		expect(mail.subject).not.toMatch(/[\r\n]/);
		expect(mail.textContent).toContain('<script>alert(1)</script>\n"quoted"');
		expect(mail.htmlContent).toBeUndefined();
	});

	it('a filled honeypot gets a quiet success and sends nothing', async () => {
		const res = await worker.fetch(post({ ...good, fax: '555' }), env);
		expect(await res.json()).toEqual({ ok: true });
		expect(calls).toEqual([]);
	});

	it('a failed or missing spam check is a 403 and sends nothing', async () => {
		turnstile = 'fail';
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe('turnstile');
		expect(sendCall()).toBeUndefined();
		const none = await worker.fetch(post({ ...good, 'cf-turnstile-response': '' }), env);
		expect(none.status).toBe(403);
	});

	it('an email-service rejection or network error is a 502', async () => {
		mailer = 'fail';
		expect((await worker.fetch(post(good), env)).status).toBe(502);
		mailer = 'down';
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(502);
		expect((await res.json()).error).toBe('send');
		turnstile = 'down';
		expect((await worker.fetch(post(good), env)).status).toBe(403);
	});

	it('a form post without JS redirects to the static result pages', async () => {
		const ok = await worker.fetch(post(good, 'text/html'), env);
		expect([ok.status, ok.headers.get('location')]).toEqual([303, 'https://yashnaj.dev/services/sent']);
		turnstile = 'fail';
		const bad = await worker.fetch(post(good, 'text/html'), env);
		expect([bad.status, bad.headers.get('location')]).toEqual([303, 'https://yashnaj.dev/services/error']);
	});
});

describe('failure logging (error codes only, never lead data)', () => {
	it('logs why Turnstile or Brevo refused, without the lead’s details', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		turnstile = 'fail';
		await worker.fetch(post(good), env);
		turnstile = 'ok';
		mailer = 'fail';
		await worker.fetch(post(good), env);
		const lines = log.mock.calls.map((c) => c.join(' '));
		expect(lines).toEqual(['quote: turnstile refused invalid-input-secret', 'quote: brevo refused 401 unauthorized']);
		expect(lines.join(' ')).not.toMatch(/ana|Ruiz|Tacos|tok|ts_test|br_test/i);
		log.mockRestore();
	});
});

describe('failure logging for paths that never reach a verdict', () => {
	it('logs a missing token and an unreachable or non-JSON siteverify', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		await worker.fetch(post({ ...good, 'cf-turnstile-response': '' }), env);
		turnstile = 'down';
		await worker.fetch(post(good), env);
		expect(log.mock.calls.map((c) => c.join(' '))).toEqual(['quote: turnstile no-token', 'quote: turnstile unreachable TypeError']);
		log.mockRestore();
	});
});

describe('secrets pasted with stray whitespace', () => {
	it('trims both secrets before using them', async () => {
		const res = await worker.fetch(post(good), { ...env, TURNSTILE_SECRET: ' ts_test\n', BREVO_API_KEY: 'br_test\n' });
		expect(res.status).toBe(200);
		const ts = calls.find((c) => c.url.includes('challenges.cloudflare.com'))!;
		expect((ts.init.body as FormData).get('secret')).toBe('ts_test');
		expect((sendCall()!.init.headers as Record<string, string>)['api-key']).toBe('br_test');
	});
});

describe('routing', () => {
	it('only POST is allowed on /api/quote; other /api paths 404', async () => {
		const get = await worker.fetch(new Request('https://yashnaj.dev/api/quote'), env);
		expect([get.status, get.headers.get('allow')]).toEqual([405, 'POST']);
		expect((await worker.fetch(new Request('https://yashnaj.dev/api/nope'), env)).status).toBe(404);
		expect(assets).not.toHaveBeenCalled();
	});
	it('everything else is served from the static assets', async () => {
		const res = await worker.fetch(new Request('https://yashnaj.dev/services'), env);
		expect(await res.text()).toBe('asset');
		expect(assets).toHaveBeenCalledOnce();
	});
});
