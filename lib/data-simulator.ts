import { SpectralReading } from '@/types'

export class DataSimulator {
  private intervalId: NodeJS.Timeout | null = null
  private callbacks: ((reading: SpectralReading) => void)[] = []

  start(intervalMs: number = 30000) {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      const reading = this.generateReading()
      this.callbacks.forEach(callback => callback(reading))
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  onReading(callback: (reading: SpectralReading) => void) {
    this.callbacks.push(callback)
  }

  private generateReading(): SpectralReading {
    const now = Date.now()
    const freshness = 0.5 + Math.random() * 0.4 // Random freshness between 0.5-0.9
    
    return {
      _id: `sim_${now}`,
      deviceId: 'LACTEVA_001',
      timestamp: new Date(now),
      timestampMs: now,
      vocRaw: 300 + (1 - freshness) * 700 + Math.random() * 100,
      vocVoltage: 1.0 + (1 - freshness) * 2.0 + Math.random() * 0.5,
      ledMode: ['WHITE', 'UV', 'BLUE'][Math.floor(Math.random() * 3)],
      rawChannels: Array.from({ length: 12 }, () => 
        800 + freshness * 1200 + Math.random() * 200 - 100
      ),
      reflectChannels: Array.from({ length: 12 }, () => 
        15 + freshness * 25 + Math.random() * 10
      ),
      absChannels: Array.from({ length: 12 }, () => 
        0.3 + (1 - freshness) * 0.8 + Math.random() * 0.2
      ),
      cfuEstimate: Math.floor(1000 + (1 - freshness) * 99000 + Math.random() * 10000),
      predictions: {
        freshness: freshness > 0.7 ? 'fresh' : freshness > 0.4 ? 'moderate' : 'spoiled',
        freshnessScore: freshness,
        shelfLifeHours: freshness * 72 + Math.random() * 12,
        confidence: 0.8 + Math.random() * 0.2,
        riskLevel: freshness > 0.7 ? 'low' : freshness > 0.4 ? 'medium' : 'high'
      }
    }
  }
}

export const dataSimulator = new DataSimulator()