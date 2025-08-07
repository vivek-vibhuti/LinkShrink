import { Route, Switch } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import Analytics from '@/pages/Analytics'
import Auth from '@/pages/Auth'

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={Auth} />
        {isAuthenticated && (
          <>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/analytics/:id" component={Analytics} />
          </>
        )}
        <Route>
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              The page you're looking for doesn't exist.
            </p>
          </div>
        </Route>
      </Switch>
    </div>
  )
}