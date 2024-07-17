const { Client, GatewayIntentBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

const prisma = new PrismaClient();
const token = 'TU_BOT_TOKEN_AQUI';
const guildId = 'TU_GUILD_ID_AQUI';
const logChannelId = 'TU_LOG_CHANNEL_ID_AQUI'; // Canal donde se muestran las mejoras
const notificationChannelId = 'TU_NOTIFICATION_CHANNEL_ID_AQUI'; // Canal donde se enviarán las notificaciones

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Obtener todos los boosters actuales y agregarlos a la base de datos
  const guild = await client.guilds.fetch(guildId);
  const boosterRole = guild.roles.premiumSubscriberRole;

  if (boosterRole) {
    const boosters = boosterRole.members;

    for (const [userId, member] of boosters) {
      const boostStartDate = new Date(); // Suponiendo que el boost comenzó hoy, ajusta según tu necesidad

      await prisma.booster.upsert({
        where: { userId },
        update: {
          boostCount: { increment: 1 }
        },
        create: {
          userId,
          boostStartDate,
          boostCount: 1
        }
      });

      console.log(`${member.user.tag} ha sido registrado como booster inicial.`);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.channel.id === logChannelId) {
    const userId = message.author.id;
    const boostStartDate = new Date();

    const booster = await prisma.booster.upsert({
      where: { userId },
      update: {
        boostCount: { increment: 1 }
      },
      create: {
        userId,
        boostStartDate,
        boostCount: 1
      }
    });

    console.log(`${message.author.tag} ha realizado ${booster.boostCount} mejoras.`);
  }
});

const checkBoosters = async (days, sendDM = false) => {
  const guild = await client.guilds.fetch(guildId);
  const boosterRole = guild.roles.premiumSubscriberRole;
  const now = new Date();
  const notificationChannel = await client.channels.fetch(notificationChannelId);

  if (boosterRole) {
    const boosters = await prisma.booster.findMany();

    for (const booster of boosters) {
      const member = await guild.members.fetch(booster.userId).catch(() => null);
      if (member && member.roles.cache.has(boosterRole.id)) {
        const boostDuration = now - booster.boostStartDate;

        if (boostDuration >= days * 24 * 60 * 60 * 1000) {
          await notificationChannel.send(`${member.user.tag} ha estado boosteando por al menos ${days} días con ${booster.boostCount} mejoras.`);
          
          if (sendDM) {
            await member.send(`Gracias por boostear el servidor por al menos ${days} días. Aquí está tu recompensa!`);
          }
        }
      } else {
        // Si el miembro ya no está boosteando, notifícalo y elimínalo de la base de datos
        await notificationChannel.send(`${member ? member.user.tag : 'Un usuario'} ha dejado de boostear el servidor.`);
        await prisma.booster.delete({ where: { userId: booster.userId } });

        if (member) {
          await member.send(`Has dejado de boostear el servidor. Gracias por tu apoyo anterior!`);
        }
      }
    }
  }
};

// Tareas cron para enviar notificaciones
cron.schedule('0 0 * * *', async () => {
  await checkBoosters(7, true);  // Comprobar boosters después de 7 días y enviar DM
  await checkBoosters(15, true); // Comprobar boosters después de 15 días y enviar DM
  await checkBoosters(30, true); // Comprobar boosters después de 30 días y enviar DM
});

client.login(token);

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  client.destroy();
  process.exit();
});
