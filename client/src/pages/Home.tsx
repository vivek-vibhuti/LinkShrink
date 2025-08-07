import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Link as LinkIcon, 
  Copy, 
  QrCode, 
  Download, 
  ExternalLink,
  Zap,
  BarChart3,
  Shield,
  Sparkles
} from 'lucide-react'

interface ShortenResponse {
  id: string
  originalUrl: string
  shortUrl: string
  shortCode: string
  customAlias?: string
  qrCodeUrl: string
  createdAt: string
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [url, setUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [result, setResult] = useState<ShortenResponse | null>(null)

  const shortenMutation = useMutation({
    mutationFn: async (data: { originalUrl: string; customAlias?: string }) => {
      const response = await apiRequest('POST', '/urls', data)
      return await response.json() as ShortenResponse
    },
    onSuccess: (data) => {
      setResult(data)
      setUrl('')
      setCustomAlias('')
      toast({
        title: "Link shortened successfully!",
        description: "Your short link is ready to use.",
      })
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['/api/urls'] })
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error shortening link",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    
    shortenMutation.mutate({
      originalUrl: url,
      customAlias: customAlias || undefined,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard!",
      description: "The link has been copied to your clipboard.",
    })
  }

  const downloadQR = () => {
    if (result?.qrCodeUrl) {
      const link = document.createElement('a')
      link.href = result.qrCodeUrl
      link.download = `qr-code-${result.shortCode}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Zap className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
          Shorten Links
          <span className="text-primary block">Instantly</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Create short, memorable links with custom aliases, QR codes, and detailed analytics.
          No signup required for basic usage.
        </p>
      </div>

      {/* URL Shortener Form */}
      <div className="max-w-2xl mx-auto mb-12">
        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Shorten Your URL
            </CardTitle>
            <CardDescription>
              Enter a long URL to create a short link instantly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="url"
                  placeholder="https://example.com/very/long/url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="text-lg h-12"
                />
              </div>
              
              {isAuthenticated && (
                <div>
                  <Input
                    type="text"
                    placeholder="custom-alias (optional)"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Only letters, numbers, hyphens, and underscores allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a custom alias for your link (3-50 characters)
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={shortenMutation.isPending}
              >
                {shortenMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Shortening...
                  </div>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Shorten Link
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Result Display */}
      {result && (
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-400">
                Your link is ready! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <LinkIcon className="h-5 w-5 text-gray-500" />
                <code className="flex-1 text-lg font-mono">{result.shortUrl}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(result.shortUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              
              {result.qrCodeUrl && (
                <div className="flex items-center justify-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <img 
                    src={result.qrCodeUrl} 
                    alt="QR Code" 
                    className="w-32 h-32 border rounded"
                  />
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">QR Code</h3>
                    <Button onClick={downloadQR} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Shortening</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create short links instantly without any signup required
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <QrCode className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">QR Codes</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Automatic QR code generation for every shortened link
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed analytics and click tracking for registered users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Premium Features */}
      {!isAuthenticated && (
        <div className="text-center">
          <Card className="max-w-md mx-auto bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <CardTitle className="text-purple-800 dark:text-purple-400">
                Sign up for more features
              </CardTitle>
              <CardDescription>
                Get custom aliases, analytics, bulk shortening, and more!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/auth">Get Started Free</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}