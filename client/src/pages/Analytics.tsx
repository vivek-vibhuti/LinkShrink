import { useParams } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer 
} from 'recharts'
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  MousePointer, 
  Users, 
  Globe, 
  Smartphone 
} from 'lucide-react'
import { Link } from 'wouter'
import { useToast } from '@/hooks/use-toast'
import type { UrlWithAnalytics, UrlClick, UrlAnalytics } from '../../../shared/schema'

interface AnalyticsData {
  url: UrlWithAnalytics
  analytics: UrlAnalytics
  recentClicks: UrlClick[]
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export default function Analytics() {
  const params = useParams()
  const { toast } = useToast()
  const urlId = params.id

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/urls/${urlId}/analytics`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/urls/${urlId}/analytics`)
      return await response.json() as AnalyticsData
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard!",
      description: "The link has been copied to your clipboard.",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Analytics Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The analytics data for this link could not be found.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { url, analytics } = data

  // Transform data for charts
  const countryData = Object.entries(analytics.clicksByCountry || {})
    .map(([country, clicks]) => ({ name: country, value: clicks }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const deviceData = Object.entries(analytics.clicksByDevice || {})
    .map(([device, clicks]) => ({ name: device, value: clicks }))

  const browserData = Object.entries(analytics.clicksByBrowser || {})
    .map(([browser, clicks]) => ({ name: browser, value: clicks }))
    .slice(0, 5)

  const dailyData = Object.entries(analytics.dailyClicks || {})
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14) // Last 14 days

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Link Analytics
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
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
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Clicks
                </p>
                <p className="text-3xl font-bold text-primary">
                  {analytics.totalClicks || 0}
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
                  Unique Visitors
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {analytics.uniqueClicks || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Countries
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {Object.keys(analytics.clicksByCountry || {}).length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Devices
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {Object.keys(analytics.clicksByDevice || {}).length}
                </p>
              </div>
              <Smartphone className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Daily Clicks Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Clicks (Last 14 Days)</CardTitle>
            <CardDescription>Click activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Clicks by geographic location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {countryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
            <CardDescription>Clicks by device category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Browsers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Browsers</CardTitle>
            <CardDescription>Clicks by browser type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={browserData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Original URL Info */}
      <Card>
        <CardHeader>
          <CardTitle>Link Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Original URL:</span>
              <p className="break-all">{url.originalUrl}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created:</span>
              <p>{new Date(url.createdAt).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            {analytics.lastClickAt && (
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Click:</span>
                <p>{new Date(analytics.lastClickAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}