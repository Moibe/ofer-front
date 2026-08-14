<script lang="ts">
	import { onMount } from 'svelte';
	import {
		api,
		ErrorApi,
		esApiInalcanzable,
		type InfoPaises,
		type LoteHistorial,
		type NombreProveedor,
		type ResultadoHistorial,
		type ResultadoPais
	} from '$lib/api';
	import { formatoFecha } from '$lib/fecha';
	import AvisoApi from '$lib/AvisoApi.svelte';
	import Bandera from '$lib/Bandera.svelte';

	const ETIQUETA_PROVEEDOR: Record<NombreProveedor, string> = {
		tor: 'Tor (gratis)',
		proxy: 'Proxy (de paga)'
	};

	let capturaAbierta = $state<{ url: string; etiqueta: string } | null>(null);

	function verCaptura(loteId: string, r: ResultadoHistorial) {
		if (!r.tiene_captura) return;
		capturaAbierta = { url: api.capturaUrl(loteId, r.pais), etiqueta: r.etiqueta };
	}

	let url = $state('');
	let info = $state<InfoPaises | null>(null);
	let proveedor = $state<NombreProveedor>('tor');
	let seleccionados = $state<Set<string>>(new Set());
	let resultados = $state<ResultadoPais[]>([]);
	let historial = $state<LoteHistorial[]>([]);

	let cargando = $state(false);
	let error = $state('');
	let apiOffline = $state(false);

	let paises = $derived(info?.paises ?? []);
	let cobertura = $derived(info?.proveedores?.[proveedor]?.cobertura ?? {});
	let proveedorActual = $derived(info?.proveedores?.[proveedor] ?? null);
	let cuantosDisponibles = $derived(paises.filter((p) => cobertura[p.codigo]?.disponible).length);

	function manejarError(e: unknown, mensajeDefault: string) {
		if (e instanceof ErrorApi) {
			error = e.message;
			apiOffline = esApiInalcanzable(e);
		} else {
			error = mensajeDefault;
			apiOffline = false;
		}
	}

	async function cargarHistorial() {
		historial = (await api.historial()).lotes;
	}

	/** Marca todos los países que ESE proveedor sí puede sacar. */
	function seleccionarDisponibles(prov: NombreProveedor) {
		const cob = info?.proveedores?.[prov]?.cobertura ?? {};
		seleccionados = new Set(
			(info?.paises ?? []).filter((p) => cob[p.codigo]?.disponible).map((p) => p.codigo)
		);
	}

	async function cargarPagina() {
		const [resp] = await Promise.all([api.paisesDisponibles(), cargarHistorial()]);
		info = resp;
		// Si el default del backend no está listo (ej. Tor sin instalar),
		// caer al otro que sí lo esté en vez de dejar la página inservible.
		const preferido = resp.default;
		proveedor = resp.proveedores?.[preferido]?.listo
			? preferido
			: ((Object.keys(resp.proveedores ?? {}) as NombreProveedor[]).find(
					(p) => resp.proveedores[p].listo
				) ?? preferido);
		seleccionarDisponibles(proveedor);
		error = '';
		apiOffline = false;
	}

	onMount(async () => {
		try {
			await cargarPagina();
		} catch (e) {
			manejarError(e, 'Error inesperado cargando la página.');
		}
	});

	function cambiarProveedor(prov: NombreProveedor) {
		proveedor = prov;
		resultados = [];
		seleccionarDisponibles(prov);
	}

	function alternar(codigo: string) {
		if (!cobertura[codigo]?.disponible) return;
		const nuevo = new Set(seleccionados);
		if (nuevo.has(codigo)) {
			nuevo.delete(codigo);
		} else {
			nuevo.add(codigo);
		}
		seleccionados = nuevo;
	}

	function tituloPais(codigo: string): string {
		const c = cobertura[codigo];
		if (!c) return '';
		if (!c.disponible) {
			return proveedor === 'tor'
				? 'Tor no tiene ningún nodo de salida en este país.'
				: 'No disponible con este proveedor.';
		}
		if (!c.fiable && c.exits !== undefined) {
			return `Frágil: solo ${c.exits} nodo(s) de salida — puede fallar o ir lento.`;
		}
		return c.exits !== undefined ? `${c.exits} nodos de salida disponibles.` : 'Disponible.';
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
			const r = await api.revisarUrl(url.trim(), [...seleccionados], proveedor);
			resultados = r.resultados;
			await cargarHistorial();
		} catch (e) {
			manejarError(e, 'Error inesperado revisando la URL.');
		} finally {
			cargando = false;
		}
	}
</script>

<h1>Tester</h1>
<p class="subtitulo">Revisa cómo se ve una URL desde distintos países.</p>

{#if error}
	<AvisoApi mensaje={error} offline={apiOffline} onRetry={cargarPagina} />
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

	<div class="campo-label paises-label">Cómo salir a internet</div>
	<div class="proveedores">
		{#each Object.entries(info?.proveedores ?? {}) as [nombre, p] (nombre)}
			<label class="proveedor-opcion" class:activo={proveedor === nombre}>
				<input
					type="radio"
					name="proveedor"
					checked={proveedor === nombre}
					disabled={!p.listo}
					onchange={() => cambiarProveedor(nombre as NombreProveedor)}
				/>
				<span>{ETIQUETA_PROVEEDOR[nombre as NombreProveedor] ?? nombre}</span>
				{#if !p.listo}
					<span class="proveedor-motivo" title={p.motivo ?? ''}>no configurado</span>
				{/if}
			</label>
		{/each}
	</div>
	{#if proveedor === 'tor'}
		<p class="proveedor-nota">
			Tor es gratis pero solo tiene nodos de salida en {cuantosDisponibles} de {paises.length} países
			(casi ninguno en Latinoamérica), y algunos sitios bloquean sus IPs. Tarda ~10s por país.
		</p>
	{/if}

	<div class="campo-label paises-label">
		Países <span class="paises-conteo">({seleccionados.size}/{cuantosDisponibles} disponibles)</span>
	</div>
	<div class="paises-grid">
		{#each paises as p (p.codigo)}
			{@const c = cobertura[p.codigo]}
			<label
				class="pais-check"
				class:no-disponible={!c?.disponible}
				title={tituloPais(p.codigo)}
			>
				<input
					type="checkbox"
					checked={seleccionados.has(p.codigo)}
					disabled={!c?.disponible}
					onchange={() => alternar(p.codigo)}
				/>
				<Bandera codigo={p.codigo} />
				{p.etiqueta}
				{#if c?.disponible && !c.fiable}
					<span class="marca-fragil">⚠</span>
				{/if}
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
					<span class="resultado-titulo"><Bandera codigo={r.pais} />{r.etiqueta}</span>
					<span
						class="chip {r.error
							? 'status-error'
							: r.aviso
								? 'status-redirect'
								: claseStatus(r.status)}"
					>
						{r.error ? 'error' : r.aviso ? 'bloqueado' : (r.status ?? '—')}
					</span>
				</div>
				{#if r.error}
					<div class="resultado-error">{r.error}</div>
				{:else}
					{#if r.aviso}
						<div class="resultado-aviso">⚠ {r.aviso}</div>
					{/if}
					{#if r.screenshot_b64}
						<button
							type="button"
							class="resultado-shot-btn"
							onclick={() =>
								(capturaAbierta = {
									url: `data:image/jpeg;base64,${r.screenshot_b64}`,
									etiqueta: r.etiqueta
								})}
							aria-label="Ver captura de {r.etiqueta} en grande"
						>
							<img
								class="resultado-shot"
								src="data:image/jpeg;base64,{r.screenshot_b64}"
								alt="Captura de {r.etiqueta}"
							/>
						</button>
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
				<th>Vía</th>
				<th>Países</th>
			</tr>
		</thead>
		<tbody>
			{#each historial as lote (lote.lote_id)}
				<tr>
					<td class="hist-url">{lote.url}</td>
					<td>{formatoFecha(lote.creado_at)}</td>
					<td class="hist-proveedor">{lote.proveedor}</td>
					<td>
						<div class="hist-chips">
							{#each lote.resultados as r (r.pais)}
								<span
									class="chip chip-pais {r.error
										? 'status-error'
										: r.aviso
											? 'status-redirect'
											: claseStatus(r.status)}"
									title="{r.etiqueta}{r.error ? ': ' + r.error : ''}{r.aviso
										? ': ' + r.aviso
										: ''}{r.tiene_captura ? ' — clic en la bandera para ver la captura' : ''}"
								>
									{#if r.tiene_captura}
										<button
											type="button"
											class="bandera-btn"
											onclick={() => verCaptura(lote.lote_id, r)}
											aria-label="Ver captura de {r.etiqueta}"
										>
											<Bandera codigo={r.pais} size={14} />
										</button>
									{:else}
										<Bandera codigo={r.pais} size={14} />
									{/if}
									{r.pais}
									{r.error ? '×' : r.aviso ? '⚠' : r.status}
								</span>
							{/each}
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4" style="text-align: center; opacity: 0.6;">
						Todavía no hay revisiones.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && capturaAbierta) capturaAbierta = null;
	}}
/>

{#if capturaAbierta}
	<div
		class="modal-fondo"
		onclick={() => (capturaAbierta = null)}
		onkeydown={(e) => e.key === 'Escape' && (capturaAbierta = null)}
		role="presentation"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="modal-contenido"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="Captura de {capturaAbierta.etiqueta}"
			tabindex="-1"
		>
			<div class="modal-header">
				<span>{capturaAbierta.etiqueta}</span>
				<button class="control" onclick={() => (capturaAbierta = null)}>Cerrar</button>
			</div>
			<img class="modal-img" src={capturaAbierta.url} alt="Captura de {capturaAbierta.etiqueta}" />
		</div>
	</div>
{/if}

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

	.pais-check.no-disponible {
		opacity: 0.35;
		cursor: not-allowed;
		text-decoration: line-through;
	}

	.marca-fragil {
		color: #fde68a;
		font-size: 0.8rem;
	}

	.proveedores {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}

	.proveedor-opcion {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.proveedor-opcion.activo {
		background: rgba(37, 99, 235, 0.22);
		border-color: rgba(37, 99, 235, 0.5);
	}

	.proveedor-opcion:has(input:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.proveedor-motivo {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.proveedor-nota {
		margin: 0 0 0.5rem;
		font-size: 0.8rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.55);
	}

	.hist-proveedor {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.6);
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

	.resultado-titulo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.resultado-shot-btn {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
	}

	.resultado-shot {
		width: 100%;
		display: block;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		transition:
			border-color 0.16s ease,
			opacity 0.16s ease;
	}

	.resultado-shot-btn:hover .resultado-shot,
	.resultado-shot-btn:focus-visible .resultado-shot {
		border-color: rgba(37, 99, 235, 0.6);
		opacity: 0.85;
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

	.resultado-aviso {
		font-size: 0.8rem;
		line-height: 1.4;
		color: #fde68a;
		background: rgba(234, 179, 8, 0.12);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
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

	.chip-pais {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.bandera-btn {
		display: inline-flex;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		line-height: 0;
	}

	.bandera-btn :global(.bandera) {
		outline-offset: 2px;
	}

	.bandera-btn:hover :global(.bandera),
	.bandera-btn:focus-visible :global(.bandera) {
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.14),
			0 0 0 3px rgba(37, 99, 235, 0.55);
	}

	.modal-fondo {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: rgba(4, 10, 20, 0.65);
		backdrop-filter: blur(3px);
	}

	.modal-contenido {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: min(90vw, 900px);
		max-height: 90vh;
		padding: 1.25rem;
		background: rgba(15, 23, 42, 0.85);
		backdrop-filter: blur(8px) saturate(110%);
		border: 1px solid #fff;
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-weight: 700;
	}

	.modal-img {
		max-width: 100%;
		max-height: calc(90vh - 5rem);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		object-fit: contain;
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
