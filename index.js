const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");
const fs = require("fs");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const BOOSTED_USER_IDS = new Set();
const TOKEN =
  "MTI1ODc4MjAxNjI1MDMxODg3OA.Gaqtlu.GVcRFHwnFrqVjvfPLfZ9Kfr8yYWozYyG53WEVI";
const ROLE_ID = "1258810313348874414"; // Reemplaza con el ID del rol específico
const LOG_CHANNEL_ID = "1258815206021402764"; // Reemplaza con el ID del canal de registro

const CONSOLE_CHANNEL_ID = "1074451929956089967"

client.on("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  console.log("guildMemberUpdate evento detectado");
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  if (!oldRoles.has(ROLE_ID) && newRoles.has(ROLE_ID)) {
    /* if (newMember.premiumSinceTimestamp === null) {
      console.log("El miembro no ha hecho boost");
      return;
    } */

    // El miembro ha recibido el rol específico
    console.log(
      `Miembro ${newMember.user.tag} ha recibido el rol con ID ${ROLE_ID}`
    );

    BOOSTED_USER_IDS.add(newMember.id);

    try {
      newMember
        .send(
          "¡Gracias por unirte! Por favor, responde con tu nick de minecraft **(ASEGURATE DE ESCRIBIRLO BIEN SINO NO RECIBIRAS TU KIT DE MANERA AUTOMATICA)**."
        )
        .catch(console.error);
    } catch (error) {
      console.log("Error al enviar mensaje privado");
    }

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    if (logChannel) {
      logChannel.send(`El usuario ${newMember.user.tag} ha recibido el rol.`);
    } else {
      console.log("No se pudo encontrar el canal de registro.");
    }
  } else {
    console.log(`No se detectaron cambios de rol para ${newMember.user.tag}`);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.channel.type === 1 && BOOSTED_USER_IDS.has(message.author.id)) {
    if (message.attachments.size > 0 || message.embeds.length > 0) {
      await message.author
        .send(
          "Por favor, solo envía tu nick de Minecraft. No envíes archivos ni embeds."
        )
        .catch(console.error);
      return;
    }

    // El mensaje es de un usuario que ha recibido el rol recientemente
    console.log(`Registrando nick para ${message.author.tag}`);
    fs.appendFileSync(
      "boosted_users.txt",
      `ID:${message.author.id} - ${message.author.username}: ${message.content}\n`
    );

    // Remueve al usuario del conjunto una vez que ha enviado su nick
    BOOSTED_USER_IDS.delete(message.author.id);

    try {
      await message.author
        .send("¡Gracias! Hemos registrado tu nick.")
        .catch(console.error);
    } catch (error) {
      console.log("Error al enviar mensaje privado");
    }

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    const consoleChannel = await client.channels.fetch(CONSOLE_CHANNEL_ID);

    /* Serializar el message.content para no permitir espacios vacios ni caracteres raros, permitir barras baja */

    const nick = message.content.replace(/[^a-zA-Z0-9_]/g, "_");

    if (logChannel) {
      logChannel.send(`/mi give armor booster ${nick} 1`);
      if(consoleChannel) {
        consoleChannel.send(`mi give armor booster ${nick} 1`);
      }
    } else {
      console.log("No se pudo encontrar el canal de registro.");
    }
  }
});

client.login(TOKEN);
