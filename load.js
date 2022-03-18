var loadBans = function (guild, backupData) {
    var Promises = [];

    backupData.bans.forEach(ban => {
        Promises.push(guild.banMember(ban.id, 0, ban.reason))
    });

    return Promise.all(Promises);
};

var loadRoles = async function (guild, backupData) {
    var Promises = [];

    backupData.roles.forEach(roleData => {
        const {Permission} = require(`eris`);
        if (roleData.isEveryone) {
            Promises.push(guild.roles.get(guild.id).edit({
                name: roleData.name,
                color: roleData.color,
                permissions: new Permission(roleData.permissions.allow, roleData.permissions.deny),
                mentionable: roleData.mentionable
            }, `Loading backup`));
        } else {
            Promises.push(guild.createRole({
                name: roleData.name,
                color: roleData.color,
                hoist: roleData.hoist,
                permissions: new Permission(roleData.permissions.allow, roleData.permissions.deny),
                mentionable: roleData.mentionable
            }, `Loading backup`));
        }
    });

    return Promise.all(Promises);
};

var loadConfig = async function (guild, backupData) {
    var Promises = [];

    if (backupData.name) Promises.push(guild.edit({name: backupData.name}, `Loading backup`));
    if (backupData.verificationLevel) Promises.push(guild.edit({verificationLevel: backupData.verificationLevel}, `Loading backup`));
    if (backupData.defaultMessageNotifications) Promises.push(guild.edit({defaultNotifications: backupData.defaultMessageNotifications}, `Loading backup`));
    if (backupData.explicitContentFilter && guild.features.includes(`COMMUNITY`)) Promises.push(guild.edit({explicitContentFilter: backupData.explicitContentFilter}, `Loading backup`));

    if (backupData.icon) Promises.push(guild.edit({icon: backupData.icon}, `Loading backup`));
    if (backupData.splash) Promises.push(guild.edit({splash: backupData.splash}, `Loading backup`));
    if (backupData.banner) Promises.push(guild.edit({banner: backupData.banner}, `Loading backup`));

   return Promise.all(Promises);
};

var loadEmojis = function (guild, backupData) {
    var Promises = [];

    backupData.emojis.forEach(emoji => {Promises.push(guild.createEmoji({
        name: emoji.name,
        image: Buffer.from(emoji.base64, 'base64')
    }, `Loading backup`))});
    
    return Promise.all(Promises);
};

var loadChannels = function (guild, backupData) {
    var Promises = [];

    async function loadChannel(channelData, guild, category) {
        var createOptions, bitrate, bitrates;
        createOptions = {type: null, parentID: category?.id};

        //GUILD_TEXT / GUILD_NEWS
        if (channelData.type == 0 || channelData.type == 5) {
            createOptions.topic = channelData.topic;
            createOptions.nsfw = channelData.nsfw;
            createOptions.rateLimitPerUser = channelData.rateLimitPerUser;
            createOptions.type = channelData.isNews && guild.features.includes('NEWS') ? 5 : 0;
        };
        
        //GUILD_VOICE
        if (channelData.type == 2) {
            var MaxBitratePerTier = {
                NONE: 64000,
                TIER_1: 128000,
                TIER_2: 256000,
                TIER_3: 384000
            };
            bitrate = channelData.bitrate;
            bitrates = Object.values(MaxBitratePerTier);
            while (bitrate > MaxBitratePerTier[guild.premiumTier]) bitrate = bitrates[Object.keys(MaxBitratePerTier).indexOf(guild.premiumTier) - 1];
            createOptions.bitrate = bitrate;
            createOptions.userLimit = channelData.userLimit;
            createOptions.type = 2;
        };

        await guild.createChannel(channelData.name, createOptions.type, createOptions, `Loading backup`).then(async channel => {
            channelData.permissions.forEach(function (perm) {
                var role = guild.roles.find(r =>  r.name == perm.roleName);
                if (role) channel.editPermission(role.id, BigInt(perm.allow), BigInt(perm.deny), 0, `Loading backup`);
            });
        });
    };

    async function loadCategory(categoryData, guild) {
        var category = true;
        await guild.createChannel(categoryData.name, 4, {}, `Loading backup`).then(async category1 => {
            categoryData.permissions.forEach(function (perm) {
                var role = guild.roles.find(r =>  r.name == perm.roleName);
                if (role) category1.editPermission(role.id, BigInt(perm.allow), BigInt(perm.deny), 0, `Loading backup`);
            }); category = category1;
        }); return category
    };

    backupData.channels.categories.forEach(categoryData => {
        Promises.push(new Promise(async resolve => {
            loadCategory(categoryData, guild).then(async createdCategory => {
                categoryData.children.forEach(channelData => {
                    loadChannel(channelData, guild, createdCategory);
                    resolve(true);
                });
            });
        }));
    });

    backupData.channels.others.forEach(channelData => Promises.push(loadChannel(channelData, guild, null)));
    return Promise.all(Promises);
};

exports.loadBans = loadBans;
exports.loadRoles = loadRoles;
exports.loadConfig = loadConfig;
exports.loadEmojis = loadEmojis;
exports.loadChannels = loadChannels;