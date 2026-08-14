<script lang="ts">
	import { dev } from '$app/environment';
	import { api } from './api';

	let {
		mensaje,
		offline,
		onRetry
	}: {
		mensaje: string;
		offline: boolean;
		onRetry: () => void | Promise<void>;
	} = $props();

	let activando = $state(false);
	let nota = $state('');

	async function activar() {
		activando = true;
		nota = '';
		try {
			const r = await fetch('/activar-api', { method: 'POST' });
			const cuerpo = await r.json().catch(() => null);
			if (!r.ok) {
				nota = cuerpo?.error ?? 'No se pudo activar automáticamente.';
				return;
			}
			const hasta = Date.now() + 20_000;
			while (Date.now() < hasta) {
				try {
					await api.salud();
					await onRetry();
					return;
				} catch {
					await new Promise((res) => setTimeout(res, 1000));
				}
			}
			nota = 'Sigue sin responder — revisa la consola donde corre npm run dev.';
		} finally {
			activando = false;
		}
	}
</script>

<div class="aviso error aviso-api">
	<span>{mensaje}</span>
	{#if offline && dev}
		<button class="control" onclick={activar} disabled={activando}>
			{activando ? 'Activando…' : 'Activar'}
		</button>
	{/if}
</div>
{#if nota}
	<div class="nota-activar">{nota}</div>
{/if}

<style>
	.aviso-api {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}

	.nota-activar {
		margin-top: -0.75rem;
		margin-bottom: 1.25rem;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
