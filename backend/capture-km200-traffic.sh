#!/bin/bash
# Capture network traffic between iOS device and KM200
# This will help us discover the encryption parameters

KM200_IP="192.168.5.77"
CAPTURE_FILE="km200-traffic.pcap"
DURATION=60  # Capture for 60 seconds

echo "========================================="
echo "KM200 Traffic Capture Tool"
echo "========================================="
echo ""
echo "KM200 IP: $KM200_IP"
echo "Capture Duration: ${DURATION}s"
echo "Output File: $CAPTURE_FILE"
echo ""
echo "Instructions:"
echo "1. Make sure your iOS device is on the same network"
echo "2. Open the Buderus app on your iOS device"
echo "3. Navigate through the app to trigger some requests"
echo "4. This script will capture the traffic"
echo ""
echo "Starting capture in 5 seconds..."
echo "Press Ctrl+C to stop early"
echo ""
sleep 5

echo "🎯 Capturing traffic..."
echo ""

# Capture packets to/from KM200
sudo tcpdump -i any -w "$CAPTURE_FILE" "host $KM200_IP" -c 100 &
TCPDUMP_PID=$!

# Wait for duration or until user stops
sleep $DURATION 2>/dev/null || true

# Stop tcpdump
sudo kill $TCPDUMP_PID 2>/dev/null || true

echo ""
echo "✅ Capture complete!"
echo ""
echo "To analyze the capture:"
echo "  1. Open with Wireshark: open $CAPTURE_FILE"
echo "  2. Or use our analysis script: ./analyze-km200-traffic.sh"
echo ""
