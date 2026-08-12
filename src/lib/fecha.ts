export function formatoFecha(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString('es-MX', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}
