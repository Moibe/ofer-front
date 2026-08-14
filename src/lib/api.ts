/**
 * Cliente de la API de `ofer` (cola de usernames generados).
 *
 * En dev, `BASE` es `/api` y Vite lo proxea al FastAPI (ver vite.config.ts),
 * asi que no hay CORS que pelear. En produccion se define `PUBLIC_API_URL`.
 */

import { PUBLIC_API_URL } from '$env/static/public';

const BASE = PUBLIC_API_URL || '/api';

export type Estado = 'available' | 'retrieved' | 'used';

export interface Username {
	username: string;
	status: Estado;
	generated_at: string;
	retrieved_at: string | null;
	used_at: string | null;
}

export interface Estadisticas {
	available?: number;
	retrieved?: number;
	used?: number;
	total: number;
}

export interface Pais {
	codigo: string;
	etiqueta: string;
}

export type NombreProveedor = 'tor' | 'proxy';

export interface CoberturaPais {
	disponible: boolean;
	fiable: boolean;
	/** Solo lo reporta Tor: cuántos nodos de salida vivos hay en ese país. */
	exits?: number;
}

export interface Proveedor {
	listo: boolean;
	motivo: string | null;
	gratis: boolean;
	cobertura: Record<string, CoberturaPais>;
}

export interface InfoPaises {
	paises: Pais[];
	default: NombreProveedor;
	proveedores: Record<NombreProveedor, Proveedor>;
}

export interface ResultadoPais {
	pais: string;
	etiqueta: string;
	status: number | null;
	url_final: string | null;
	screenshot_b64: string | null;
	error: string | null;
	/** Sí hubo captura, pero lo que se ve no es la página real (ej. muro anti-bot). */
	aviso: string | null;
}

export interface ResultadoHistorial {
	pais: string;
	etiqueta: string;
	status: number | null;
	url_final: string | null;
	error: string | null;
	aviso: string | null;
	tiene_captura: boolean;
}

export interface LoteHistorial {
	lote_id: string;
	url: string;
	creado_at: string;
	proveedor: NombreProveedor;
	resultados: ResultadoHistorial[];
}

export class ErrorApi extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'ErrorApi';
	}
}

// status 0: el fetch nunca llegó a nada (típico en prod, con PUBLIC_API_URL
// directo al backend). status 502: en dev, el proxy de Vite SÍ responde
// (no truena el fetch) pero con Bad Gateway porque no pudo alcanzar el
// backend real - mismo significado ("no está corriendo"), distinto síntoma.
export function esApiInalcanzable(e: unknown): boolean {
	return e instanceof ErrorApi && (e.status === 0 || e.status === 502);
}

async function peticion<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T> {
	let respuesta: Response;
	try {
		respuesta = await fetch(`${BASE}${ruta}`, {
			method: metodo,
			...(cuerpo !== undefined
				? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }
				: {})
		});
	} catch {
		throw new ErrorApi(`No se pudo contactar la API en ${BASE}. ¿Está corriendo el backend?`, 0);
	}
	if (!respuesta.ok) {
		const detalle = await respuesta.json().catch(() => null);
		throw new ErrorApi(detalle?.detail ?? `La API respondió ${respuesta.status}`, respuesta.status);
	}
	return respuesta.json() as Promise<T>;
}

const pedir = <T>(ruta: string) => peticion<T>('GET', ruta);
const enviar = <T>(ruta: string, cuerpo?: unknown) => peticion<T>('POST', ruta, cuerpo);

export const api = {
	salud: () => pedir<{ ok: boolean }>('/health'),

	estadisticas: () => pedir<Estadisticas>('/estadisticas'),

	usernames: (status?: Estado, limite = 200) =>
		pedir<Username[]>(`/usernames?limit=${limite}${status ? `&status=${status}` : ''}`),

	siguiente: () => enviar<{ username: string; status: Estado }>('/siguiente'),

	marcarUsado: (username: string) =>
		enviar<{ username: string; status: Estado }>(`/marcar-usado/${encodeURIComponent(username)}`),

	liberar: (username: string) =>
		enviar<{ username: string; status: Estado }>(`/liberar/${encodeURIComponent(username)}`),

	generar: (n: number) =>
		enviar<{ solicitados: number; generados: number; insertados_nuevos: number }>(
			`/generar?n=${n}`
		),

	agregar: (usernames: string[]) =>
		enviar<{ solicitados: number; insertados_nuevos: number }>('/agregar', { usernames }),

	paisesDisponibles: () => pedir<InfoPaises>('/geo/paises'),

	revisarUrl: (url: string, paises?: string[], proveedor?: NombreProveedor) =>
		enviar<{ lote_id: string; proveedor: NombreProveedor; resultados: ResultadoPais[] }>(
			'/geo/revisar',
			{ url, paises, proveedor }
		),

	historial: (limite = 30) => pedir<{ lotes: LoteHistorial[] }>(`/geo/historial?limit=${limite}`),

	capturaUrl: (loteId: string, pais: string) =>
		`${BASE}/geo/captura/${encodeURIComponent(loteId)}/${encodeURIComponent(pais)}`
};
