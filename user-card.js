async function f(e){let i=await(await fetch(`https://ncmapi.xslimenb.eu.org/user/detail?uid=${e}`)).text(),l=JSON.parse(i),a=l.profile.avatarUrl,r=l.profile.signature,t=l.profile.follows,s=l.profile.followeds,o=l.profile.nickname,n=l.level;return`
    <div class="card">
        <img src="${a}" class="user-avatar"/>
        <div class="infos">
        <h2>${o}</h2>
        <ul class="info-tags">
            <li>${t}\u5173\u6CE8</li>
            <li>${s}\u7C89\u4E1D</li>
            <li>Lv.${n}</li>
        </ul>
        <p>${r}</p>
        </div>
    </div>`}export{f as getUserCard};
