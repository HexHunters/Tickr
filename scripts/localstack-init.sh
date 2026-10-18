#!/bin/bash

# LocalStack initialization script
# Creates AWS resources for local development

set -e

echo "🚀 Initializing LocalStack resources..."

echo "✅ LocalStack is ready!"

# Create S3 bucket for event images
echo "📦 Creating S3 bucket: tickr-dev..."
awslocal s3 mb s3://tickr-dev || echo "Bucket already exists"
awslocal s3api put-bucket-cors --bucket tickr-dev --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}'

# Create SES verified email
echo "📧 Setting up SES..."
awslocal ses verify-email-identity --email-address noreply@tickr.local
awslocal ses verify-email-identity --email-address support@tickr.local

# Create SES configuration set for notification tracking
echo "📧 Creating SES configuration set..."
awslocal ses create-configuration-set --configuration-set '{"Name":"tickr-notifications"}' || echo "Configuration set already exists"

# Create SNS topic for notifications
echo "📢 Creating SNS topic..."
awslocal sns create-topic --name tickr-notifications || echo "Topic already exists"

# Create SNS SMS sandbox phone numbers for development
echo "📱 Setting up SNS SMS sandbox..."
awslocal sns set-sms-attributes --attributes DefaultSMSType=Transactional || echo "SMS attributes set"

# Create Secrets Manager secrets
echo "🔐 Creating secrets..."
awslocal secretsmanager create-secret \
  --name tickr/jwt/secret \
  --secret-string "dev-super-secret-jwt-key" || echo "Secret already exists"

awslocal secretsmanager create-secret \
  --name tickr/db/password \
  --secret-string "postgres" || echo "Secret already exists"

echo "✅ LocalStack initialization complete!"
