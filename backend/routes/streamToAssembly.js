const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const AAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

// Connect to AssemblyAI’s real-time endpoint
function connectToAssemblyAI() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000`, {
      headers: {
        Authorization: AAI_API_KEY,
      },
    });

    ws.on('open', () => {
      console.log('🟢 Connected to AssemblyAI WebSocket');
      resolve(ws);
    });

    ws.on('error', (err) => {
      console.error('❌ WebSocket error:', err.message);
      reject(err);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.text) {
        console.log('📝 Transcript:', msg.text);
      }
    });

    ws.on('close', () => {
      console.log('🔴 WebSocket closed');
    });
  });
}

const simulateStreamingAudio = (ws, audioPath) => {
    const audioStream = fs.createReadStream(audioPath, { highWaterMark: 3200 });
  
    audioStream.on('data', (chunk) => {
      ws.send(
        JSON.stringify({
          audio_data: chunk.toString('base64'),
        })
      );
    });
  
    audioStream.on('end', () => {
      ws.send(JSON.stringify({ terminate_session: true }));
      console.log('📤 Finished sending audio.');
    });
  };

  module.exports = { connectToAssemblyAI, simulateStreamingAudio };