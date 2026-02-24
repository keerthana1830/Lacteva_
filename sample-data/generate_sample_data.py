#!/usr/bin/env python3
"""
Generate sample CSV data for LACTEVA device testing
This script creates realistic spectral readings that can be used to test the dashboard
"""

import csv
import random
import time
import math
from datetime import datetime, timedelta

def generate_spectral_reading(device_id="LACTEVA_001", freshness_level=0.8):
    """
    Generate a single spectral reading
    freshness_level: 0.0 (spoiled) to 1.0 (fresh)
    """
    timestamp_ms = int(time.time() * 1000)
    
    # VOC levels (higher = more spoiled)
    voc_base = 200 + (1 - freshness_level) * 800
    voc_raw = voc_base + random.gauss(0, 50)
    voc_voltage = voc_raw * 0.003  # Convert to voltage
    
    # LED mode
    led_mode = random.choice(["WHITE", "UV", "BLUE"])
    
    # AS7341 has 12 channels (415nm to 980nm approximately)
    wavelengths = [415, 445, 480, 515, 555, 590, 630, 680, 910, 940, 960, 980]
    
    # Generate raw channel data
    raw_channels = []
    for i, wl in enumerate(wavelengths):
        # Base intensity varies by wavelength and freshness
        if wl < 600:  # Visible range
            base_intensity = 1000 + freshness_level * 2000
        else:  # NIR range
            base_intensity = 800 + freshness_level * 1500
        
        # Add wavelength-specific variations
        if wl == 555:  # Green peak for fresh milk
            base_intensity *= (1 + freshness_level * 0.5)
        elif wl == 630:  # Red increases with spoilage
            base_intensity *= (1 + (1 - freshness_level) * 0.8)
        
        # Add noise
        intensity = base_intensity + random.gauss(0, base_intensity * 0.1)
        raw_channels.append(max(0, int(intensity)))
    
    # Generate reflectance data (percentage of reflected light)
    reflect_channels = []
    for raw in raw_channels:
        # Reflectance typically 10-90% of raw intensity
        reflectance = (raw / 4000) * 80 + 10 + random.gauss(0, 5)
        reflect_channels.append(max(0, min(100, reflectance)))
    
    # Generate absorbance data (log scale)
    abs_channels = []
    for reflect in reflect_channels:
        # Absorbance = -log10(reflectance/100)
        if reflect > 0:
            absorbance = -math.log10(reflect / 100) + random.gauss(0, 0.1)
        else:
            absorbance = 2.0  # High absorbance for zero reflectance
        abs_channels.append(max(0, absorbance))
    
    # CFU estimate (colony forming units - bacteria count)
    # Fresh milk: 1000-10000 CFU/mL
    # Spoiled milk: 100000+ CFU/mL
    cfu_base = 1000 + (1 - freshness_level) * 500000
    cfu_estimate = int(cfu_base * random.lognormvariate(0, 0.5))
    
    return {
        'timestamp_ms': timestamp_ms,
        'device_id': device_id,
        'voc_raw': voc_raw,
        'voc_voltage': voc_voltage,
        'led_mode': led_mode,
        'raw_channels': raw_channels,
        'reflect_channels': reflect_channels,
        'abs_channels': abs_channels,
        'cfu_estimate': cfu_estimate
    }

def format_csv_line(reading):
    """Format reading as CSV line matching the expected format"""
    # CSV format: timestamp_ms,VOC_raw,VOC_voltage,LED_Mode,raw_ch0..raw_ch11,reflect_ch0..reflect_ch11,abs_ch0..abs_ch11,CFU_est
    
    line_parts = [
        str(reading['timestamp_ms']),
        f"{reading['voc_raw']:.1f}",
        f"{reading['voc_voltage']:.3f}",
        reading['led_mode']
    ]
    
    # Add raw channels
    line_parts.extend([str(ch) for ch in reading['raw_channels']])
    
    # Add reflectance channels
    line_parts.extend([f"{ch:.2f}" for ch in reading['reflect_channels']])
    
    # Add absorbance channels
    line_parts.extend([f"{ch:.3f}" for ch in reading['abs_channels']])
    
    # Add CFU estimate
    line_parts.append(str(reading['cfu_estimate']))
    
    return "CSV," + ",".join(line_parts)

def generate_sample_dataset(filename="sample_readings.csv", num_samples=100):
    """Generate a complete sample dataset"""
    print(f"Generating {num_samples} sample readings...")
    
    with open(filename, 'w', newline='') as csvfile:
        # Write header comment
        csvfile.write("# LACTEVA Sample Data\n")
        csvfile.write("# Format: CSV,timestamp_ms,VOC_raw,VOC_voltage,LED_Mode,raw_ch0-11,reflect_ch0-11,abs_ch0-11,CFU_est\n")
        
        for i in range(num_samples):
            # Simulate milk degradation over time
            # Start fresh and gradually spoil
            freshness = max(0.1, 1.0 - (i / num_samples) * 0.9)
            
            # Add some randomness
            freshness += random.gauss(0, 0.1)
            freshness = max(0.0, min(1.0, freshness))
            
            reading = generate_spectral_reading(freshness_level=freshness)
            csv_line = format_csv_line(reading)
            
            csvfile.write(csv_line + "\n")
            
            # Add small delay to simulate real-time readings
            time.sleep(0.01)
    
    print(f"Sample data saved to {filename}")

def generate_realtime_stream(device_id="LACTEVA_001", duration_minutes=5):
    """Generate real-time stream of data for testing"""
    print(f"Generating real-time stream for {duration_minutes} minutes...")
    
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    filename = f"realtime_stream_{device_id}_{int(start_time)}.csv"
    
    with open(filename, 'w', newline='') as csvfile:
        csvfile.write("# LACTEVA Real-time Stream\n")
        csvfile.write(f"# Device: {device_id}\n")
        csvfile.write(f"# Started: {datetime.now().isoformat()}\n")
        
        sample_count = 0
        while time.time() < end_time:
            # Simulate gradual spoilage
            elapsed = time.time() - start_time
            freshness = max(0.2, 0.9 - (elapsed / (duration_minutes * 60)) * 0.3)
            
            # Add some noise and occasional spikes
            if random.random() < 0.05:  # 5% chance of anomaly
                freshness *= random.uniform(0.5, 1.5)
            
            freshness = max(0.0, min(1.0, freshness))
            
            reading = generate_spectral_reading(device_id, freshness)
            csv_line = format_csv_line(reading)
            
            csvfile.write(csv_line + "\n")
            csvfile.flush()  # Ensure data is written immediately
            
            sample_count += 1
            print(f"\rSamples generated: {sample_count} | Freshness: {freshness:.2f}", end="")
            
            # Wait for next sample (simulate 30-second intervals)
            time.sleep(30)
    
    print(f"\nReal-time stream saved to {filename}")

def main():
    """Main function to generate sample data"""
    print("LACTEVA Sample Data Generator")
    print("=" * 40)
    
    # Generate static sample dataset
    generate_sample_dataset("sample_readings.csv", 200)
    
    # Generate data for multiple devices
    devices = ["LACTEVA_001", "LACTEVA_002", "LACTEVA_003"]
    
    for device in devices:
        print(f"\nGenerating data for {device}...")
        
        # Generate historical data with different freshness patterns
        with open(f"historical_{device}.csv", 'w', newline='') as csvfile:
            csvfile.write(f"# Historical data for {device}\n")
            
            for i in range(50):
                # Different spoilage patterns for each device
                if device == "LACTEVA_001":
                    freshness = 0.9 - (i / 50) * 0.6  # Gradual spoilage
                elif device == "LACTEVA_002":
                    freshness = 0.8 if i < 30 else 0.3  # Sudden spoilage
                else:
                    freshness = 0.7 + 0.2 * math.sin(i / 10)  # Oscillating quality
                
                freshness = max(0.1, min(1.0, freshness + random.gauss(0, 0.05)))
                
                reading = generate_spectral_reading(device, freshness)
                csv_line = format_csv_line(reading)
                csvfile.write(csv_line + "\n")
    
    print("\n" + "=" * 40)
    print("Sample data generation complete!")
    print("\nFiles created:")
    print("- sample_readings.csv (200 samples)")
    print("- historical_LACTEVA_001.csv")
    print("- historical_LACTEVA_002.csv") 
    print("- historical_LACTEVA_003.csv")
    print("\nUse these files to test the dashboard and API endpoints.")

if __name__ == "__main__":
    main()