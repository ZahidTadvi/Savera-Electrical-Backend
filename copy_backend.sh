#!/bin/bash

# ElectroMart Backend Copy Script
# This script helps you copy the backend files to a new directory

echo "🚀 ElectroMart Backend Copy Script"
echo "=================================="

# Create destination directory
DEST_DIR="electromart-backend"
echo "📁 Creating directory: $DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy all backend files
echo "📋 Copying backend files..."
cp -r backend-separate/* "$DEST_DIR/"

echo "✅ Backend files copied successfully!"
echo ""
echo "📦 Your backend is ready at: ./$DEST_DIR"
echo ""
echo "🔧 Next steps:"
echo "1. cd $DEST_DIR"
echo "2. npm install"
echo "3. Copy .env.example to .env and configure"
echo "4. npm run dev (for development)"
echo "5. Follow DEPLOYMENT.md for production deployment"
echo ""
echo "📚 Documentation:"
echo "- README.md - Complete setup guide"
echo "- DEPLOYMENT.md - Render deployment steps"
echo "- .env.example - Environment variables template"
echo ""
echo "🎉 Happy coding!"
