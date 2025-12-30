# KM200 Network Sniffing Guide

This guide will help you capture and analyze network traffic between your iOS app and the KM200 to discover the correct encryption parameters.

## Prerequisites

- Your Mac and iOS device on the same network (192.168.5.x)
- Buderus iOS app installed on your iPhone/iPad
- Admin/sudo access on your Mac
- Optional: Wireshark installed (`brew install wireshark`)

## Method 1: Quick Capture (Recommended)

### Step 1: Start the Capture

```bash
cd /Users/stentamkivi/git/buderus-cc/backend
sudo ./capture-km200-traffic.sh
```

This will:
- Capture 60 seconds of traffic to/from the KM200
- Save it to `km200-traffic.pcap`
- You'll see a countdown

### Step 2: Use Your iOS App

While the capture is running:
1. Open the Buderus app on your iOS device
2. Navigate through different screens
3. View temperatures, settings, etc.
4. This generates traffic we can analyze

### Step 3: Analyze the Capture

Convert to text format:
```bash
tcpdump -r km200-traffic.pcap -A > km200-traffic.txt
```

Run the analysis script:
```bash
python3 analyze-km200-traffic.py
```

## Method 2: Manual Wireshark Analysis

If you have Wireshark installed:

```bash
# Start capture
sudo ./capture-km200-traffic.sh

# Open in Wireshark
open km200-traffic.pcap
```

In Wireshark, look for:
1. **HTTP GET/POST requests** - Check the paths being accessed
2. **HTTP responses** - Look for base64 encoded data
3. **Headers** - Check User-Agent and other headers
4. **Follow HTTP Stream** - Right-click on a packet → Follow → HTTP Stream

## What to Look For

### 1. Endpoints Being Accessed
Look for paths like:
- `/gateway/uuid`
- `/gateway/DateTime`
- `/system/sensors/temperatures/outdoor_t1`
- etc.

### 2. User-Agent String
Should be something like: `TeleHeater/2.2.3` or similar

### 3. Encrypted Responses
Base64-encoded data in HTTP responses. Note:
- Do multiple responses start with the same characters?
- This could indicate a common encryption key

### 4. Any Plaintext Data
Sometimes device info might be sent in headers or metadata

## Alternative: ARP Spoofing (Advanced)

If simple capture doesn't work, you can use ARP spoofing to intercept traffic:

```bash
# Enable IP forwarding
sudo sysctl -w net.inet.ip.forwarding=1

# Use arpspoof to intercept iOS device traffic
sudo arpspoof -i en0 -t <iOS_DEVICE_IP> 192.168.5.77
```

⚠️ **Warning**: Only use this on your own network!

## Troubleshooting

### "Permission denied" when running tcpdump
You need sudo access. The script will prompt for your password.

### "No packets captured"
- Make sure your iOS device is on the same network
- Verify the KM200 IP is correct (192.168.5.77)
- Try accessing the app while capture is running

### "Can't open Wireshark"
Install it first:
```bash
brew install --cask wireshark
```

## What We're Looking For

The goal is to find:
1. **Device UUID/Salt**: A unique identifier for your KM200
2. **Encryption Key**: Derived from gateway password + salt + private password
3. **Algorithm Details**: Confirm it's AES-128-ECB
4. **Endpoint Structure**: Valid paths to query

Once we have the device salt/UUID, we can calculate the correct encryption key!

## Next Steps

After capturing and analyzing:
1. Share any UUIDs or device IDs you find
2. Note which endpoints the iOS app is using
3. We'll update the KM200 client with the correct salt
4. Switch from DEMO_MODE to real data!

## Need Help?

If you get stuck, we can:
- Try alternative KM200 libraries
- Check Home Assistant's KM200 integration approach
- Look for device info on the KM200 physical display
