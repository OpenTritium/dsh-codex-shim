//#region src/index.d.ts
/** Host entry for the bundle's browser client contribution. */
/** Cordis plugin name. */
declare const name = "opentritium-codex-ui";
/** The browser loader discovers the client contribution from package metadata. */
declare function apply(): void;
//#endregion
export { apply, name };