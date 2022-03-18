var Snowflake = require(`snowflake-util`);
var {Database} = require(`quickmongo`);
var SnowflakeUtil = new Snowflake();
var createMaster = require(`./create`);
var loadMaster = require(`./load`);
var filesize = require(`filesize`);
var os = require(`os`);
var db;

var load = async function (backup, guild) {
    async function clearGuild(guild) {
        if (!guild.permissionsOf(guild.shard.client.user.id).has(`banMembers`)) throw new Error(`Missing permissions`);
        if (!guild.permissionsOf(guild.shard.client.user.id).has(`manageGuild`)) throw new Error(`Missing permissions`);
        if (!guild.permissionsOf(guild.shard.client.user.id).has(`manageRoles`)) throw new Error(`Missing permissions`);
        if (!guild.permissionsOf(guild.shard.client.user.id).has(`manageEmojis`)) throw new Error(`Missing permissions`);
        if (!guild.permissionsOf(guild.shard.client.user.id).has(`manageChannels`)) throw new Error(`Missing permissions`);

        var bans = await guild.getBans();
        guild.roles.filter(role => !role.managed && role.id != guild.id).forEach(role => role.delete(`Loading backup`));
        bans.forEach(ban => guild.unbanMember(ban.user?.id || ban.user, `Loading backup`));
        guild.channels.forEach(channel => channel.delete(`Loading backup`));
        guild.emojis.forEach(emoji => emoji.delete(`Loading backup`));
        
        guild.edit({
            icon: null,
            banner: null,
            splash: null
        }, `Loading backup`);

        guild.edit({
            afkChannelID: null,
            afkTimeout: 60 * 5,
            defaultNotifications: 1
        }, `Loading backup`);

        if (!guild.features.includes('COMMUNITY')) {
            guild.edit({
                verificationLevel: 0,
                explicitContentFilter: 0
            }, `Loading backup`);
        };
    };

    if (!guild) throw new Error(`Invalid guild`);
    if (!backup || typeof backup != `string`) throw new Error(`Invalid backup`);
    let backupData = await fetch(backup).catch(() => {throw new Error(`Invalid backup`)});
    backupData = backupData.data;
    await clearGuild(guild);

    Promise.all([
        loadMaster.loadConfig(guild, backupData),
        loadMaster.loadRoles(guild, backupData),
        loadMaster.loadChannels(guild, backupData),
        loadMaster.loadEmojis(guild, backupData),
        loadMaster.loadBans(guild, backupData)
    ]);
};

var create = async function (guild) {
    let backupData = {
        name: guild.name,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        channels: [],
        roles: [],
        bans: [],
        emojis: [],
        guildID: guild.id,
        createdTimestamp: Date.now(),
        id: SnowflakeUtil.generate(Date.now())
    };
    
    backupData.bans = await createMaster.getBans(guild);
    backupData.roles = await createMaster.getRoles(guild);
    backupData.emojis = await createMaster.getEmojis(guild);
    backupData.channels = await createMaster.getChannels(guild);
                            
    if (guild.dynamicIconURL()) {backupData.icon = guild.dynamicIconURL()};
    if (guild.dynamicSplashURL()) {backupData.splash = guild.dynamicSplashURL()};
    if (guild.dynamicBannerURL()) {backupData.banner = guild.dynamicBannerURL()};

    await db.set(`backup_${backupData.id}`, JSON.parse(JSON.stringify(backupData, null, 4)));
    return backupData;
};

var fetch = async function (backupID) {
    var backupData =  await db.get(`backup_${backupID}`);
    if (backupData) {
        var size = Buffer.byteLength(JSON.stringify(backupData));
        var backupInfo = {data: backupData, id: backupID, size: filesize(size, {round: 0})};
        return backupInfo;
    } else {throw new Error(`No backup found`)};
};

var connectToDatabase = async function (uri) {
    db = new Database(uri, `backups`, {useUnifiedTopology: true, maxPoolSize: os.cpus().length * 5, minPoolSize: os.cpus().length});
};

exports.load = load;
exports.fetch = fetch;
exports.create = create;
exports.connectToDatabase = connectToDatabase;

exports.default = {
    load: exports.load,
    fetch: exports.fetch,
    create: exports.create,
    connectToDatabase: exports.connectToDatabase
};
