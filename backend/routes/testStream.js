import path from 'path';
import { connectToAssemblyAI, simulateStreamingAudio } from './streamToAssembly.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const ws = await connectToAssemblyAI();

  const filePath = path.resolve(__dirname, 'test-audio.wav'); // Use your own 16KHz mono WAV file
  simulateStreamingAudio(ws, filePath);
})();
