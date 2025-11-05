import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Zap, Download, Upload } from 'lucide-react';
import { convertToWebP, getImageInfo, createPreviewUrl, revokePreviewUrl } from '@/utils/imageConverter';

const ImageConverterDemo = () => {
  const [originalFile, setOriginalFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionInfo, setConversionInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      alert('Please select a JPEG, PNG, or WebP image file');
      return;
    }

    setOriginalFile(file);
    setConvertedFile(null);
    setConversionInfo(null);
    setIsConverting(true);

    try {
      // Get original image info
      const originalInfo = await getImageInfo(file);
      
      // Convert to WebP if it's JPEG or PNG
      let processedFile = file;
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        processedFile = await convertToWebP(file, {
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200,
          maintainAspectRatio: true
        });
        
        // Calculate conversion info
        const compressionRatio = ((1 - processedFile.size / file.size) * 100).toFixed(1);
        setConversionInfo({
          original: {
            size: (file.size / 1024).toFixed(2),
            type: file.type.split('/')[1].toUpperCase(),
            dimensions: `${originalInfo.width}x${originalInfo.height}`
          },
          converted: {
            size: (processedFile.size / 1024).toFixed(2),
            type: 'WEBP',
            dimensions: `${originalInfo.width}x${originalInfo.height}`
          },
          compression: compressionRatio
        });

        setConvertedFile(processedFile);
      } else {
        setConvertedFile(file);
        setConversionInfo({
          original: {
            size: (file.size / 1024).toFixed(2),
            type: file.type.split('/')[1].toUpperCase(),
            dimensions: `${originalInfo.width}x${originalInfo.height}`
          },
          converted: {
            size: (file.size / 1024).toFixed(2),
            type: 'WEBP',
            dimensions: `${originalInfo.width}x${originalInfo.height}`
          },
          compression: '0.0'
        });
      }

      // Create preview URL
      const newPreviewUrl = createPreviewUrl(processedFile);
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
      }
      setPreviewUrl(newPreviewUrl);

    } catch (error) {
      console.error('Conversion error:', error);
      alert(`Conversion failed: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadConverted = () => {
    if (!convertedFile) return;
    
    const url = createPreviewUrl(convertedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFile.name;
    a.click();
    revokePreviewUrl(url);
  };

  const resetDemo = () => {
    setOriginalFile(null);
    setConvertedFile(null);
    setConversionInfo(null);
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Image to WebP Converter Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="demo-file">Select Image File</Label>
          <div className="flex items-center gap-4">
            <Input
              id="demo-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={isConverting}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={resetDemo}
              disabled={isConverting}
            >
              Reset
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Upload a JPEG or PNG image to see it converted to optimized WebP format
          </p>
        </div>

        {/* Conversion Status */}
        {isConverting && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
              <span className="text-sm text-blue-800">Converting image to WebP...</span>
            </div>
          </div>
        )}

        {/* Conversion Results */}
        {conversionInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Image Info */}
            <div className="p-4 bg-gray-50 border rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Original Image</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Format:</strong> {conversionInfo.original.type}</div>
                <div><strong>Size:</strong> {conversionInfo.original.size} KB</div>
                <div><strong>Dimensions:</strong> {conversionInfo.original.dimensions}</div>
              </div>
            </div>

            {/* Converted Image Info */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Optimized WebP</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Format:</strong> {conversionInfo.converted.type}</div>
                <div><strong>Size:</strong> {conversionInfo.converted.size} KB</div>
                <div><strong>Dimensions:</strong> {conversionInfo.converted.dimensions}</div>
                <div className="font-medium text-green-700">
                  <strong>Compression:</strong> {conversionInfo.compression}% smaller
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {previewUrl && (
          <div className="space-y-4">
            <h3 className="font-medium">Preview</h3>
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Converted preview"
                className="max-w-full max-h-96 object-contain border rounded-lg"
              />
            </div>
            
            {convertedFile && (
              <div className="flex justify-center">
                <Button onClick={downloadConverted} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download WebP
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Features List */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic JPEG/PNG to WebP conversion</li>
            <li>• Intelligent compression (typically 25-50% size reduction)</li>
            <li>• Maintains image quality while reducing file size</li>
            <li>• Responsive image resizing (max 1200x1200px)</li>
            <li>• Preserves aspect ratio</li>
            <li>• Browser-compatible WebP format</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageConverterDemo;
