import { pilotSeatRequestId } from "@workspace/selena-visibility-contracts";
import { sql } from "drizzle-orm";
import type { OrganizationDatabase } from "./db/organization-transaction";

/**
 * Which free request and which order each redeemed pilot seat produced.
 *
 * Since seats have a derived request id (pilotSeatRequestId), a seat leads to
 * its request directly. A seat redeemed before that has only a random-id
 * request in the same workspace and plan, and when a workspace holds several
 * such seats nothing pairs a seat with its request — that is reported as
 * ambiguous for the operator to settle, never guessed.
 */

export type RedeemedSeat = {
	seatId: string;
	label: string | null;
	planId: string;
	organizationId: string;
	codeHash: string;
};
export type PromoRequest = { id: string; organizationId: string; planId: string; status: string; createdAt: Date };
export type RequestOrder = { requestId: string; orderId: string; status: string };

export type SeatClass =
	| "NEW_FLOW_ORDERED"
	| "NEW_FLOW_NO_ORDER"
	| "LEGACY_ORDERED"
	| "LEGACY_NO_ORDER"
	| "LEGACY_AMBIGUOUS"
	| "ORPHAN_SEAT";

export type SeatReconciliation = {
	seatId: string;
	label: string | null;
	organizationId: string;
	planId: string;
	class: SeatClass;
	requestIds: string[];
	orders: Array<{ orderId: string; status: string }>;
};

/** A request saved before seat ids were derived: gen_random_uuid() yields version 4, derived ids version 8. */
export function isLegacyRequestId(id: string): boolean {
	return id.charAt(14) === "4";
}

export function reconcilePilotSeats(input: {
	seats: readonly RedeemedSeat[];
	requests: readonly PromoRequest[];
	orders: readonly RequestOrder[];
}): SeatReconciliation[] {
	const ordersOf = (requestId: string) =>
		input.orders.filter((order) => order.requestId === requestId).map(({ orderId, status }) => ({ orderId, status }));
	const byId = new Map(input.requests.map((request) => [request.id, request]));
	const groupKey = (organizationId: string, planId: string) => `${organizationId}\u0000${planId}`;

	const rows: SeatReconciliation[] = [];
	const legacySeats = new Map<string, RedeemedSeat[]>();
	for (const seat of input.seats) {
		const derived = byId.get(pilotSeatRequestId(seat.organizationId, seat.codeHash));
		if (derived) {
			const orders = ordersOf(derived.id);
			rows.push({
				...seatFields(seat),
				class: orders.length > 0 ? "NEW_FLOW_ORDERED" : "NEW_FLOW_NO_ORDER",
				requestIds: [derived.id],
				orders,
			});
			continue;
		}
		const key = groupKey(seat.organizationId, seat.planId);
		legacySeats.set(key, [...(legacySeats.get(key) ?? []), seat]);
	}

	for (const [key, seats] of legacySeats) {
		const legacyRequests = input.requests.filter(
			(request) => groupKey(request.organizationId, request.planId) === key && isLegacyRequestId(request.id),
		);
		for (const seat of seats) {
			if (legacyRequests.length === 0) {
				rows.push({ ...seatFields(seat), class: "ORPHAN_SEAT", requestIds: [], orders: [] });
				continue;
			}
			if (seats.length === 1 && legacyRequests.length === 1) {
				const orders = ordersOf(legacyRequests[0].id);
				rows.push({
					...seatFields(seat),
					class: orders.length > 0 ? "LEGACY_ORDERED" : "LEGACY_NO_ORDER",
					requestIds: [legacyRequests[0].id],
					orders,
				});
				continue;
			}
			rows.push({
				...seatFields(seat),
				class: "LEGACY_AMBIGUOUS",
				requestIds: legacyRequests.map((request) => request.id),
				orders: legacyRequests.flatMap((request) => ordersOf(request.id)),
			});
		}
	}
	return rows;
}

function seatFields(seat: RedeemedSeat) {
	return { seatId: seat.seatId, label: seat.label, organizationId: seat.organizationId, planId: seat.planId };
}

/**
 * Reads seats, free requests and their orders in one READ ONLY transaction, so
 * it cannot change a row even on a database it may write to. It needs a role
 * that can read sv_pilot_invites, which the runtime role cannot.
 */
export async function readPilotSeatReconciliation(database: OrganizationDatabase): Promise<SeatReconciliation[]> {
	return database.transaction(async (tx) => {
		await tx.execute(sql`set transaction read only`);
		const seats = await tx.execute(sql`
			select id::text as "seatId", label, plan_id as "planId",
				redeemed_by_organization_id as "organizationId", code_hash as "codeHash"
			from sv_pilot_invites where redeemed_at is not null`);
		const requests = await tx.execute(sql`
			select id::text as id, organization_id as "organizationId", plan_id as "planId", status, created_at as "createdAt"
			from sv_order_requests where promo_applied`);
		const orders = await tx.execute(sql`
			select substring(p.provider_event_id from '^auto-request:([0-9a-f-]{36})$') as "requestId",
				o.id::text as "orderId", o.status::text as status
			from sv_payments p join sv_orders o on o.id = p.order_id
			where p.provider = 'test' and p.provider_event_id ~ '^auto-request:[0-9a-f-]{36}$'`);
		return reconcilePilotSeats({
			seats: seats.rows as RedeemedSeat[],
			requests: requests.rows as PromoRequest[],
			orders: orders.rows as RequestOrder[],
		});
	});
}
