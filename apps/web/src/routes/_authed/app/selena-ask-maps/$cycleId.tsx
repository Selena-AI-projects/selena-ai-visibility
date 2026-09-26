import { createFileRoute } from "@tanstack/react-router";
import { SelenaLocalReportPage } from "@/components/selena-local-report-page";

// Manual pilots are delivered by an operator, so access follows the session tenant and the published report, not a plan.
export const Route = createFileRoute("/_authed/app/selena-ask-maps/$cycleId")({
	component: AskMapsReportRoute,
});

function AskMapsReportRoute() {
	const { cycleId } = Route.useParams();
	return <SelenaLocalReportPage cycleId={cycleId} />;
}
