#!/usr/bin/env python3
"""
Analyze captured KM200 traffic to discover encryption parameters
"""

import sys
import re
import base64
from collections import defaultdict

def analyze_pcap_text(filename):
    """
    Analyze tcpdump output in text format
    Run: tcpdump -r km200-traffic.pcap -A > km200-traffic.txt
    """
    try:
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        print("\nFirst convert pcap to text:")
        print(f"  tcpdump -r km200-traffic.pcap -A > {filename}")
        return

    print("🔍 Analyzing KM200 Traffic...")
    print("=" * 60)

    # Look for HTTP requests and responses
    http_requests = re.findall(r'(GET|POST|PUT) (/[^\s]*) HTTP', content)
    endpoints = set()

    for method, path in http_requests:
        endpoints.add(f"{method} {path}")

    print(f"\n📡 HTTP Endpoints Found ({len(endpoints)}):")
    for endpoint in sorted(endpoints):
        print(f"  {endpoint}")

    # Look for User-Agent headers
    user_agents = re.findall(r'User-Agent: ([^\r\n]+)', content)
    if user_agents:
        print(f"\n📱 User-Agent Strings:")
        for ua in set(user_agents):
            print(f"  {ua}")

    # Look for potential base64 encoded data (KM200 responses)
    base64_pattern = r'([A-Za-z0-9+/]{40,}={0,2})'
    potential_encrypted = re.findall(base64_pattern, content)

    if potential_encrypted:
        print(f"\n🔐 Potential Encrypted Responses Found: {len(potential_encrypted)}")
        print("\nFirst few encrypted responses:")
        for i, encrypted in enumerate(potential_encrypted[:3]):
            print(f"\n  [{i+1}] Length: {len(encrypted)} bytes")
            print(f"      First 60 chars: {encrypted[:60]}...")

            # Try to detect patterns
            if encrypted[:20] == potential_encrypted[0][:20]:
                print(f"      ⚠️  Starts with same pattern as first response")

    # Look for any mentions of UUID, salt, device ID
    keywords = ['uuid', 'UUID', 'salt', 'SALT', 'device', 'Device', 'serial', 'Serial']
    print(f"\n🔑 Searching for encryption-related keywords:")
    for keyword in keywords:
        matches = re.findall(f'.{{0,30}}{keyword}.{{0,30}}', content, re.IGNORECASE)
        if matches:
            print(f"\n  '{keyword}' found in {len(matches)} locations:")
            for match in matches[:3]:
                clean_match = match.strip().replace('\n', ' ')
                print(f"    {clean_match}")

    print("\n" + "=" * 60)
    print("✅ Analysis complete!")
    print("\n💡 Next steps:")
    print("  1. Check the endpoints above - do they match our expected paths?")
    print("  2. Look for any device identifiers or UUIDs")
    print("  3. If you see User-Agent, verify it matches 'TeleHeater/2.2.3'")
    print("  4. Open km200-traffic.pcap in Wireshark for detailed analysis")

def main():
    if len(sys.argv) > 1:
        filename = sys.argv[1]
    else:
        filename = "km200-traffic.txt"

    analyze_pcap_text(filename)

if __name__ == "__main__":
    main()
