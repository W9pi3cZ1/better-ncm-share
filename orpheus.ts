// ============================================================
// orpheus.ts — Orpheus Share Link Codec
// 格式: #<base77>$
// 布局: [payload << 4][4-bit kind]
// ============================================================

// ---------- Base 映射 ----------
const ALPHABET =
    "!&()*+,-./0123456789:=?;ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const BASE_BIG = BigInt(ALPHABET.length); // 77

// ---------- 时间戳配置 ----------
const EPOCH_MS = 1735689600000; // 2025-01-01 00:00:00 UTC
const TS_BITS = 40;             // ~34.8 年
const TS_MASK = (1n << BigInt(TS_BITS)) - 1n;

// 服务端不校验 inviterUid，解压时给一个默认值即可
const DEFAULT_UID = 48353;

export const KIND = {
    SONG: 0,
    ALBUM: 1,
    ARTIST: 2,
    USER: 3,
    MULTI_LISTEN: 4,
    LISTEN_TOGETHER: 5,
    PLAYLIST: 6,
} as const;

export interface ShareObj {
    kind: number;
    id: number;
    room_id_hash: string | null;
    id2: number | null;
}

function badObj(): ShareObj {
    return { kind: -1, id: -1, room_id_hash: null, id2: null };
}

// ---------- Base77 编解码 ----------
function encodeBigInt(n: bigint): string {
    if (n === 0n) return ALPHABET[0];
    const out: string[] = [];
    while (n > 0n) {
        out.push(ALPHABET[Number(n % BASE_BIG)]);
        n /= BASE_BIG;
    }
    return out.reverse().join("");
}

function decodeBigInt(s: string): bigint {
    let n = 0n;
    for (let i = 0; i < s.length; i++) {
        const idx = ALPHABET.indexOf(s[i]);
        if (idx === -1) throw new Error(`Invalid base77 char: ${s[i]}`);
        n = n * BASE_BIG + BigInt(idx);
    }
    return n;
}

// ---------- 压缩 / 解压 ----------
export function compressShareObj(obj: ShareObj): string {
    if (obj.kind < 0 || obj.id < 0) return "#null$";

    let payload: bigint;
    if (obj.kind === KIND.MULTI_LISTEN || obj.kind === KIND.LISTEN_TOGETHER) {
        if (!obj.room_id_hash || obj.id2 === null) return "#null$";
        const hash = BigInt("0x" + obj.room_id_hash);
        const tsOffset = BigInt(obj.id2 - EPOCH_MS);
        if (tsOffset < 0n || tsOffset > TS_MASK) return "#null$";
        payload = (hash << BigInt(TS_BITS)) | tsOffset;
    } else {
        payload = BigInt(obj.id);
    }

    const value = (payload << 4n) | BigInt(obj.kind);
    return "#" + encodeBigInt(value) + "$";
}

export function decompressShareObj(str: string): ShareObj {
    if (str.startsWith("#")) str = str.slice(1);
    if (str.endsWith("$")) str = str.slice(0, -1);
    if (str === "" || str === "null") return badObj();

    const value = decodeBigInt(str);
    const kind = Number(value & 0xFn);
    const payload = value >> 4n;

    if (kind === KIND.MULTI_LISTEN || kind === KIND.LISTEN_TOGETHER) {
        const tsOffset = payload & TS_MASK;
        const hash = payload >> BigInt(TS_BITS);
        return {
            kind,
            id: DEFAULT_UID,
            room_id_hash: hash.toString(16).padStart(32, "0"),
            id2: Number(tsOffset) + EPOCH_MS,
        };
    }

    return {
        kind,
        id: Number(payload),
        room_id_hash: null,
        id2: null,
    };
}

// ---------- URL 解析 ----------
export function extractUrls(text: string, unique = false): string[] {
    const re =
        /(https?|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
    const matches = text.match(re) ?? [];
    return unique ? [...new Set(matches)] : matches;
}

export function getRelativeRef(url: URL): string {
    const href = url.href;
    const iHash = href.indexOf("/#/");
    if (iHash !== -1) return href.slice(iHash + 2);
    const iM = href.indexOf("/m/");
    if (iM !== -1) return href.slice(iM + 2);
    return url.pathname + url.search + url.hash;
}

function isDecimal(s: string): boolean {
    return /^\d+$/.test(s);
}

function getPathFromRef(ref: string): { path: string; pathId: string | null } {
    const qIdx = ref.indexOf("?");
    const hIdx = ref.indexOf("#");
    let end = ref.length;
    if (qIdx !== -1) end = qIdx;
    else if (hIdx !== -1) end = hIdx;

    const segments = ref.slice(0, end).split("/").filter((s) => s !== "");
    let pathId: string | null = null;
    if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (isDecimal(last)) {
            segments.pop();
            pathId = last;
        } else if (last === "index.html") {
            segments.pop();
        }
    }
    return { path: "/" + segments.join("/"), pathId };
}

function getSearchParamsFromRef(
    ref: string,
    pathId: string | null,
): URLSearchParams {
    const qIdx = ref.indexOf("?");
    if (qIdx === -1) return new URLSearchParams();
    const hIdx = ref.indexOf("#", qIdx);
    const qs = hIdx === -1 ? ref.slice(qIdx + 1) : ref.slice(qIdx + 1, hIdx);
    const params = new URLSearchParams(qs);
    if (pathId !== null && !params.has("id")) params.append("id", pathId);
    return params;
}

// ---------- 163cn.tv 短链展开（带超时） ----------

export async function getRealLink(httpLink: string): Promise<string> {
    if (!httpLink.includes("163cn.tv")) return httpLink;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
        const url =
            "https://fuck-cors.xslimenb.eu.org/?url=" +
            encodeURIComponent(httpLink);
        const res = await fetch(url, { signal: ac.signal });
        const json = (await res.json()) as { original?: string };
        if (res.status === 200 && json.original && json.original !== "null") {
            return json.original;
        }
    } catch {
        // 忽略，返回原链接
    } finally {
        clearTimeout(timer);
    }
    return httpLink;
}

// ---------- 主解析 ----------
export async function getShareObj(httpLink: string): Promise<ShareObj> {
    const urls = extractUrls(httpLink);
    if (urls.length === 0) return badObj();

    const link = await getRealLink(urls[0]);

    let ref: string;
    try {
        ref = getRelativeRef(new URL(link));
    } catch {
        return badObj();
    }

    const { path, pathId } = getPathFromRef(ref);
    const params = getSearchParamsFromRef(ref, pathId);

    const obj = badObj();
    const idStr = params.get("id");
    const idNum =
        idStr !== null && isDecimal(idStr) ? parseInt(idStr, 10) : NaN;

    switch (path) {
        case "/song":
            if (!isNaN(idNum)) { obj.kind = KIND.SONG; obj.id = idNum; }
            break;
        case "/album":
            if (!isNaN(idNum)) { obj.kind = KIND.ALBUM; obj.id = idNum; }
            break;
        case "/artist":
            if (!isNaN(idNum)) { obj.kind = KIND.ARTIST; obj.id = idNum; }
            break;
        case "/user":
            if (!isNaN(idNum)) { obj.kind = KIND.USER; obj.id = idNum; }
            break;
        case "/playlist":
            if (!isNaN(idNum)) { obj.kind = KIND.PLAYLIST; obj.id = idNum; }
            break;
        case "/listen-together/multishare":
        case "/listen-together/share": {
            const uidKey =
                path === "/listen-together/multishare"
                    ? "inviterUid"
                    : "inviterId";
            const uidStr = params.get(uidKey);
            const roomIdStr = params.get("roomId");
            if (uidStr === null || roomIdStr === null) break;

            const [hash, tsStr] = roomIdStr.split("_");
            if (!hash || !tsStr || !isDecimal(tsStr)) break;

            obj.kind =
                path === "/listen-together/multishare"
                    ? KIND.MULTI_LISTEN
                    : KIND.LISTEN_TOGETHER;
            obj.id = isDecimal(uidStr) ? parseInt(uidStr, 10) : DEFAULT_UID;
            obj.room_id_hash = hash;
            obj.id2 = parseInt(tsStr, 10);
            break;
        }
    }

    return obj;
}

// ---------- 还原 ----------
export function shareObjToOriginal(obj: ShareObj): string {
    switch (obj.kind) {
        case KIND.SONG:     return `https://music.163.com/m/song?id=${obj.id}`;
        case KIND.ALBUM:    return `https://music.163.com/m/album?id=${obj.id}`;
        case KIND.ARTIST:   return `https://music.163.com/m/artist?id=${obj.id}`;
        case KIND.USER:     return `https://music.163.com/m/user?id=${obj.id}`;
        case KIND.PLAYLIST: return `https://music.163.com/m/playlist?id=${obj.id}`;
        case KIND.MULTI_LISTEN:
            return `https://st.music.163.com/listen-together/multishare?inviterUid=${obj.id}&roomId=${obj.room_id_hash}_${obj.id2}`;
        case KIND.LISTEN_TOGETHER:
            return `https://st.music.163.com/listen-together/share?roomId=${obj.room_id_hash}_${obj.id2}&inviterId=${obj.id}`;
        default:
            return "bad";
    }
}

export function shareObjToOrpheus(obj: ShareObj): string {
    switch (obj.kind) {
        case KIND.SONG:     return `orpheus://song/${obj.id}`;
        case KIND.ALBUM:    return `orpheus://album/${obj.id}`;
        case KIND.ARTIST:   return `orpheus://artist/${obj.id}`;
        case KIND.USER:     return `orpheus://user/${obj.id}`;
        case KIND.PLAYLIST: return `orpheus://playlist/${obj.id}`;
        case KIND.MULTI_LISTEN:
            return `orpheus://nm/multiListenTogether/joinRoom?roomId=${obj.room_id_hash}_${obj.id2}&inviterId=${obj.id}&listenTogetherRefer=third_party_invite`;
        case KIND.LISTEN_TOGETHER:
            return `orpheus://nm/play/listenTogether?roomId=${obj.room_id_hash}_${obj.id2}&inviterId=${obj.id}&listenTogetherRefer=third_party_invite&autoRecreatable=1&isFromH5=1`;
        default:
            return "bad";
    }
}