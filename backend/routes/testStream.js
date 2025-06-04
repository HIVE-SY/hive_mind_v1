const path = require('path');
const { connectToAssemblyAI, simulateStreamingAudio } = require('./streamToAssembly');

(async () => {
  const ws = await connectToAssemblyAI();

  const filePath = path.resolve(__dirname, 'test-audio.wav'); // Use your own 16KHz mono WAV file
  simulateStreamingAudio(ws, filePath);
})();
