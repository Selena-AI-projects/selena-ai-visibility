/**
 * Cinematic side panel for the auth pages.
 *
 * Carries one short, silent loop from the Selena Systems public site so the
 * workspace entrance speaks the same visual language as the site. The poster
 * is in the server-rendered markup so the form never waits on the video; the
 * loop itself mounts only after hydration, because React does not serialize
 * `muted` and browsers refuse to autoplay an unmuted video.
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

// Matches the `lg:` breakpoint that reveals the panel; below it the loop would only spend bytes on a hidden element.
const PANEL_QUERY = "(min-width: 64rem)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useLoopEnabled(): boolean {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const panel = window.matchMedia(PANEL_QUERY);
		const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
		const update = () => setEnabled(panel.matches && !reducedMotion.matches);
		update();
		panel.addEventListener("change", update);
		reducedMotion.addEventListener("change", update);
		return () => {
			panel.removeEventListener("change", update);
			reducedMotion.removeEventListener("change", update);
		};
	}, []);

	return enabled;
}

function SceneLoop({ video, poster }: { video: string; poster: string }) {
	const enabled = useLoopEnabled();
	const ref = useRef<HTMLVideoElement>(null);

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
