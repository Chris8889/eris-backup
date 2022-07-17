var getBans = async function (guild) {
    var bans = [];
    var bans1 = await guild.getBans();
    bans1.forEach(function (ban) {
        bans.push({
            id: ban.user.id,
            reason: ban.reason
        });
    }); return bans;
};

var getRoles = async function (guild) {
    var roles = [];
    guild.roles.filter(role => !role.managed).sort(function (a, b) {return b.position - a.position}).forEach(async role => {
        var roleData = {
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: {allow: role.permissions.allow.toString(), deny: role.permissions.deny.toString()},
            mentionable: role.mentionable,
            isEveryone: guild.id == role.id,
            position: role.position
        }; roles.push(roleData);
    }); return roles;
};

var getEmojis = async function (guild) {
    var emojis = [];
    guild.emojis.forEach(async emoji => {
        var eData = {name: emoji.name};
        var node_fetch_1 = require(`node-fetch`);
        if (emoji.animated) {
            let image = await node_fetch_1.default(`https://cdn.discordapp.com/emojis/${emoji.id}.gif`).then(function (res) {return res.buffer()});
            eData.base64 = await image.toString(`base64`);
            emojis.push(eData);
        } else {
            let image = await node_fetch_1.default(`https://cdn.discordapp.com/emojis/${emoji.id}.png`).then(function (res) {return res.buffer()});
            eData.base64 = await image.toString(`base64`);
            emojis.push(eData);
        }
    }); return emojis;
};

var getChannels = async function (guild) {
    async function fetchChannelPermissions (channel) {
        var permissions = [];
        channel.permissionOverwrites.filter(p => p.type == 0 /*role*/).forEach(perm => {
            var role = channel.guild.roles.get(perm.id);
            if (role) {permissions.push({roleName: role.name, allow: perm.allow.toString(), deny: perm.deny.toString()})};
        }); return permissions;
    };
    async function fetchVoiceChannelData (channel) {
        var channelData = {
            type: 2,
            name: channel.name,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            permissions: await fetchChannelPermissions(channel)
        }; return channelData;
    };
    async function fetchTextChannelData (channel) {
        var channelData = {
            type: channel.type,
            name: channel.name,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.type == 0 ? channel.rateLimitPerUser : undefined,
            permissions: await fetchChannelPermissions(channel),
            isNews: channel.type == 5,
            topic: channel.topic
        }; return channelData;
    };

    let channels = {categories: [], others: []};
    let types = {0: `GUILD_TEXT`, 1: `DM`, 2: `GUILD_VOICE`, 3: `GROUP_DM`, 4: `GUILD_CATEGORY`, 5: `GUILD_NEWS`, 6: `GUILD_STORE`, 7: ``, 8: ``, 9: ``, 10: `GUILD_NEWS_THREAD`, 11: `GUILD_PUBLIC_THREAD`, 12: `GUILD_PRIVATE_THREAD`, 13: `GUILD_STAGE_VOICE`};

    let categories = guild.channels.filter(channel => types[channel.type] == `GUILD_CATEGORY`).sort(function (a, b) {return a.position - b.position});
    await categories.forEach(async category => {
        let categoryData = {name: category.name, permissions: await fetchChannelPermissions(category), children: []};
        let children = category.channels.filter(channel => channel).sort(function (a, b) {return a.position - b.position});

        await children.forEach(async child => {
            if (child.type == 0 || child.type == 5) categoryData.children.push(await fetchTextChannelData(child));
            else categoryData.children.push(await fetchVoiceChannelData(child));
        }); channels.categories.push(categoryData);
    });

    let others = guild.channels.filter(ch => !ch.parentID && ch.type != 4 && ch.type != 6 && ch.type != 10 && ch.type != 12 && ch.type != 11).sort(function (a, b) {return a.position - b.position});
    await others.forEach(async channel => {
        if (channel.type == 0 || channel.type == 5) channels.others.push(await fetchTextChannelData(channel));
        else channels.others.push(await fetchVoiceChannelData(channel));
    }); return channels;
};

exports.getBans = getBans;
exports.getRoles = getRoles;
exports.getEmojis = getEmojis;
exports.getChannels = getChannels;