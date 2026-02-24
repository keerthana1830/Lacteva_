"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Loader2 } from 'lucide-react'
import { SpectralReading } from '@/types'
import { formatTimestamp, getFreshnessColor } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PDFExportProps {
  reading: SpectralReading | null
  modelAccuracy?: number
}

export function PDFExport({ reading, modelAccuracy = 0.95 }: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    if (!reading) return

    setIsGenerating(true)
    
    try {
      // Create a temporary div for PDF content
      const pdfContent = document.createElement('div')
      pdfContent.style.width = '800px'
      pdfContent.style.padding = '40px'
      pdfContent.style.backgroundColor = 'white'
      pdfContent.style.fontFamily = 'Arial, sans-serif'
      pdfContent.style.position = 'absolute'
      pdfContent.style.left = '-9999px'
      
      // Generate PDF content
      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">LACTEVA</h1>
          <h2 style="color: #64748b; margin: 5px 0; font-size: 18px;">Milk Quality Analysis Report</h2>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #1e293b; margin-bottom: 15px;">Sample Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Device ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.deviceId}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Timestamp:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${formatTimestamp(reading.timestamp)}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>LED Mode:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.ledMode}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>VOC Level:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.vocVoltage?.toFixed(3)} V</td></tr>
              <tr><td style="padding: 8px 0;"><strong>CFU Estimate:</strong></td><td style="padding: 8px 0;">${reading.cfuEstimate?.toLocaleString()} CFU/mL</td></tr>
            </table>
          </div>

          <div>
            <h3 style="color: #1e293b; margin-bottom: 15px;">Quality Assessment</h3>
            <div style="background: ${reading.predictions?.freshness === 'fresh' ? '#dcfce7' : reading.predictions?.freshness === 'moderate' ? '#fef3c7' : '#fee2e2'}; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 15px;">
              <div style="font-size: 24px; font-weight: bold; color: ${reading.predictions?.freshness === 'fresh' ? '#166534' : reading.predictions?.freshness === 'moderate' ? '#92400e' : '#dc2626'};">
                ${reading.predictions?.freshness?.toUpperCase() || 'UNKNOWN'}
              </div>
              <div style="font-size: 14px; color: #64748b; margin-top: 5px;">
                Quality Grade: ${reading.predictions?.freshnessScore ? (reading.predictions.freshnessScore >= 0.8 ? 'A' : reading.predictions.freshnessScore >= 0.6 ? 'B' : reading.predictions.freshnessScore >= 0.4 ? 'C' : 'D') : 'N/A'}
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Freshness Score:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.predictions?.freshnessScore ? (reading.predictions.freshnessScore * 100).toFixed(1) + '%' : 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Shelf Life:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.predictions?.shelfLifeHours ? reading.predictions.shelfLifeHours.toFixed(1) + ' hours' : 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Confidence:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${reading.predictions?.confidence ? (reading.predictions.confidence * 100).toFixed(1) + '%' : 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Risk Level:</strong></td><td style="padding: 8px 0;">${reading.predictions?.riskLevel?.toUpperCase() || 'N/A'}</td></tr>
            </table>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; margin-bottom: 15px;">Spectral Data Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #475569;">Raw Intensity</h4>
              <div style="font-size: 18px; font-weight: bold; color: #3b82f6;">
                ${reading.rawChannels ? Math.max(...reading.rawChannels).toFixed(0) : 'N/A'}
              </div>
              <div style="font-size: 12px; color: #64748b;">Peak Value</div>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #475569;">Avg Reflectance</h4>
              <div style="font-size: 18px; font-weight: bold; color: #10b981;">
                ${reading.reflectChannels ? (reading.reflectChannels.reduce((a, b) => a + b, 0) / reading.reflectChannels.length).toFixed(1) + '%' : 'N/A'}
              </div>
              <div style="font-size: 12px; color: #64748b;">Average Value</div>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #475569;">Avg Absorbance</h4>
              <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">
                ${reading.absChannels ? (reading.absChannels.reduce((a, b) => a + b, 0) / reading.absChannels.length).toFixed(3) : 'N/A'}
              </div>
              <div style="font-size: 12px; color: #64748b;">AU Units</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; margin-bottom: 15px;">ML Model Performance</h3>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Model Accuracy</div>
                <div style="font-size: 24px; font-weight: bold; color: #1e293b;">${(modelAccuracy * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Prediction Confidence</div>
                <div style="font-size: 24px; font-weight: bold; color: #1e293b;">${reading.predictions?.confidence ? (reading.predictions.confidence * 100).toFixed(1) + '%' : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; margin-bottom: 15px;">Recommendations</h3>
          <div style="background: ${reading.predictions?.freshness === 'fresh' ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 8px;">
            ${reading.predictions?.freshness === 'fresh' 
              ? '<strong>✓ Safe for consumption</strong><br>• Store in refrigerator below 4°C<br>• Consume within predicted shelf life<br>• Monitor for any changes in smell or texture'
              : '<strong>⚠ Not recommended for consumption</strong><br>• Dispose of sample safely<br>• Clean and sanitize equipment<br>• Investigate source of contamination'
            }
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px;">
          <p>This report was generated by LACTEVA Milk Quality Intelligence System</p>
          <p>Report ID: ${reading._id || 'N/A'} | Generated: ${new Date().toLocaleString()}</p>
        </div>
      `

      // Add to DOM temporarily
      document.body.appendChild(pdfContent)

      // Convert to canvas
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      // Remove from DOM
      document.body.removeChild(pdfContent)

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)

      // Save PDF
      const fileName = `LACTEVA_Report_${reading.deviceId}_${Date.now()}.pdf`
      pdf.save(fileName)

    } catch (error) {
      console.error('PDF generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!reading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Export
          </CardTitle>
          <CardDescription>No data available for export</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export PDF Report
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Export
        </CardTitle>
        <CardDescription>
          Generate comprehensive quality report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Sample:</span>
            <p className="font-medium">{reading.deviceId}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Quality:</span>
            <Badge className={getFreshnessColor(reading.predictions?.freshness || 'unknown')}>
              {reading.predictions?.freshness?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Accuracy:</span>
            <p className="font-medium">{(modelAccuracy * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <p className="font-medium">
              {reading.predictions?.confidence ? 
                `${(reading.predictions.confidence * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
        </div>

        <Button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}