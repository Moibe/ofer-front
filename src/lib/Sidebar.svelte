<script lang="ts">
	import { page } from '$app/state';

	let {
		collapsed = false,
		toggleCollapsed
	}: {
		collapsed?: boolean;
		toggleCollapsed: () => void;
	} = $props();

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	let tiltX = $state(0);
	let tiltY = $state(0);
	let sidebarWidth = $state(240);

	$effect(() => {
		if (typeof document !== 'undefined' && !collapsed) {
			document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
		}
	});

	function handleMove(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
		const MAX = 1.2;
		tiltX = -ny * MAX;
		tiltY = nx * MAX;
	}

	function handleLeave() {
		tiltX = 0;
		tiltY = 0;
	}

	function handleCollapseClick(e: MouseEvent) {
		e.stopPropagation();
		tiltX = 0;
		tiltY = 0;
		toggleCollapsed();
	}
</script>

{#if !collapsed}
	<aside
		class="sidebar"
		style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
		bind:clientWidth={sidebarWidth}
		onmousemove={handleMove}
		onmouseleave={handleLeave}
	>
		<div class="brand">
			<span class="brand-dot" aria-hidden="true"></span>
			<span>ofer</span>
		</div>

		<nav>
			<a href="/" class="nav-item" aria-current={isActive('/') ? 'page' : undefined}>
				<svg
					class="nav-ico"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="8" y1="6" x2="21" y2="6" />
					<line x1="8" y1="12" x2="21" y2="12" />
					<line x1="8" y1="18" x2="21" y2="18" />
					<line x1="3" y1="6" x2="3" y2="6" />
					<line x1="3" y1="12" x2="3" y2="12" />
					<line x1="3" y1="18" x2="3" y2="18" />
				</svg>
				<span>Cola</span>
			</a>
			<a
				href="/tester"
				class="nav-item"
				aria-current={isActive('/tester') ? 'page' : undefined}
			>
				<svg
					class="nav-ico"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<span>Tester</span>
			</a>
		</nav>

		<div class="sidebar-footer">
			<button
				type="button"
				class="collapse-btn"
				onclick={handleCollapseClick}
				aria-label="Replegar barra"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>
		</div>
	</aside>
{:else}
	<button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label="Mostrar barra">
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	</button>
{/if}

<style>
	.sidebar {
		position: fixed;
		top: 1rem;
		left: 1rem;
		bottom: 1rem;
		box-sizing: border-box;
		width: max-content;
		min-width: 240px;
		max-width: 380px;
		padding: 1.3rem 1rem;
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.012);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(8px) saturate(110%);
		border: 1px solid #fff;
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.12);
		transition: transform 0.18s ease-out;
		will-change: transform;
		user-select: none;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0 0.35rem 1rem;
		margin-bottom: 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: 0.02em;
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.25);
	}

	.brand-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #2563eb;
		box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	nav::-webkit-scrollbar {
		display: none;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.95rem;
		color: rgba(255, 255, 255, 0.92);
		text-decoration: none;
		font-size: 0.95rem;
		letter-spacing: 0.01em;
		border-radius: 8px;
		border: 1px solid transparent;
		text-shadow:
			0 0 8px rgba(255, 255, 255, 0.22),
			0 0 18px rgba(255, 255, 255, 0.1);
		transition:
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.nav-ico {
		width: 17px;
		height: 17px;
		flex-shrink: 0;
		opacity: 0.9;
	}

	.nav-item:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.nav-item[aria-current='page'] {
		color: #fff;
		background: rgba(37, 99, 235, 0.22);
		border-color: rgba(37, 99, 235, 0.5);
		box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.18) inset;
	}

	.sidebar-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.collapse-btn,
	.reveal-handle {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		padding: 0.4rem 0.5rem;
		color: rgba(255, 255, 255, 0.85);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font: inherit;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease;
	}

	.collapse-btn:hover,
	.reveal-handle:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.24);
		color: #fff;
	}

	.reveal-handle {
		position: fixed;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.55rem 0.45rem;
		border-radius: 12px;
		border: 1px solid #fff;
		background: rgba(255, 255, 255, 0.012);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(8px) saturate(110%);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.12);
		z-index: 10;
	}
</style>
