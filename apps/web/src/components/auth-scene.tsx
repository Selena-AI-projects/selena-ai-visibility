/**
 * Cinematic side panel for the auth pages.
 *
 * Carries one short, silent loop from the Selena Systems public site so the
 * workspace entrance speaks the same visual language as the site. Poster
 * first: the form never waits on the video. The loop mounts after hydration
 * and stays hidden when the visitor prefers reduced motion.
 */

import { useEffect, useRef, useState } from "react";

const SCENES = {
	doors: {
		poster: "/media/cinematic/doors.webp",
		video: "/media/cinematic/doors-loop.mp4",
		alt: "Two lit doorways at the end of a dark corridor",
		eyebrow: "AI Visibility by Selena Systems",
		line: "Every report inside is dated and sourced.",
	},
} as const;

export type AuthSceneName = keyof typeof SCENES;

interface AuthSceneProps {
	scene: AuthSceneName;
	/** `panel` fills a column on wide screens; `strip` is the slim poster above the card on small screens. */
	variant: "panel" | "strip";
}

export function AuthScene({ scene, variant }: AuthSceneProps) {
	const { poster, video, alt, eyebrow, line } = SCENES[scene];

	if (variant === "strip") {
		return (
			<div className="overflow-hidden rounded-xl bg-[var(--selena-charcoal)] aspect-[21/9]">
				<img src={poster} alt={alt} className="size-full object-cover" fetchPriority="low" />
			</div>
		);
	}

	return (
		<figure className="relative h-full min-h-[34rem] overflow-hidden rounded-2xl bg-[var(--selena-charcoal)]">
			<img src={poster} alt={alt} className="absolute inset-0 size-full object-cover" />
			<SceneLoop video={video} poster={poster} />
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--selena-charcoal)]/85 to-transparent"
			/>
			<figcaption className="absolute inset-x-0 bottom-0 p-8 text-[var(--selena-ivory)]">
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--selena-copper)]">{eyebrow}</p>
				<p className="selena-heading mt-2 text-xl">{line}</p>
			</figcaption>
		</figure>
	);
}

function SceneLoop({ video, poster }: { video: string; poster: string }) {
	const [enabled, setEnabled] = useState(false);
	const ref = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		// The panel is display:none below lg, so the loop would only cost bytes there.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (!window.matchMedia("(min-width: 64rem)").matches) return;
		setEnabled(true);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!enabled || !el) return;
		el.muted = true;
		el.play().catch(() => {
			// Autoplay refused: the poster stays, nothing else to do.
		});
	}, [enabled]);

	if (!enabled) return null;

	return (
		<video
			ref={ref}
			autoPlay
			muted
			loop
			playsInline
			preload="metadata"
			poster={poster}
			className="absolute inset-0 size-full object-cover"
		>
			<source src={video.replace(/\.mp4$/, ".webm")} type="video/webm" />
			<source src={video} type="video/mp4" />
		</video>
	);
}
