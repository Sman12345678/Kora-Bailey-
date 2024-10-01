const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const { unlinkSync } = require('fs');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    // Save authentication info to a file
    sock.ev.on('creds.update', saveState);

    // Handle connection errors
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error === Boom)?.output?.statusCode !== 401;
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
            else unlinkSync('./auth_info.json'); // Delete file if authentication fails
        } else if (connection === 'open') {
            console.log('Connection opened to WhatsApp');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (msg) => {
        console.log('New messages: ', JSON.stringify(msg, undefined, 2));

        // Process only text messages
        const message = msg.messages[0];
        if (message.message?.conversation) {
            const messageText = message.message.conversation.toLowerCase();
            const sender = message.key.remoteJid;

            // Extract command name
            const commandName = messageText.split(' ')[0]; // Get the first word as command

            // Dynamically import the corresponding CMD module
            try {
                const commandModule = require(`./CMD/${commandName}_cmd`); // Ensure your command files follow this naming convention
                const response = await commandModule.handleCommand(messageText);
                await sock.sendMessage(sender, { text: response });
            } catch (error) {
                console.log('Command not found:', error);
                await sock.sendMessage(sender, { text: 'Command not recognized.' });
            }
        }
    });
}

// Start the bot
connectToWhatsApp();
