import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Lock, UserPlus, LogIn } from 'lucide-react'

export default function Auth() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
  })

  const authMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const response = await apiRequest('POST', endpoint, data)
      return await response.json()
    },
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      toast({
        title: `${isLogin ? 'Login' : 'Registration'} successful!`,
        description: `Welcome${data.user?.firstName ? `, ${data.user.firstName}` : ''}!`,
      })
      setLocation('/dashboard')
      window.location.reload() // Refresh to update auth state
    },
    onError: (error: Error) => {
      toast({
        title: `${isLogin ? 'Login' : 'Registration'} failed`,
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = isLogin 
      ? { email: formData.email, password: formData.password }
      : formData

    authMutation.mutate(submitData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              {isLogin ? <LogIn className="h-8 w-8 text-primary mx-auto" /> : <UserPlus className="h-8 w-8 text-primary mx-auto" />}
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to your SnapLink account' 
                : 'Join SnapLink to access premium features'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={authMutation.isPending}
              >
                {authMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  <>
                    {isLogin ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="p-0 h-auto text-primary hover:underline"
              >
                {isLogin ? 'Create one here' : 'Sign in here'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}