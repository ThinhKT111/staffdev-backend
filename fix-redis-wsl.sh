#!/bin/bash

# Fix Redis Configuration in WSL
# Run this script in your WSL Ubuntu terminal with: bash fix-redis-wsl.sh

echo "🚀 Redis WSL Configuration Fix"
echo ""

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "📦 Redis server is not installed. Installing now..."
    sudo apt update
    sudo apt install -y redis-server
else
    echo "✅ Redis server is already installed"
fi

# Make backup of original Redis config
echo "📑 Backing up original Redis configuration..."
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.bak

# Modify Redis configuration
echo "🔧 Updating Redis configuration to allow external connections..."
# Change bind address to allow all interfaces
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/g' /etc/redis/redis.conf
# Disable protected mode
sudo sed -i 's/protected-mode yes/protected-mode no/g' /etc/redis/redis.conf

# Restart Redis service
echo "🔄 Restarting Redis service..."
sudo systemctl restart redis-server

# Check Redis status
echo "🔍 Checking Redis service status..."
sudo systemctl status redis-server

# Test connection
echo "🧪 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is working correctly!"
    
    # Get WSL IP
    WSL_IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo "📝 Redis configuration is complete. Your WSL Redis server is at:"
    echo "   Host: $WSL_IP"
    echo "   Port: 6379"
    echo ""
    echo "💡 Update your .env file in your Windows project with:"
    echo "   REDIS_HOST=$WSL_IP"
    echo "   REDIS_PORT=6379"
else
    echo "❌ Redis is not responding correctly. Please check the service status."
fi

echo ""
echo "✨ Script completed. Remember to restart your NestJS application." 