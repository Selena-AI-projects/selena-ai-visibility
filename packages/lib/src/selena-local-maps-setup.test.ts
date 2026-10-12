import {
	formatLocalMapsLocationCoordinate,
	materializeLocalMapsProviderRequest,
	planMapsLockSlots,
} from "@workspace/selena-visibility-contracts";
import { describe, expect, it } from "vitest";
import { buildLocalMapsPilotLock, type LocalMapsSetupInput } from "./selena-local-maps-setup";

const setup: LocalMapsSetupInput = {
	organizationId: "default",
	actorId: "user-owner-1",
	displayName: "KORA Food Hall",
	countryCode: "ID",
	timezone: "Asia/Makassar",
	latitude: -8.506854,
	longitude: 115.262482,
	placeId: "ChIJ-kora-test",
	keywords: ["food hall ubud"],
	language: "en",
	seDomain: "google.com",
	timestampWindow: { startsAt: "2026-10-12T00:00:00.000Z", endsAt: "2026-10-19T00:00:00.000Z" },
	provider: {
		id: "dataforseo-google-maps",
		endpoint: "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
		version: "v3",
	},
	perAttemptWorstCaseUsd: "0.002",
	leaseDurationMs: 300_000,
	priceSnapshotVersion: "dataforseo-maps-live-advanced-usd-0.002",
	engineSha: "unrecorded",
};
const locationId = "11111111-1111-4111-8111-111111111111";
const keyword = { id: "22222222-2222-4222-8222-222222222222", text: "food hall ubud" };

describe("Local Maps setup lock", () => {
	it("freezes an executable 3×3 pilot whose worst case is every retry of every point", () => {
		const lock = buildLocalMapsPilotLock({ setup, locationId, keyword, lockVersion: 1 });
		expect(lock.grid).toMatchObject({ size: 3, radiusMeters: 3000, centerLatitude: "-8.506854" });
		expect(lock.request).toEqual({
			device: "MOBILE",
			os: "android",
			language: "en",
			seDomain: "google.com",
			zoom: 13,
			depth: 20,
			searchThisArea: true,
		});
		expect(lock.expectedSlots).toBe(9);
		expect(lock.maxProviderAttempts).toBe(27);
		expect(lock.budget.worstCaseCostUsd).toBe("0.054000");
		expect(lock.pilot).toMatchObject({ perAttemptWorstCaseUsd: "0.002", leaseDurationMs: 300_000 });
		expect(lock.targetIdentity).toMatchObject({
			placeId: "ChIJ-kora-test",
			identitySource: "USER_CONFIRMED",
			matchPolicy: "PLACE_ID_OR_CID",
		});
	});

	it("sends the canary's center point to DataForSEO as the location itself at zoom 13", () => {
		const lock = buildLocalMapsPilotLock({ setup, locationId, keyword, lockVersion: 1 });
		const center = planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", lock).find(
			(slot) => slot.pointIndex === 4,
		);
		if (!center) throw new Error("TEST_CENTER_SLOT_MISSING");
		const request = materializeLocalMapsProviderRequest(lock, center, {
			...keyword,
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
		});
		expect(formatLocalMapsLocationCoordinate(request)).toBe("-8.506854,115.262482,13z");
	});

	it("builds the same lock from the same inputs, so a re-run can find the one it made", () => {
		const first = buildLocalMapsPilotLock({ setup, locationId, keyword, lockVersion: 1 });
		const second = buildLocalMapsPilotLock({ setup, locationId, keyword, lockVersion: 1 });
		expect(second).toEqual(first);
		const other = buildLocalMapsPilotLock({
			setup,
			locationId,
			keyword: { id: "33333333-3333-4333-8333-333333333333", text: "bali food hall" },
			lockVersion: 1,
		});
		expect(other.keywordSet.id).not.toBe(first.keywordSet.id);
		expect(other.pilot.providerContractDigest).toBe(first.pilot.providerContractDigest);
	});

	it("matches a CID when no Place ID was confirmed, and refuses a target with neither", () => {
		const byCid = buildLocalMapsPilotLock({
			setup: { ...setup, placeId: undefined, cid: "1234567890" },
			locationId,
			keyword,
			lockVersion: 1,
		});
		expect(byCid.targetIdentity).toMatchObject({
			cid: "1234567890",
			mapsUrl: "https://maps.google.com/?cid=1234567890",
		});
		expect(() =>
			buildLocalMapsPilotLock({ setup: { ...setup, placeId: undefined }, locationId, keyword, lockVersion: 1 }),
		).toThrow();
	});
});
