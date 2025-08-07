import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  ExternalLink, 
  Copy, 
  Edit, 
  Trash2, 
  QrCode,
  Calendar,
  MousePointer,
  Plus,
  Upload
} from 'lucide-react'
import type { UrlWithAnalytics } from '../../../shared/schema'

interface DashboardUrls {
  urls: UrlWithAnalytics[]
  page: number
  limit: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [bulkUrls, setBulkUrls] = useState('')
  const [showBulkForm, setShowBulkForm] = useState(false)

  const { data: urlsData, isLoading } = useQuery({
    queryKey: ['/api/urls'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/urls')
      return await response.json() as DashboardUrls
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (urlId: string) => {
      await apiRequest('DELETE', `/urls/${urlId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/urls'] })
      toast({
        title: "Link deleted",
        description: "The link has been removed from your dashboard.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting link",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const bulkShortenMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const urlObjects = urls.map(url => ({ originalUrl: url.trim() }))
      const response = await apiRequest('POST', '/urls/bulk', { urls: urlObjects })
      return await response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/urls'] })
      setBulkUrls('')
      setShowBulkForm(false)
      toast({
        title: "Bulk shortening completed",
        description: `Successfully created ${data.results.length} short links.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error with bulk shortening",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard!",
      description: "The link has been copied to your clipboard.",
    })
  }

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const urls = bulkUrls.split('\n').filter(url => url.trim())
    if (urls.length === 0) return
    
    bulkShortenMutation.mutate(urls)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your shortened links and view analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkForm(!showBulkForm)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Shorten
          </Button>
          <Link href="/">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Link
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Shortening Form */}
      {showBulkForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bulk URL Shortening</CardTitle>
            <CardDescription>
              Enter multiple URLs (one per line) to shorten them all at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <textarea
                className="w-full h-32 p-3 border border-input bg-background rounded-md resize-none"
                placeholder="https://example.com/url1&#10;https://example.com/url2&#10;https://example.com/url3"
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={bulkShortenMutation.isPending}
                >
                  {bulkShortenMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Shorten All'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Links
                </p>
                <p className="text-2xl font-bold">
                  {urlsData?.urls.length || 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Clicks
                </p>
                <p className="text-2xl font-bold">
                  {urlsData?.urls.reduce((sum, url) => sum + (url.analytics?.totalClicks || 0), 0) || 0}
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Account Type
                </p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {user?.isPremium ? (
                    <>
                      Premium
                      <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-1 rounded-full">
                        PRO
                      </span>
                    </>
                  ) : (
                    'Free'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Your Links
        </h2>
        
        {!urlsData?.urls.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No links yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first short link to get started
              </p>
              <Link href="/">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          urlsData.urls.map((url) => (
            <Card key={url.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-mono text-primary">
                        {url.shortUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(url.shortUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={url.shortUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                      {url.originalUrl}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(url.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" />
                        {url.analytics?.totalClicks || 0} clicks
                      </div>
                      {url.customAlias && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/analytics/${url.id}`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(url.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}