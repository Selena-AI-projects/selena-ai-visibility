if (process.env.SELENA_JOURNAL_PUBLISH_ENABLED !== "true") {
	console.log("JOURNAL_PUBLISH_DISABLED");
	process.exit(0);
}

import("./publish-journal-detail.js").catch((error) => {
	console.error(error);
	process.exit(1);
});
