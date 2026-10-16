/**
 * The one shared shape every "parse/validate this user input" function in
 * the app returns — jsonPath, collections import, and cURL parsing each
 * used to define their own structurally-identical `{ok:true,...}|{ok:false,
 * error:string}` type; this is that shape, generic over what a success
 * carries alongside `ok: true`.
 */
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string }
