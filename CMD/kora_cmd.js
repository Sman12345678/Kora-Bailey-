const axios = require('axios');

// Command Metadata
const AUTHOR = 'KOLAWOLE SULEIMAN';
const NAME = 'KORA';
const VERSION = '1.0';
const DESCRIPTION = 'GET RESPONSE FROM KORA AI';

async function handleCommand(query) {
    const KORA_API_URL = `https://kora-ai.onrender.com/koraai?query=${encodeURIComponent(query)}`;

    try {
        const response = await axios.get(KORA_API_URL);
        if (response.data && response.data.response) {
            return response.data.response; // Return the response from KORA AI
        } else {
            return 'No response found from KORA AI.';
        }
    } catch (error) {
        return `Error communicating with KORA AI: ${error.message}`;
    }
}

module.exports = {
    handleCommand,
    AUTHOR,
    NAME,
    VERSION,
    DESCRIPTION
};
