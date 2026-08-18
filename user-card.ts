// <userinfo-get> https://music.163.com/api/v1/user/detail/12625392267
// out: 
// {"level":9,"listenSongs":14647,"userPoint":{"userId":12625392267,"balance":3133,"updateTime":1786863195618,"version":10,"status":1,"blockBalance":0},"mobileSign":false,"pcSign":false,"profile":{"privacyItemUnlimit":{"area":true,"college":true,"user_page_profile":true,"gender":true,"age":true,"villageAge":false},"avatarDetail":null,"vipType":0,"mutual":false,"remarkName":null,"avatarImgId":109951173167932093,"birthday":1316666559584,"gender":1,"nickname":"XSlimeWazReal","province":460000,"followed":false,"detailDescription":"","userType":0,"accountStatus":0,"avatarUrl":"http://p1.music.126.net/6f7bLn3YSshB9FSwfMTunQ==/109951173167932093.jpg","defaultAvatar":false,"djStatus":10,"backgroundImgId":109951162868126486,"backgroundUrl":"http://p1.music.126.net/_f8R60U9mZ42sSNvdPn2sQ==/109951162868126486.jpg","city":460100,"experts":{},"authStatus":0,"expertTags":null,"avatarImgIdStr":"109951173167932093","backgroundImgIdStr":"109951162868126486","createTime":-1,"description":"","userId":12625392267,"signature":"我的品味很低，不太会听音乐。","authority":0,"followeds":161,"follows":296,"blacklist":false,"eventCount":70,"allSubscribedCount":0,"playlistBeSubscribedCount":1090,"avatarImgId_str":"109951173167932093","followTime":null,"followMe":false,"artistIdentity":[],"cCount":0,"inBlacklist":false,"sDJPCount":0,"playlistCount":25,"sCount":0,"newFollows":296},"peopleCanSeeMyPlayRecord":true,"bindings":[{"expiresIn":2147483647,"refreshTime":1751531800,"bindingTime":1751531800343,"tokenJsonStr":null,"url":"","expired":false,"userId":12625392267,"id":16814683547,"type":1},{"expiresIn":5184000,"refreshTime":1785816250,"bindingTime":1780104286278,"tokenJsonStr":null,"url":"","expired":false,"userId":12625392267,"id":20336545073,"type":5}],"adValid":true,"code":200,"newUser":false,"recallUser":false,"createTime":-1,"createDays":659,"profileVillageInfo":{"title":"领取村民证","imageUrl":null,"targetUrl":"https://sg.music.163.com/g/cloud-card-3?full_screen=true&nm_style=sbt&market=wode"}}
async function getUserCard(uid: number): Promise<string> {
    //out.profile.avatarUrl;
    let req = await fetch(`https://ncmapi.xslimenb.eu.org/user/detail?uid=${uid}`);
    let resp = await req.text();
    let out = JSON.parse(resp);
    let avatarUrl = out.profile.avatarUrl;
    let signature = out.profile.signature;
    let subscribes = out.profile.follows;
    let followers = out.profile.followeds;
    let nickname = out.profile.nickname;
    let lvl = out.level;
    return `
    <div class="card">
        <img src="${avatarUrl}" class="user-avatar"/>
        <div class="infos">
        <h2>${nickname}</h2>
        <ul class="info-tags">
            <li>${subscribes}关注</li>
            <li>${followers}粉丝</li>
            <li>Lv.${lvl}</li>
        </ul>
        <p>${signature}</p>
        </div>
    </div>`;
}

export {
    getUserCard
};