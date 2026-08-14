// Arranca el FastAPI hermano (ofer) a peticion del usuario, desde el propio
// server de SvelteKit. Mismos defaults que scripts/dev.mjs (el orquestador
// de `npm run dev`) pero independiente de el - este camino se dispara desde
// el boton "Activar" del aviso de error, no desde el arranque de npm.
import { spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { resolve } from 'node:path';

const API_DIR = resolve(process.cwd(), process.env.API_DIR ?? '../ofer');
const API_HOST = process.env.API_HOST ?? '127.0.0.1';
const API_PORT = process.env.API_PORT ?? '8020';
const HEALTH_PATH = process.env.API_HEALTH_PATH ?? '/health';
const ENTRYPOINT = process.env.API_ENTRYPOINT ?? 'api.app:app';
const LOG_PATH = resolve(API_DIR, 'output', 'activar-api.log');

function findPython(): string | null {
	const candidatos =
		process.platform === 'win32'
			? ['Scripts/python.exe', 'Scripts/python']
			: ['bin/python', 'bin/python3'];
	for (const rel of candidatos) {
		const p = resolve(API_DIR, '.venv', rel);
		if (existsSync(p)) return p;
	}
	return null;
}

export async function apiSigueViva(): Promise<boolean> {
	try {
		const r = await fetch(`http://${API_HOST}:${API_PORT}${HEALTH_PATH}`, {
			signal: AbortSignal.timeout(1500)
		});
		return r.ok;
	} catch {
		return false;
	}
}

export function activarApi(): { ok: boolean; detalle: string } {
	if (!existsSync(API_DIR)) {
		return { ok: false, detalle: `No existe ${API_DIR}.` };
	}
	const python = findPython();
	if (!python) {
		return { ok: false, detalle: `No encontré .venv en ${API_DIR}.` };
	}
	// stdio a un log (no 'ignore'): si uvicorn truena al arrancar (import roto,
	// puerto ocupado, etc.) el click de "Activar" no deberia fallar en silencio
	// sin dejar rastro de por que.
	const logFd = openSync(LOG_PATH, 'a');
	const hijo = spawn(
		python,
		['-m', 'uvicorn', ENTRYPOINT, '--host', API_HOST, '--port', String(API_PORT)],
		{ cwd: API_DIR, detached: true, stdio: ['ignore', logFd, logFd] }
	);
	hijo.unref();
	return { ok: true, detalle: 'arrancando' };
}
