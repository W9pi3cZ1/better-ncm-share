// notice: some link is like this: https://163cn.tv/bddFIFFr
// then you need to exec getRealLink(http_link)
async function getRealLink(http_link: string) {
    const response = await fetch(http_link);
    const realLink = response.headers.get("location");
    if (realLink)
        return realLink;
    else
        return http_link;
}

// <userinfo-get> https://music.163.com/api/v1/user/detail/12625392267
// out: 
// {"level":9,"listenSongs":14647,"userPoint":{"userId":12625392267,"balance":3133,"updateTime":1786863195618,"version":10,"status":1,"blockBalance":0},"mobileSign":false,"pcSign":false,"profile":{"privacyItemUnlimit":{"area":true,"college":true,"user_page_profile":true,"gender":true,"age":true,"villageAge":false},"avatarDetail":null,"vipType":0,"mutual":false,"remarkName":null,"avatarImgId":109951173167932093,"birthday":1316666559584,"gender":1,"nickname":"XSlimeWazReal","province":460000,"followed":false,"detailDescription":"","userType":0,"accountStatus":0,"avatarUrl":"http://p1.music.126.net/6f7bLn3YSshB9FSwfMTunQ==/109951173167932093.jpg","defaultAvatar":false,"djStatus":10,"backgroundImgId":109951162868126486,"backgroundUrl":"http://p1.music.126.net/_f8R60U9mZ42sSNvdPn2sQ==/109951162868126486.jpg","city":460100,"experts":{},"authStatus":0,"expertTags":null,"avatarImgIdStr":"109951173167932093","backgroundImgIdStr":"109951162868126486","createTime":-1,"description":"","userId":12625392267,"signature":"我的品味很低，不太会听音乐。","authority":0,"followeds":161,"follows":296,"blacklist":false,"eventCount":70,"allSubscribedCount":0,"playlistBeSubscribedCount":1090,"avatarImgId_str":"109951173167932093","followTime":null,"followMe":false,"artistIdentity":[],"cCount":0,"inBlacklist":false,"sDJPCount":0,"playlistCount":25,"sCount":0,"newFollows":296},"peopleCanSeeMyPlayRecord":true,"bindings":[{"expiresIn":2147483647,"refreshTime":1751531800,"bindingTime":1751531800343,"tokenJsonStr":null,"url":"","expired":false,"userId":12625392267,"id":16814683547,"type":1},{"expiresIn":5184000,"refreshTime":1785816250,"bindingTime":1780104286278,"tokenJsonStr":null,"url":"","expired":false,"userId":12625392267,"id":20336545073,"type":5}],"adValid":true,"code":200,"newUser":false,"recallUser":false,"createTime":-1,"createDays":659,"profileVillageInfo":{"title":"领取村民证","imageUrl":null,"targetUrl":"https://sg.music.163.com/g/cloud-card-3?full_screen=true&nm_style=sbt&market=wode"}}
async function getUserAvatarURL(uid: number): Promise<string> {
    //out.profile.avatarUrl;
    let req = await fetch(`https://music.163.com/api/v1/user/detail/${uid}`);
    let resp = await req.text();
    let out = JSON.parse(resp);
    return out.profile.avatarUrl;
}

function getRelativeRef(url: URL): string {
    const href = url.href;
    if (href.includes("/#/")) {
        return href.slice(href.indexOf("/#/") + 2);
    }
    if (href.includes("/m/")) {
        return href.slice(href.indexOf("/m/") + 2);
    }
    return url.pathname + url.search + url.hash;
}

function isDecimal(s: string) { return /^\d+$/.test(s); }

function getPathFromRef(ref: string): { path: string, path_id: string | null } {
    let path = ref.slice(0, ref.indexOf("?"));
    let segments = path.split('/').filter(seg => seg !== '');
    const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
    let path_id = null;
    if (lastSegment !== null) {
        if (isDecimal(lastSegment)) {
            segments = segments.slice(0, -1);
            path_id = lastSegment;
        }
        if (lastSegment === "index.html") {
            segments = segments.slice(0, -1);
        }
    }
    path = "/" + segments.join("/");
    return { path, path_id };
}

function getSearchParamsFromRef(ref: string, path_id: string | null): URLSearchParams {
    const queryStart = ref.indexOf('?');
    if (queryStart === -1) {
        return new URLSearchParams(); // None
    }

    // Find '#'
    const hashStart = ref.indexOf('#', queryStart);
    const queryString = hashStart === -1
        ? ref.substring(queryStart + 1)
        : ref.substring(queryStart + 1, hashStart);

    let params = new URLSearchParams(queryString);
    if (path_id) {
        params.append("id", path_id);
    }
    return params;
}

const encodeCharset = "!&()*+,-./0123456789:=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~".split("") // `#` be used to separate

// 0 [song-share]
// in: https://y.music.163.com/m/song?id=3332757361&uct2=oLMlPGOQMOEMkIuch3Ox3Q%3D%3D&fx-wechatnew=t1&fx-wxqd=c&fx-wordtest=&fx-listentest=t3&H5_DownloadVIPGift=&playerUIModeId=5623502&PlayerStyles_SynchronousSharing=t3&dlt=0846&app_version=9.5.70&sc=wm&tn=
// out: orpheus://song/3332757361?shareExt=%7B%22playerUIModeId%22%3A%225623502%22%7D
//
// 1 [album-share]
// in: https://music.163.com/#/album/356178488/?userid=12625392267
// out: orpheus://album/356178488?shareuserid=12625392267
//
// 2 [artist-share]
// in: https://music.163.com/#/artist?id=47557113&userid=12625392267
// out: orpheus://artist/47557113?shareuserid=12625392267
// 目前暂时忽略evokeChain参数
//
// 3 [user-share]
// in: https://y.music.163.com/m/user?id=12625392267
// out: orpheus://user/12625392267
//
// 4 [listen-together-multi]
// in: https://st.music.163.com/listen-together/multishare/index.html?inviterUid=1773580311&roomId=fba80f38b9a67c13397656c55c930056_1786880504429&app_version=9.5.70&dlt=0846&qq_aio_chat_type=3
// out: orpheus://nm/multiListenTogether/joinRoom?roomId=fba80f38b9a67c13397656c55c930056_1786880504429&inviterId=1773580311&listenTogetherRefer=third_party_invite&dls=0681
//
// 5 [listen-together-double]
// in: https://st.music.163.com/listen-together/share/index.html?roomId=06db4c63b6e8b9e5e8ad7cfd004fde3a_1786882336&inviterId=12625392267&songId=1491217968
// out: orpheus://nm/play/listenTogether?roomId=06db4c63b6e8b9e5e8ad7cfd004fde3a_1786882336&inviterId=12625392267&listenTogetherRefer=third_party_invite&autoRecreatable=1&inviterAvatarUrl=http%3A%2F%2Fp1.music.126.net%2F6f7bLn3YSshB9FSwfMTunQ%3D%3D%2F109951173167932093.jpg&isFromH5=1
//
// 6 [custom]
// in: ANY
// out: orpheus://openurl?url=encodeURIComponent(ANY)

type shareObj = {
    kind: number,
    id: number,
    room_id_hash: string | null,
    id2: number | null,
}

function getShareObj(http_link: URL): shareObj {
    let ref = getRelativeRef(http_link);
    let { path, path_id } = getPathFromRef(ref);
    let params = getSearchParamsFromRef(ref, path_id);
    let share_obj: shareObj = {
        kind: -1,
        id: -1,
        room_id_hash: null,
        id2: null
    };
    console.log(path);
    console.log(params);
    let id_str = params.get("id");
    switch (path) {
        case "/song":
            if (id_str !== null) {
                share_obj.kind = 0;
                share_obj.id = parseInt(id_str);
            }
            break;
        case "/album":
            if (id_str !== null) {
                share_obj.kind = 1;
                share_obj.id = parseInt(id_str);
            }
            break;
        case "/artist":
            if (id_str !== null) {
                share_obj.kind = 2;
                share_obj.id = parseInt(id_str);
            }
            break;
        case "/user":
            if (id_str !== null) {
                share_obj.kind = 3;
                share_obj.id = parseInt(id_str);
            }
            break;
        case "/listen-together/multishare": {
            let uid_str = params.get("inviterUid");
            let room_id_str = params.get("roomId");
            if (uid_str !== null && room_id_str !== null) {
                let room_id = room_id_str.split("_");
                share_obj.kind = 4;
                share_obj.id = parseInt(uid_str);
                share_obj.room_id_hash = room_id[0];
                share_obj.id2 = parseInt(room_id[1]);
            }
        }
            break;
        case "/listen-together/share": {
            let uid_str = params.get("inviterId");
            let room_id_str = params.get("roomId");
            if (uid_str !== null && room_id_str !== null) {
                let room_id = room_id_str.split("_");
                share_obj.kind = 5;
                share_obj.id = parseInt(uid_str);
                share_obj.room_id_hash = room_id[0];
                share_obj.id2 = parseInt(room_id[1]);
            }
        }
            break;
        default:
    }
    return share_obj;
}

function shareObjToOrpheus(share_obj: shareObj) {
    switch (share_obj.kind) {
        case 0: return `orpheus://song/${share_obj.id}`;
        case 1: return `orpheus://album/${share_obj.id}`;
        case 2: return `orpheus://artist/${share_obj.id}`;
        case 3: return `orpheus://user/${share_obj.id}`;
        case 4: return `orpheus://nm/multiListenTogether/joinRoom?roomId=${share_obj.room_id_hash}_${share_obj.id2}&inviterId=${share_obj.id}&listenTogetherRefer=third_party_invite`;
        case 5: return `orpheus://nm/play/listenTogether?roomId=${share_obj.room_id_hash}_${share_obj.id2}&inviterId=${share_obj.id}&listenTogetherRefer=third_party_invite&autoRecreatable=1&isFromH5=1`;
        case -1: return `bad`;
        default:
            return "null";
    }
}

function shareObjToOrignal(share_obj: shareObj) {
    switch (share_obj.kind) {
        case 0: return `https://music.163.com/song?id=${share_obj.id}`;
        case 1: return `https://music.163.com/album?id=${share_obj.id}`;
        case 2: return `https://music.163.com/artist?id=${share_obj.id}`;
        case 3: return `https://music.163.com/user?id=${share_obj.id}`;
        case 4: return `https://st.music.163.com/listen-together/multishare?inviterUid=${share_obj.id}&roomId=${share_obj.room_id_hash}_${share_obj.id2}`;
        case 5: return `https://st.music.163.com/listen-together/share?roomId=${share_obj.room_id_hash}_${share_obj.id2}&inviterId=${share_obj.id}`;
        case -1: return `bad`;
        default:
            return "null";
    }
}

function encodeNum(num: number) {
  if (num === 0) return encodeCharset[0];
  let result = '';
  const base = encodeCharset.length; // 87
  while (num > 0) {
    result = encodeCharset[num % base] + result;
    num = Math.floor(num / base);
  }
  return result;
}

function decodeNum(str: string) {
  const base = encodeCharset.length;
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * base + encodeCharset.indexOf(str[i]);
  }
  return result;
}

function encodeBigInt(num: bigint) { // num 是 bigint 类型
  if (num === 0n) return encodeCharset[0];
  let result = '';
  const base = BigInt(encodeCharset.length);
  while (num > 0n) {
    result = encodeCharset[Number(num % base)] + result; // 取模结果转为数字索引
    num = num / base; // BigInt 除法自动向下取整
  }
  return result;
}

function decodeBigInt(str: string) {
  let result = 0n;
  const base = BigInt(encodeCharset.length);
  for (let i = 0; i < str.length; i++) {
    const idx = encodeCharset.indexOf(str[i]);
    if (idx === -1) throw new Error(`非法字符: ${str[i]}`);
    result = result * base + BigInt(idx);
  }
  return result;
}


function compressShareObj(share_obj: shareObj){
    let buf: string = "";
    if(share_obj.id===-1){
        return "null";
    }
    buf+=encodeCharset[share_obj.kind%encodeCharset.length];
    buf+=encodeNum(share_obj.id);
    if(share_obj.room_id_hash !== null){
        buf+="#";
        buf+=encodeBigInt(BigInt("0x"+share_obj.room_id_hash));
    }
    if(share_obj.id2 !== null){
        buf+="#";
        buf+=encodeNum(share_obj.id2);
    }
    return buf;
}

function decompressShareObj(str: string): shareObj{
    let args = str.slice(1).split("#");
    let obj: shareObj = {
        kind: encodeCharset.indexOf(str[0]),
        id: decodeNum(args[0]),
        room_id_hash: null,
        id2: null,
    };
    if(args[1]){
        obj.room_id_hash = decodeBigInt(args[1]).toString(16).padStart(32,'0');
    }
    if(args[2]){
        obj.id2 = decodeNum(args[2]);
    }
    return obj;
}

// 应用宝调用：
// http://a.app.qq.com/o/simple.jsp?pkgname=com.netease.cloudmusic&android_scheme=orpheus://eyJjbWQiOiJsaXN0ZW50b2dldGhlciIsInJlZmVyIjoiaW5ib3hfaW52aXRlIiwicm9vbUlkIjoiZmJhODBmMzhiOWE2N2MxMzM5NzY1NmM1NWM5MzAwNTZfMTc4Njg4MDUwNDQyOSIsImludml0ZXJJZCI6IjE3NzM1ODAzMTEifQ==

export { 
    getShareObj,
    shareObjToOrignal,
    shareObjToOrpheus,
    compressShareObj,
    decompressShareObj,
};
