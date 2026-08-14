<script lang="ts">
	import { onMount } from 'svelte';
	import {
		api,
		ErrorApi,
		esApiInalcanzable,
		type Estadisticas,
		type Estado,
		type Username
	} from '$lib/api';
	import { formatoFecha } from '$lib/fecha';
	import AvisoApi from '$lib/AvisoApi.svelte';

	let stats = $state<Estadisticas>({ total: 0 });
	let lista = $state<Username[]>([]);
	let filtro = $state<Estado | ''>('');

	let actual = $state<{ username: string; status: Estado } | null>(null);

	let cantidadGenerar = $state(50);
	let textoManual = $state('');

	let cargando = $state(false);
	let error = $state('');
	let apiOffline = $state(false);
	let aviso = $state('');

	function manejarError(e: unknown, mensajeDefault: string) {
		if (e instanceof ErrorApi) {
			error = e.message;
			apiOffline = esApiInalcanzable(e);
		} else {
			error = mensajeDefault;
			apiOffline = false;
		}
	}

	async function refrescar() {
		try {
			[stats, lista] = await Promise.all([
				api.estadisticas(),
				api.usernames(filtro || undefined)
			]);
			error = '';
			apiOffline = false;
		} catch (e) {
			manejarError(e, 'Error inesperado consultando la API.');
		}
	}

	async function generar() {
		cargando = true;
		aviso = '';
		try {
			const r = await api.generar(cantidadGenerar);
			aviso = `Generados ${r.generados}, ${r.insertados_nuevos} nuevos (el resto ya existía en la cola).`;
			await refrescar();
		} catch (e) {
			manejarError(e, 'Error inesperado generando.');
		} finally {
			cargando = false;
		}
	}

	async function agregarManual() {
		const usernames = textoManual
			.split('\n')
			.map((u) => u.trim())
			.filter(Boolean);
		if (usernames.length === 0) return;
		cargando = true;
		aviso = '';
		try {
			const r = await api.agregar(usernames);
			const duplicados = r.solicitados - r.insertados_nuevos;
			aviso = `Agregados ${r.insertados_nuevos} nuevos${duplicados > 0 ? ` (${duplicados} ya existían)` : ''}.`;
			textoManual = '';
			await refrescar();
		} catch (e) {
			manejarError(e, 'Error inesperado agregando usernames.');
		} finally {
			cargando = false;
		}
	}

	async function pedirSiguiente() {
		cargando = true;
		aviso = '';
		try {
			actual = await api.siguiente();
			await refrescar();
		} catch (e) {
			manejarError(e, 'Error inesperado pidiendo el siguiente.');
		} finally {
			cargando = false;
		}
	}

	async function marcarUsado() {
		if (!actual) return;
		cargando = true;
		try {
			await api.marcarUsado(actual.username);
			aviso = `"${actual.username}" marcado como usado.`;
			actual = null;
			await refrescar();
		} catch (e) {
			manejarError(e, 'Error inesperado marcando usado.');
		} finally {
			cargando = false;
		}
	}

	async function liberar() {
		if (!actual) return;
		cargando = true;
		try {
			await api.liberar(actual.username);
			aviso = `"${actual.username}" liberado de vuelta a disponibles.`;
			actual = null;
			await refrescar();
		} catch (e) {
			manejarError(e, 'Error inesperado liberando.');
		} finally {
			cargando = false;
		}
	}

	onMount(refrescar);
	$effect(() => {
		filtro;
		refrescar();
	});
</script>

<h1>ofer</h1>
<p class="subtitulo">Cola de usernames generados — pedir, confirmar, liberar.</p>

{#if error}
	<AvisoApi mensaje={error} offline={apiOffline} onRetry={refrescar} />
{/if}

<div class="stats-row">
	<div class="card stat">
		<span class="stat-valor">{stats.available ?? 0}</span>
		<span class="stat-etiqueta">disponibles</span>
	</div>
	<div class="card stat">
		<span class="stat-valor">{stats.retrieved ?? 0}</span>
		<span class="stat-etiqueta">pedidos, sin confirmar</span>
	</div>
	<div class="card stat">
		<span class="stat-valor">{stats.used ?? 0}</span>
		<span class="stat-etiqueta">usados</span>
	</div>
	<div class="card stat">
		<span class="stat-valor">{stats.total}</span>
		<span class="stat-etiqueta">total</span>
	</div>
</div>

<div class="card generar-row">
	<label>
		Generar
		<input class="control" type="number" min="1" max="5000" bind:value={cantidadGenerar} />
		más
	</label>
	<button class="control" onclick={generar} disabled={cargando}>Generar</button>
</div>

<div class="card manual">
	<label class="campo-label" for="manual-usernames">Agregar manualmente (uno por línea)</label>
	<textarea
		id="manual-usernames"
		class="control manual-textarea"
		rows="4"
		placeholder={'usuario1\nusuario2\nusuario3'}
		bind:value={textoManual}
	></textarea>
	<button class="control" onclick={agregarManual} disabled={cargando || !textoManual.trim()}>
		Agregar
	</button>
</div>

<div class="card actual">
	{#if actual}
		<div class="actual-nombre">{actual.username}</div>
		<div class="actual-botones">
			<button class="control primario" onclick={marcarUsado} disabled={cargando}>
				Marcar usado
			</button>
			<button class="control peligro" onclick={liberar} disabled={cargando}>
				Liberar (no lo usé)
			</button>
		</div>
	{:else}
		<button class="control primario" onclick={pedirSiguiente} disabled={cargando}>
			Pedir siguiente
		</button>
	{/if}
	{#if aviso}
		<div class="aviso-inline">{aviso}</div>
	{/if}
</div>

<div class="lista-header">
	<h2>Historial</h2>
	<select class="control" bind:value={filtro}>
		<option value="">Todos</option>
		<option value="available">Disponibles</option>
		<option value="retrieved">Pedidos</option>
		<option value="used">Usados</option>
	</select>
</div>

<div class="card tabla-wrap">
	<table>
		<thead>
			<tr>
				<th>Username</th>
				<th>Estado</th>
				<th>Generado</th>
				<th>Pedido</th>
				<th>Usado</th>
			</tr>
		</thead>
		<tbody>
			{#each lista as u (u.username)}
				<tr>
					<td class="mono">{u.username}</td>
					<td><span class="chip {u.status}">{u.status}</span></td>
					<td>{formatoFecha(u.generated_at)}</td>
					<td>{formatoFecha(u.retrieved_at)}</td>
					<td>{formatoFecha(u.used_at)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" style="text-align: center; opacity: 0.6;">
						No hay usernames todavía — genera algunos arriba.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.stats-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}

	.stat {
		flex: 1;
		min-width: 120px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.stat-valor {
		font-size: 1.8rem;
		font-weight: 700;
	}

	.stat-etiqueta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
	}

	.generar-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.generar-row label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.manual {
		margin-bottom: 1.25rem;
	}

	.campo-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.manual-textarea {
		display: block;
		width: 100%;
		margin-bottom: 0.75rem;
		font-family: 'Courier New', monospace;
		resize: vertical;
	}

	.actual {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		padding: 1.75rem 1.25rem;
		margin-bottom: 1.5rem;
	}

	.actual-nombre {
		font-size: 1.6rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
	}

	.actual-botones {
		display: flex;
		gap: 0.75rem;
	}

	.aviso-inline {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.65);
		text-align: center;
	}

	.lista-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.lista-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.tabla-wrap {
		padding: 0;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	th,
	td {
		text-align: left;
		padding: 0.6rem 1rem;
		white-space: nowrap;
	}

	th {
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.14);
	}

	tbody tr:not(:last-child) td {
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.mono {
		font-family: 'Courier New', monospace;
	}
</style>
