<script lang="ts">
	import { onMount } from 'svelte';
	import { api, ErrorApi, type LoteHistorial, type Pais, type ResultadoPais } from '$lib/api';
	import { formatoFecha } from '$lib/fecha';

	let url = $state('');
	let paisesDisponibles = $state<Pais[]>([]);
	let maxPaises = $state(5);
	let seleccionados = $state<Set<string>>(new Set());
	let resultados = $state<ResultadoPais[]>([]);
	let historial = $state<LoteHistorial[]>([]);

	let cargando = $state(false);
	let error = $state('');

	async function cargarHistorial() {
		historial = (await api.historial()).lotes;
	}

	onMount(async () => {
		try {
			const [paisesResp] = await Promise.all([api.paisesDisponibles(), cargarHistorial()]);
			paisesDisponibles = paisesResp.paises;
			maxPaises = paisesResp.max_paises;
			seleccionados = new Set(paisesResp.paises.slice(0, maxPaises).map((p) => p.codigo));
		} catch (e) {
			error = e instanceof ErrorApi ? e.message : 'Error inesperado cargando la página.';
		}
	});

	function alternar(codigo: string) {
		const nuevo = new Set(seleccionados);
		if (nuevo.has(codigo)) {
			nuevo.delete(codigo);
		} else {
			if (nuevo.size >= maxPaises) return;
			nuevo.add(codigo);
		}
		seleccionados = nuevo;
	}

	function claseStatus(status: number | null): string {
		if (status === null) return 'status-desconocido';
		if (status < 300) return 'status-ok';
		if (status < 400) return 'status-redirect';
		return 'status-error';
	}

	async function revisar() {
		if (!url.trim() || seleccionados.size === 0) return;
		cargando = true;
		error = '';
		resultados = [];
		try {
			const r = await api.revisarUrl(url.trim(), [...seleccionados]);
			resultados = r.resultados;
			await cargarHistorial();
		} catch (e) {
			error = e instanceof ErrorApi ? e.message : 'Error inesperado revisando la URL.';
		} finally {
			cargando = false;
		}
	}
</script>

<h1>Tester</h1>
<p class="subtitulo">Revisa cómo se ve una URL desde distintos países.</p>

{#if error}
	<div class="aviso error" style="margin-bottom: 1.25rem;">{error}</div>
{/if}

<div class="card config">
	<label class="campo-label" for="tester-url">URL</label>
	<input
		id="tester-url"
		class="control url-input"
		type="url"
		placeholder="https://..."
		bind:value={url}
	/>

	<div class="campo-label paises-label">
		Países <span class="paises-conteo">({seleccionados.size}/{maxPaises})</span>
	</div>
	<div class="paises-grid">
		{#each paisesDisponibles as p (p.codigo)}
			<label class="pais-check">
				<input
					type="checkbox"
					checked={seleccionados.has(p.codigo)}
					disabled={!seleccionados.has(p.codigo) && seleccionados.size >= maxPaises}
					onchange={() => alternar(p.codigo)}
				/>
				{p.etiqueta}
			</label>
		{/each}
	</div>

	<button
		class="control primario"
		onclick={revisar}
		disabled={cargando || !url.trim() || seleccionados.size === 0}
	>
		{cargando ? 'Revisando...' : 'Revisar'}
	</button>
</div>

{#if resultados.length > 0}
	<div class="resultados-grid">
		{#each resultados as r (r.pais)}
			<div class="card resultado">
				<div class="resultado-header">
					<span>{r.etiqueta}</span>
					<span class="chip {r.error ? 'status-error' : claseStatus(r.status)}">
						{r.error ? 'error' : r.status ?? '—'}
					</span>
				</div>
				{#if r.error}
					<div class="resultado-error">{r.error}</div>
				{:else}
					{#if r.screenshot_b64}
						<img
							class="resultado-shot"
							src="data:image/jpeg;base64,{r.screenshot_b64}"
							alt="Captura de {r.etiqueta}"
						/>
					{/if}
					<div class="resultado-url">{r.url_final}</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<div class="lista-header">
	<h2>Historial</h2>
</div>

<div class="card tabla-wrap">
	<table>
		<thead>
			<tr>
				<th>URL</th>
				<th>Fecha</th>
				<th>Países</th>
			</tr>
		</thead>
		<tbody>
			{#each historial as lote (lote.lote_id)}
				<tr>
					<td class="hist-url">{lote.url}</td>
					<td>{formatoFecha(lote.creado_at)}</td>
					<td>
						<div class="hist-chips">
							{#each lote.resultados as r (r.pais)}
								<span
									class="chip {r.error ? 'status-error' : claseStatus(r.status)}"
									title="{r.etiqueta}{r.error ? ': ' + r.error : ''}"
								>
									{r.pais} {r.error ? '×' : r.status}
								</span>
							{/each}
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" style="text-align: center; opacity: 0.6;">
						Todavía no hay revisiones.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.config {
		margin-bottom: 1.5rem;
	}

	.campo-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.url-input {
		width: 100%;
	}

	.paises-label {
		margin-top: 1.25rem;
	}

	.paises-conteo {
		color: rgba(255, 255, 255, 0.45);
	}

	.paises-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.25rem;
		margin-bottom: 1.25rem;
	}

	.pais-check {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.pais-check:has(input:disabled) {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.resultados-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.resultado {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.resultado-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-weight: 700;
	}

	.resultado-shot {
		width: 100%;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.14);
	}

	.resultado-url {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.6);
		word-break: break-all;
	}

	.resultado-error {
		font-size: 0.85rem;
		color: #fca5a5;
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

	.hist-url {
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hist-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip.status-ok {
		background: rgba(34, 197, 94, 0.22);
		color: #86efac;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.chip.status-redirect {
		background: rgba(234, 179, 8, 0.22);
		color: #fde68a;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.chip.status-error {
		background: rgba(248, 113, 113, 0.22);
		color: #fca5a5;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.chip.status-desconocido {
		background: rgba(148, 163, 184, 0.22);
		color: #cbd5e1;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
