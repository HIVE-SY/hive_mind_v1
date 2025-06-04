#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env

# Set Google Cloud project
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Build the Docker image
echo "Building Docker image..."
docker build -t gcr.io/$GOOGLE_CLOUD_PROJECT/hive-mind-bot .

# Push the image to Google Container Registry
echo "Pushing image to Google Container Registry..."
docker push gcr.io/$GOOGLE_CLOUD_PROJECT/hive-mind-bot

# Create secrets if they don't exist
echo "Creating secrets..."
kubectl create secret generic hive-mind-secrets \
  --from-literal=GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
  --from-literal=GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
  --from-literal=GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI \
  --from-literal=BOT_REFRESH_TOKEN=$BOT_REFRESH_TOKEN \
  --from-literal=BOT_EMAIL=$BOT_EMAIL \
  --from-literal=BOT_EMAIL_PASSWORD=$BOT_EMAIL_PASSWORD \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy hive-mind-bot \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/hive-mind-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT"

echo "Deployment complete!" 