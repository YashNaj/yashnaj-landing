import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const code = readFileSync('src/app.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1];

type Opts = { stored?: string | null; blocked?: boolean; traverseBack?: boolean };
function boot({ stored = null, blocked = false, traverseBack = false }: Opts = {}) {
	const store = new Map<string, string>(stored ? [['vt-dir', stored]] : []);
	const sessionStorage = {
		getItem: (k: string) => { if (blocked) throw new Error('blocked'); return store.get(k) ?? null; },
		setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); store.set(k, v); },
		removeItem: (k: string) => { if (blocked) throw new Error('blocked'); store.delete(k); }
	};
	const handlers: Record<string, (e: any) => void> = {};
	const document = {
		documentElement: { classList: { add() {}, remove() {}, contains: () => true } },
		querySelector: () => null,
		referrer: '',
		addEventListener: (t: string, f: any) => (handlers['doc:' + t] = f)
	};
	const window = { addEventListener: (t: string, f: any) => (handlers['win:' + t] = f), navigation: undefined as any };
	const navigation = traverseBack ? { activation: { navigationType: 'traverse', from: { index: 2 }, entry: { index: 1 } } } : { activation: { navigationType: 'push', from: { index: 1 }, entry: { index: 2 } } };
	window.navigation = navigation;
	new Function('window', 'document', 'performance', 'location', 'navigation', 'sessionStorage', 'setTimeout', code)(
		window, document, { getEntriesByType: () => [] }, { origin: 'https://yashnaj.dev', pathname: '/work/myne' }, navigation, sessionStorage, () => {}
	);
	const reveal = (withTransition = true) => {
		const types = new Set<string>();
		handlers['win:pagereveal']({ viewTransition: withTransition ? { types } : null });
		return [...types];
	};
	const click = (dir: string | null, mods: Partial<MouseEvent> = {}) =>
		handlers['doc:click']({ button: 0, defaultPrevented: false, ...mods, target: { closest: () => (dir ? { getAttribute: () => dir } : null) } });
	return { store, reveal, click };
}

describe('view-transition direction hand-off', () => {
	it('push navigation is forward, Back traversal is back', () => {
		expect(boot().reveal()).toEqual(['forward']);
		expect(boot({ traverseBack: true }).reveal()).toEqual(['back']);
	});
	it('a stored direction wins once, then is cleared', () => {
		const b = boot({ stored: 'next' });
		expect(b.reveal()).toEqual(['next']);
		expect(b.store.has('vt-dir')).toBe(false);
		expect(boot({ stored: 'prev' }).reveal()).toEqual(['prev']);
	});
	it('clears a stored direction even when the arrival has no view transition', () => {
		const b = boot({ stored: 'next' });
		expect(b.reveal(false)).toEqual([]);
		expect(b.store.has('vt-dir')).toBe(false);
	});
	it('a plain click on a [data-vt-dir] link stores its direction', () => {
		const b = boot();
		b.click('next');
		expect(b.store.get('vt-dir')).toBe('next');
	});
	it('ignores modified, non-primary, prevented and unrelated clicks', () => {
		for (const mods of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
			const b = boot();
			b.click('next', mods as Partial<MouseEvent>);
			expect(b.store.has('vt-dir'), JSON.stringify(mods)).toBe(false);
		}
		const b = boot();
		b.click(null);
		expect(b.store.has('vt-dir')).toBe(false);
	});
	it('blocked storage falls back to forward/back without throwing', () => {
		const b = boot({ blocked: true });
		expect(() => b.click('next')).not.toThrow();
		expect(b.reveal()).toEqual(['forward']);
	});
});
