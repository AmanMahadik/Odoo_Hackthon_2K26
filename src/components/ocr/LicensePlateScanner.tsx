'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, Upload } from 'lucide-react';
import { ocrService, registryService } from '@/lib/mockServices';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface LicensePlateScannerProps {
  onAutoFill: (data: { registration_number: string; model: string; type: string; fuel_type: string; year: string; color: string }) => void;
}

export function LicensePlateScanner({ onAutoFill }: LicensePlateScannerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
  const [scanResult, setScanResult] = useState<any>(null);
  const [registryData, setRegistryData] = useState<any>(null);

  const handleScan = async () => {
    setStatus('scanning');
    try {
      // 1. OCR Scan
      const ocrData = await ocrService.scanPlate();
      setScanResult(ocrData);
      
      // 2. Validate
      setStatus('validating');
      const registry = await registryService.validatePlate(ocrData.plateNumber);
      setRegistryData(registry);
      
      setStatus(registry.valid ? 'success' : 'error');
    } catch (err) {
      setStatus('error');
    }
  };

  const handleAutoFill = () => {
    if (registryData && registryData.valid) {
      onAutoFill({
        registration_number: registryData.plateNumber,
        model: registryData.model,
        type: registryData.vehicleClass === 'LMV' ? 'Van' : 'Truck',
        fuel_type: registryData.fuelType,
        year: registryData.year?.toString() || '2023',
        color: registryData.color,
      });
      setOpen(false);
      
      // Reset for next time
      setTimeout(() => {
        setStatus('idle');
        setScanResult(null);
        setRegistryData(null);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        <Camera className="h-4 w-4" />
        Scan Plate
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OCR License Plate Scanner</DialogTitle>
          <DialogDescription>
            Upload a photo of the vehicle plate for AI extraction and Govt Registry validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Scan Area */}
          {status === 'idle' && (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleScan}
            >
              <div className="p-4 bg-primary/10 text-primary rounded-full">
                <Upload className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Click to capture / upload</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG (Max 5MB)</p>
              </div>
            </div>
          )}

          {(status === 'scanning' || status === 'validating') && (
            <div className="border border-border rounded-lg p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {status === 'scanning' ? 'Extracting text via AI OCR...' : 'Validating against Govt Registry...'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds.</p>
              </div>
            </div>
          )}

          {(status === 'success' || status === 'error') && scanResult && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">OCR Extraction</h3>
                    <div className="text-2xl font-mono font-bold tracking-widest bg-muted px-3 py-1.5 rounded-md inline-block border border-border">
                      {scanResult.plateNumber}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {Math.round(scanResult.confidence * 100)}% Confidence
                  </Badge>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">Registry Validation</h3>
                    {registryData?.valid ? (
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid Match
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Invalid / No Match
                      </Badge>
                    )}
                  </div>

                  {registryData?.valid && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/30 p-3 rounded-md border border-border">
                      <div className="text-muted-foreground">Manufacturer:</div>
                      <div className="font-medium text-right">{registryData.manufacturer}</div>
                      
                      <div className="text-muted-foreground">Model:</div>
                      <div className="font-medium text-right">{registryData.model} {registryData.year}</div>
                      
                      <div className="text-muted-foreground">Color:</div>
                      <div className="font-medium text-right">{registryData.color}</div>
                      
                      <div className="text-muted-foreground">Owner:</div>
                      <div className="font-medium text-right truncate" title={registryData.ownerName}>{registryData.ownerName}</div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleAutoFill} 
                  disabled={!registryData?.valid}
                  className="w-full mt-4 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Auto-Fill Vehicle Form
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => setStatus('idle')}
                  className="w-full"
                >
                  Scan Another
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
