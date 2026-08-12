<script lang="ts">
	import '@fontsource/roboto/400.css';
	import '@fontsource/roboto/700.css';
	import Sidebar from '$lib/Sidebar.svelte';

	let { children } = $props();
	let collapsed = $state(false);

	function withTransition(fn: () => void) {
		if (typeof document !== 'undefined' && 'startViewTransition' in document) {
			(
				document as unknown as { startViewTransition: (cb: () => void) => void }
			).startViewTransition(fn);
		} else {
			fn();
		}
	}

	function toggleCollapsed() {
		withTransition(() => {
			collapsed = !collapsed;
		});
	}
</script>

<Sidebar {collapsed} {toggleCollapsed} />
<main class={collapsed ? 'collapsed' : ''}>
	<div class="work-scroll">
		{@render children()}
	</div>
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}

	:global(body) {
		min-height: 100vh;
		/* `fixed` es obligatorio: sin el, el gradiente se re-pinta por
		   scroll-container y el glass "salta". */
		background: linear-gradient(135deg, #0a1929 0%, #2563eb 100%);
		background-attachment: fixed;
		color: rgba(255, 255, 255, 0.95);
		font-family: 'Roboto', sans-serif;
	}

	:global(*) {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.45) transparent;
	}
	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.45);
		border-radius: 999px;
		border: 2px solid transparent;
		background-clip: padding-box;
	}

	main {
		position: fixed;
		top: 1rem;
		right: 1rem;
		bottom: 1rem;
		left: calc(var(--sidebar-width, 240px) + 2rem);
		box-sizing: border-box;
		overflow: hidden;

		background: rgba(255, 255, 255, 0.012);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(8px) saturate(110%);
		border: 1px solid #fff;
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.12);
		transition: left 0.22s ease-out;
	}

	main.collapsed {
		left: 2rem;
	}

	.work-scroll {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 1.5rem 2rem;
		box-sizing: border-box;
	}

	:global(h1) {
		margin: 0 0 0.35rem;
		font-size: 1.5rem;
		font-weight: 700;
	}

	:global(.subtitulo) {
		margin: 0 0 1.25rem;
		color: rgba(255, 255, 255, 0.62);
		font-size: 0.88rem;
		font-weight: 400;
	}

	:global(.card) {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		padding: 1rem 1.25rem;
	}

	:global(button.control),
	:global(input.control) {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.9rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.92);
		font-family: inherit;
		font-size: 0.9rem;
		outline: none;
		transition:
			background-color 0.16s ease,
			border-color 0.16s ease;
	}

	:global(button.control) {
		cursor: pointer;
	}

	:global(button.control:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.3);
	}

	:global(button.control:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
	}

	:global(button.control.primario) {
		background: rgba(37, 99, 235, 0.4);
		border-color: rgba(255, 255, 255, 0.3);
	}

	:global(button.control.primario:hover:not(:disabled)) {
		background: rgba(37, 99, 235, 0.6);
	}

	:global(button.control.peligro:hover:not(:disabled)) {
		background: rgba(248, 113, 113, 0.28);
		border-color: rgba(248, 113, 113, 0.5);
	}

	:global(input.control) {
		width: 5rem;
	}

	:global(.aviso) {
		padding: 1rem 1.25rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(15, 23, 42, 0.55);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	:global(.aviso.error) {
		border-color: rgba(248, 113, 113, 0.45);
		background: rgba(69, 10, 10, 0.4);
	}

	:global(.chip) {
		display: inline-block;
		padding: 0.15rem 0.55rem;
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	:global(.chip.available) {
		background: rgba(34, 197, 94, 0.22);
		color: #86efac;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.chip.retrieved) {
		background: rgba(234, 179, 8, 0.22);
		color: #fde68a;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.chip.used) {
		background: rgba(148, 163, 184, 0.22);
		color: #cbd5e1;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	@media (max-width: 620px) {
		.work-scroll {
			padding: 1rem;
		}
	}
</style>
