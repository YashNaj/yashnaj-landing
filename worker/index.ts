// Runs only for /api/* (wrangler.jsonc run_worker_first); every other path is the static site.
import { BUDGETS, NEEDS, QUOTE_LIMITS } from '../src/lib/data/services';

export interface Env {
	ASSETS: { fetch(req: Request): Promise<Response> };
	BREVO_API_KEY: string;
	TURNSTILE_SECRET: string;
}

type Fields = { name: string; business: string; email: string; phone: string; needs: string[]; budget: string; message: string };
type Body = { ok: true } | { ok: false; error: 'invalid' | 'turnstile' | 'send'; fields?: Record<string, string> };

const INBOX = 'yashnaj@proton.me';
const FROM = { name: 'Yashnaj.dev quotes', email: 'quotes@yashnaj.dev' };
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT = 10_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEED_LABEL = new Map<string, string>(NEEDS.map((n) => [n.id, n.label]));

function validate(form: FormData): { fields: Fields; errors: Record<string, string> } {
	const s = (k: string) => String(form.get(k) ?? '').trim();
	const fields: Fields = {
		name: s('name'),
		business: s('business'),
		email: s('email'),
		phone: s('phone'),
		needs: form.getAll('need').map(String),
		budget: s('budget'),
		message: s('message')
	};
	const errors: Record<string, string> = {};
	if (!fields.name) errors.name = 'Please add your name.';
	if (!fields.email) errors.email = 'Please add your email.';
	else if (!EMAIL.test(fields.email)) errors.email = 'Enter a valid email.';
	for (const k of ['name', 'business', 'email', 'phone', 'message'] as const) {
		if (!errors[k] && fields[k].length > QUOTE_LIMITS[k]) errors[k] = `Keep this under ${QUOTE_LIMITS[k]} characters.`;
	}
	if (!fields.needs.length || fields.needs.some((n) => !NEED_LABEL.has(n))) errors.need = 'Pick what you need.';
	if (fields.budget && !(BUDGETS as readonly string[]).includes(fields.budget)) errors.budget = 'Pick a budget range.';
	return { fields, errors };
}

async function verifyTurnstile(token: string, ip: string | null, secret: string): Promise<boolean> {
	if (!token) return false;
	const body = new FormData();
	body.append('secret', secret);
	body.append('response', token);
	if (ip) body.append('remoteip', ip);
	try {
		const r = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT) });
		return ((await r.json()) as { success?: boolean }).success === true;
	} catch {
		return false;
	}
}

async function send(f: Fields, key: string): Promise<boolean> {
	const needs = f.needs.map((n) => NEED_LABEL.get(n)).join(', ');
	const subject = `Quote request: ${needs} — ${f.business || f.name}`.replace(/[\r\n]+/g, ' ');
	const text = [
		`Name: ${f.name}`,
		`Business: ${f.business || '—'}`,
		`Email: ${f.email}`,
		`Phone: ${f.phone || '—'}`,
		`Needs: ${needs}`,
		`Budget: ${f.budget || '—'}`,
		'',
		f.message || '(no message)'
	].join('\n');
	try {
		// Brevo transactional API: plain text only, so nothing the lead typed is ever rendered as HTML
		const r = await fetch('https://api.brevo.com/v3/smtp/email', {
			method: 'POST',
			headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ sender: FROM, to: [{ email: INBOX }], replyTo: { email: f.email }, subject, textContent: text }),
			signal: AbortSignal.timeout(TIMEOUT)
		});
		return r.ok;
	} catch {
		return false;
	}
}

function reply(req: Request, status: number, body: Body): Response {
	if ((req.headers.get('accept') ?? '').includes('application/json')) return Response.json(body, { status });
	// no-JS form post: land on a static result page
	const to = new URL(body.ok ? '/services/sent' : '/services/error', req.url);
	return new Response(null, { status: 303, headers: { Location: to.toString() } });
}

async function quote(req: Request, env: Env): Promise<Response> {
	if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return reply(req, 400, { ok: false, error: 'invalid' });
	}
	if (String(form.get('fax') ?? '') !== '') return reply(req, 200, { ok: true }); // honeypot: bots get a quiet success
	const { fields, errors } = validate(form);
	if (Object.keys(errors).length) return reply(req, 400, { ok: false, error: 'invalid', fields: errors });
	const token = String(form.get('cf-turnstile-response') ?? '');
	if (!(await verifyTurnstile(token, req.headers.get('CF-Connecting-IP'), env.TURNSTILE_SECRET))) {
		return reply(req, 403, { ok: false, error: 'turnstile' });
	}
	if (!(await send(fields, env.BREVO_API_KEY))) return reply(req, 502, { ok: false, error: 'send' });
	return reply(req, 200, { ok: true });
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(req.url);
		if (pathname === '/api/quote') return quote(req, env);
		if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
		return env.ASSETS.fetch(req);
	}
};
