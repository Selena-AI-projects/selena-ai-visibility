import { Link, useRouteContext } from "@tanstack/react-router";
import type { ClientConfig } from "@workspace/config/types";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import type { ReactNode } from "react";
import { AuthScene, type AuthSceneName } from "@/components/auth-scene";
import { Logo } from "@/components/logo";
import { isSelenaBranding } from "@/lib/branding";

interface FullPageCardProps {
	title?: string;
	subtitle?: string;
	children?: ReactNode;
	showBackButton?: boolean;
	backButtonHref?: string;
	backButtonText?: string;
	customBackButton?: ReactNode;
	className?: string;
	scene?: AuthSceneName;
}

export default function FullPageCard({
	title,
	subtitle,
	children = undefined,
	showBackButton = false,
	backButtonHref = "/app",
	backButtonText = "Go Back",
	customBackButton,
	// A fixed `w-md` is 28rem whatever the screen is, so on a phone the card was
	// wider than the viewport and the page scrolled sideways.
	className = "w-full max-w-md",
	scene,
}: FullPageCardProps) {
	const context = useRouteContext({ strict: false }) as { clientConfig?: ClientConfig };
	// A white-label deployment must not open under Selena's imagery, so the scene follows the branding, not the route.
	const showScene = scene !== undefined && isSelenaBranding(context.clientConfig?.branding);

	const body = (
		<div className={`mx-auto ${className}`}>
			<div className="flex items-center justify-center space-x-3">
				<Logo />
			</div>
			<Card className="selena-auth-card my-8">
				{(title || subtitle) && (
					<CardHeader className={subtitle ? "text-center" : "text-center grid-rows-1 gap-0"}>
						{title && <CardTitle className="text-xl">{title}</CardTitle>}
						{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
					</CardHeader>
				)}
				{children && (
					<>
						{(title || subtitle) && <Separator />}
						<CardContent className={title || subtitle ? "" : "flex flex-col items-center space-y-6 py-4 px-12"}>
							{children}
						</CardContent>
					</>
				)}
			</Card>
			{customBackButton ? (
				<div className="flex justify-center">{customBackButton}</div>
			) : showBackButton ? (
				<div className="flex justify-center">
					<Button variant="outline" size="sm" asChild>
						<Link to={backButtonHref}>{backButtonText}</Link>
					</Button>
				</div>
			) : null}
		</div>
	);

	if (showScene && scene) {
		return (
			<div className="selena-auth-shell min-h-screen">
				<div className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 p-4 lg:grid-cols-2 lg:gap-10 lg:p-8">
					{/* min-w-0: a grid column will not shrink past its content's intrinsic width without it. */}
					<div className="flex min-w-0 flex-col justify-center gap-6">
						<div className="lg:hidden">
							<AuthScene scene={scene} variant="strip" />
						</div>
						{body}
					</div>
					{/* Centred, so the panel keeps its own aspect instead of stretching to the viewport height. */}
					<div className="hidden lg:flex lg:items-center">
						<AuthScene scene={scene} variant="panel" />
					</div>
				</div>
			</div>
		);
	}

	return <div className="selena-auth-shell min-h-screen flex items-center justify-center p-4">{body}</div>;
}
