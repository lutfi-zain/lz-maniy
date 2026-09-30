<script lang="ts">
	import Tag from 'phosphor-svelte/lib/Tag';
	import ForkKnife from 'phosphor-svelte/lib/ForkKnife';
	import Coffee from 'phosphor-svelte/lib/Coffee';
	import Car from 'phosphor-svelte/lib/Car';
	import ShoppingCart from 'phosphor-svelte/lib/ShoppingCart';
	import Lightning from 'phosphor-svelte/lib/Lightning';
	import Pill from 'phosphor-svelte/lib/Pill';
	import FilmStrip from 'phosphor-svelte/lib/FilmStrip';
	import Book from 'phosphor-svelte/lib/Book';
	import Briefcase from 'phosphor-svelte/lib/Briefcase';
	import Gift from 'phosphor-svelte/lib/Gift';
	import Airplane from 'phosphor-svelte/lib/Airplane';
	import House from 'phosphor-svelte/lib/House';
	import TrendUp from 'phosphor-svelte/lib/TrendUp';
	import Wallet from 'phosphor-svelte/lib/Wallet';

	let {
		icon,
		class: className = 'size-4'
	}: {
		icon?: string | null;
		class?: string;
	} = $props();

	const iconMap: Record<string, typeof Tag> = {
		Tag,
		tag: Tag,
		ForkKnife,
		food: ForkKnife,
		'🍔': ForkKnife,
		Coffee,
		coffee: Coffee,
		'☕': Coffee,
		Car,
		car: Car,
		transport: Car,
		'🚗': Car,
		ShoppingCart,
		shopping: ShoppingCart,
		'🛒': ShoppingCart,
		Lightning,
		utilities: Lightning,
		'⚡': Lightning,
		Pill,
		health: Pill,
		'💊': Pill,
		FilmStrip,
		entertainment: FilmStrip,
		'🎬': FilmStrip,
		Book,
		education: Book,
		'📚': Book,
		Briefcase,
		work: Briefcase,
		salary: Briefcase,
		'💼': Briefcase,
		Gift,
		gift: Gift,
		'🎁': Gift,
		Airplane,
		travel: Airplane,
		'✈️': Airplane,
		House,
		house: House,
		home: House,
		'🏠': House,
		TrendUp,
		investment: TrendUp,
		'📈': TrendUp,
		Wallet,
		wallet: Wallet
	};

	const ResolvedComponent = $derived(icon && iconMap[icon] ? iconMap[icon] : Tag);
</script>

<ResolvedComponent class={className} weight="bold" />
