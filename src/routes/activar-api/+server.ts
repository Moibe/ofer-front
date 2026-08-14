import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { activarApi, apiSigueViva } from '$lib/server/apiSidecar';

export async function POST() {
	if (!dev) {
		return json({ ok: false, error: 'Solo disponible en desarrollo.' }, { status: 403 });
	}
	if (await apiSigueViva()) {
		return json({ ok: true, ya_activa: true });
	}
	const resultado = activarApi();
	if (!resultado.ok) {
		return json({ ok: false, error: resultado.detalle }, { status: 500 });
	}
	return json({ ok: true, ya_activa: false });
}
