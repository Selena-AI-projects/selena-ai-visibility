import { r as DefaultQueryCompiler } from "./default-query-compiler-Yx_K6OBJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sqlite-adapter-fhlXAbNF.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6fe0f811-7960-4cf0-9c43-fa6c8b81d680", e._sentryDebugIdIdentifier = "sentry-dbid-6fe0f811-7960-4cf0-9c43-fa6c8b81d680");
	} catch (e) {}
})();
/**
* A basic implementation of `DialectAdapter` with sensible default values.
* Third-party dialects can extend this instead of implementing the `DialectAdapter`
* interface from scratch. That way all new settings will get default values when
* they are added and there will be less breaking changes.
*/
var DialectAdapterBase = class {
	get supportsCreateIfNotExists() {
		return true;
	}
	get supportsTransactionalDdl() {
		return false;
	}
	get supportsReturning() {
		return false;
	}
	get supportsOutput() {
		return false;
	}
};
var ID_WRAP_REGEX = /"/g;
var JSON_PATH_MEMBER_ESCAPE_REGEX = /[\\'"]/g;
var SqliteQueryCompiler = class extends DefaultQueryCompiler {
	visitOrAction(node) {
		this.append("or ");
		this.append(node.action);
	}
	getCurrentParameterPlaceholder() {
		return "?";
	}
	getLeftExplainOptionsWrapper() {
		return "";
	}
	getRightExplainOptionsWrapper() {
		return "";
	}
	getLeftIdentifierWrapper() {
		return "\"";
	}
	getRightIdentifierWrapper() {
		return "\"";
	}
	getAutoIncrement() {
		return "autoincrement";
	}
	sanitizeIdentifier(identifier) {
		return identifier.replace(ID_WRAP_REGEX, "\"\"");
	}
	sanitizeJSONPathMemberValue(value) {
		return value.replace(JSON_PATH_MEMBER_ESCAPE_REGEX, (char) => char === "\\" ? "\\\\" : char === "'" ? "''" : "\\\"");
	}
	visitDefaultInsertValue(_) {
		this.append("null");
	}
};
var SqliteAdapter = class extends DialectAdapterBase {
	get supportsTransactionalDdl() {
		return false;
	}
	get supportsReturning() {
		return true;
	}
	async acquireMigrationLock(_db, _opt) {}
	async releaseMigrationLock(_db, _opt) {}
};
//#endregion
export { SqliteAdapter as n, SqliteQueryCompiler as r, DialectAdapterBase as t };

//# sourceMappingURL=sqlite-adapter-fhlXAbNF.mjs.map