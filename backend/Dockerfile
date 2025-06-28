FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Copy templates and static files
COPY templates ./templates
COPY static ./static

# Expose the port used by your backend
EXPOSE 8000

# Start the app
CMD ["npm", "start"]
