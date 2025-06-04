# Hive Mind

AI-powered meeting assistant with transcription and analysis capabilities.

## Features

- Automated Google Meet joining
- Real-time audio transcription using AssemblyAI
- Meeting analysis and insights
- Firebase authentication
- Affine DB integration

## Project Structure



## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `MEET_URL`: Your Google Meet URL
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `FIREBASE_CLIENT_EMAIL`: Firebase client email
- `AFFINE_DB_HOST`: Affine database host
- `AFFINE_DB_PORT`: Affine database port
- `AFFINE_DB_NAME`: Affine database name
- `AFFINE_DB_USER`: Affine database user
- `AFFINE_DB_PASSWORD`: Affine database password
- `ASSEMBLYAI_API_KEY`: AssemblyAI API key

## Development

- `npm run dev`: Start development server
- `npm test`: Run tests
- `npm start`: Start production server

## License

MIT 