/**
 * Still from the Selena Systems public site, shown beside the auth form.
 *
 * Each variant fixes its own aspect ratio so the crop is the same at every
 * window size: a panel sized by its container's height crops a 16:9 frame by
 * an amount nobody chose, and the subject can fall outside it entirely.
 */

const SCENES = {
	lens: {
		image: "/media/cinematic/lens.webp",
		alt: "A lens barrel standing on a dark surface, its glass lit from within",
		eyebrow: "AI Visibility by Selena Systems",
		line: "A workspace for what AI systems say about your brand.",
	},
} as const;

export type AuthSceneName = keyof typeof SCENES;

interface AuthSceneProps {
	scene: AuthSceneName;
	variant: "panel" | "strip";
}

export function AuthScene({ scene, variant }: AuthSceneProps) {
	const { image, alt, eyebrow, line } = SCENES[scene];

	if (variant === "strip") {
		return (
			<div className="aspect-[21/9] overflow-hidden rounded-xl bg-[var(--selena-charcoal)]">
				<img src={image} alt={alt} className="size-full object-cover" fetchPriority="low" />
			</div>
		);
	}

	return (
		<figure className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[var(--selena-charcoal)]">
			<img src={image} alt={alt} className="absolute inset-0 size-full object-cover" />
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--selena-charcoal)]/90 to-transparent"
			/>
			<figcaption className="absolute inset-x-0 bottom-0 p-8 text-[var(--selena-ivory)]">
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--selena-copper)]">{eyebrow}</p>
				<p className="selena-heading mt-2 text-xl">{line}</p>
			</figcaption>
		</figure>
	);
}
