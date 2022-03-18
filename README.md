# Eris Backup

A package that allows your discord bot to facilitate server backup. (Uses mongodb)

# Install Package

To Install this package, type the following into your project's terminal:

`npm install eris-backup`

# Example Code

```js
const Eris = require(`eris`);
const backup = require(`eris-backup`);

const bot = new Eris(`Bot Token`);
backup.connectToDatabase(`MongoDB Database URI`);

bot.on(`ready`, async () => {
    console.log(`Ready!`);
});

bot.on(`messageCreate`, async (message) => {
    const args = message.content.substring(`!`).split(` `);
    if (message.author.bot || !message.member?.guild) return;
    if (!message.member.guild.permissionsOf(message.member.user.id).has(`administrator`)) return message.channel.createMessage(`This feature is only available for members with **ADMINISTRATOR**`);
    
    if (message.content.startsWith(`!create`)) {
        message.channel.createMessage(`Creating server backup... This may take a few seconds.`);
        backup.create(message.member.guild).then((data) => {
            message.channel.createMessage(`Successfully created a backup with the id \`${data.id}\``);
        });
    };
    
    if (message.content.startsWith(`!load`)) {
        if (!args[1]) return message.channel.createMessage(`You need to specify a backup id`);
        message.channel.createMessage(`Starting to load server backup... This may take a few seconds.`);
        backup.fetch(args[1]).then(async () => {
            backup.load(args[1], message.member.guild).catch(() => {
                message.channel.createMessage(`Please check that I have administrator permissions`);
            });
        }).catch(() => {
            message.channel.createMessage(`No backup found for \`${args[1]}\``);
        });
    };

    if (message.content.startsWith(`!info`)) {
        if (!args[1]) return message.channel.createMessage(`You need to specify a backup id`);
        backup.fetch(args[1]).then(backupInfos => {
            const date = new Date(backupInfos.data.createdTimestamp);
            const yyyy = date.getFullYear().toString();
            const mm = (date.getMonth() + 1).toString();
            const dd = date.getDate().toString();

            const formatedDate = `${yyyy}/${mm[1] ? mm : `0` + mm[0]}/${dd[1] ? dd : `0` + dd[0]}`;

            const embed = {
                author: {name: `Backup Information`, icon_url: bot.user.avatarURL || `https://cdn.glitch.me/82fe990a-7942-42e3-9790-39807ccdb9f6%2Ficon-404-dark.png`},
                fields: [
                    {name: `Backup ID`, value: `${backupInfos.id}`, inline: false},
                    {name: `Server ID`, value: `${backupInfos.data.id}`, inline: false},
                    {name: `Size`, value: `${backupInfos.size}`, inline: false},
                    {name: `Created At`, value: `${formatedDate}`, inline: false}
                ]
            };

            message.channel.createMessage({embed});
        }).catch(() => {
            message.channel.createMessage(`No backup found for \`${args[1]}\``);
        });
    };
});

bot.connect();
```

# Need Help? Join Our Discord Server!

https://discord.gg/4j8s8gnV7A
