const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const { unlinkSync } = require('fs');
const { state, saveState } = useSingleFileAuthState('./auth_info.json'); // auth_info.json for session handling
const express = require('express');
const path = require('path'); // Import to handle path for dynamic commands
const app = express();
const port = process.env.PORT || 3000;

// Function to handle WhatsApp connection and QR scanning
async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    // Save authentication state whenever there’s an update
    sock.ev.on('creds.update', saveState);

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error === Boom)?.output?.statusCode !== 401;
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
            else unlinkSync('./auth_info.json'); // Delete auth_info.json if authentication fails
        } else if (connection === 'open') {
            console.log('Connection opened to WhatsApp');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (msg) => {
        console.log('New message: ', JSON.stringify(msg, undefined, 2));

        // Process only text messages
        const message = msg.messages[0];
        if (message.message?.conversation) {
            const messageText = message.message.conversation.toLowerCase();
            const sender = message.key.remoteJid;

            // Dynamically load the corresponding command from the CMD folder
            try {
                const commandPath = path.resolve(__dirname, `./CMD/${messageText}_cmd.js`); // Resolve path to the command
                const commandModule = require(commandPath); // Import the command dynamically
                const response = await commandModule.handle_command(messageText); // Call the command handler
                await sock.sendMessage(sender, { text: response });
            } catch (error) {
                console.log('Command not found:', error.message);
                await sock.sendMessage(sender, { text: 'Command not recognized.' });
            }
        }
    });
}

// Start the bot
connectToWhatsApp();

// Start Express app
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
