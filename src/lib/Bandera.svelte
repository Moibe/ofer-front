<script lang="ts">
	// SVG real (flag-icons, MIT), no emoji: Windows no trae fuente de
	// banderas-emoji instalada y las muestra como texto plano ("DE", "US"...),
	// asi que el emoji no serviria para nada aqui.
	let { codigo, size = 18 }: { codigo: string; size?: number } = $props();
</script>

<img class="bandera" src="/flags/{codigo}.svg" width={size} height={size * 0.75} alt="" loading="lazy" />

<style>
	.bandera {
		display: inline-block;
		flex-shrink: 0;
		border-radius: 2px;
		vertical-align: middle;
		object-fit: cover;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
	}
</style>
