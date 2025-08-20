'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  TrendingUp,
  Users,
  Target,
  Mail,
  LogOut,
  FileText,
  Calendar,
  BarChart3
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface AnalysisResult {
  id: string;
  request_id: string;
  user_id: string;
  result_data: Record<string, unknown>;
  created_at: string;
}

interface AnalysisRequest {
  id: string;
  user_id: string;
  request_id: string;
  user_linkedin_url: string;
  competitor_urls: string[];
  target_position: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  analysis_results: AnalysisResult[] | null;
}

export default function LinkedInOptimizer() {
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [formData, setFormData] = useState({
    userLinkedIn: '',
    competitorUrls: '',
    targetPosition: ''
  })
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRequest[]>([])
  const [selectedResult, setSelectedResult] = useState<AnalysisRequest | null>(null)

  const loadAnalysisHistory = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('analysis_requests')
      .select(`
        *,
        analysis_results (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setAnalysisHistory(data as AnalysisRequest[])
    }
  }, [])

  const checkAuth = useCallback(async () => {
    const storedEmail = localStorage.getItem('userEmail')
    if (storedEmail) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', storedEmail)
        .single()
      
      if (data) {
        localStorage.setItem('userId', data.id)
        setIsAuthenticated(true)
        setUserEmail(storedEmail)
        loadAnalysisHistory(data.id)
      }
    }
  }, [loadAnalysisHistory])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Check if user exists or create new
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (!user) {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([{ email }])
          .select()
          .single()

        if (error) throw error
        user = newUser
      } else {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)
      }

      localStorage.setItem('userEmail', email)
      localStorage.setItem('userId', user.id)
      setIsAuthenticated(true)
      setUserEmail(email)
      loadAnalysisHistory(user.id)
      toast.success('Successfully logged in!')
    } catch (error) {
      toast.error('Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get user ID
      const userId = localStorage.getItem('userId')
      if (!userId) throw new Error('User not found')

      // Generate request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Parse competitor URLs properly - split by comma or newline
      const competitorUrlsArray = formData.competitorUrls
        .split(/[,\n]/) // Split by comma OR newline
        .map(url => url.trim())
        .filter(url => url.length > 0)

      // Save request to database first
      const { error: dbError } = await supabase
        .from('analysis_requests')
        .insert([{
          user_id: userId,
          request_id: requestId,
          user_linkedin_url: formData.userLinkedIn,
          competitor_urls: competitorUrlsArray,
          target_position: formData.targetPosition,
          status: 'processing'
        }])

      if (dbError) throw dbError

      // Submit to n8n webhook with properly structured data
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userLinkedIn: formData.userLinkedIn,
          competitorUrls: competitorUrlsArray, // This should be an array of individual URLs
          targetPosition: formData.targetPosition,
          email: userEmail,
          requestId: requestId
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      toast.success('Analysis started! Results will be ready in 2-3 minutes.')
      setFormData({ userLinkedIn: '', competitorUrls: '', targetPosition: '' })
      
      // Refresh history after a delay
      setTimeout(() => {
        loadAnalysisHistory(userId)
      }, 5000)
      
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to start analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    setIsAuthenticated(false)
    setUserEmail('')
    setAnalysisHistory([])
    toast.success('Logged out successfully')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="flex items-center justify-center mb-8">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white text-center mb-2">
                LinkedIn Profile Optimizer
              </h1>
              <p className="text-gray-300 text-center mb-8">
                AI-powered profile analysis and optimization
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Enter your email to continue
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-center gap-8 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    No password needed
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Instant access
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <Toaster position="top-right" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">LinkedIn Optimizer</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'new'
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            New Analysis
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'history'
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            History ({analysisHistory.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.div
              key="new"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Form */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Start New Analysis</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Your LinkedIn Profile URL
                    </label>
                    <input
                      type="url"
                      value={formData.userLinkedIn}
                      onChange={(e) => setFormData({...formData, userLinkedIn: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                      placeholder="https://linkedin.com/in/yourprofile"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Competitor LinkedIn URLs
                      <span className="text-xs text-gray-400 ml-2">
                        (one per line or comma-separated)
                      </span>
                    </label>
                    <textarea
                      value={formData.competitorUrls}
                      onChange={(e) => setFormData({...formData, competitorUrls: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors h-32 resize-none"
                      placeholder="https://linkedin.com/in/competitor1
https://linkedin.com/in/competitor2
or
https://linkedin.com/in/competitor1, https://linkedin.com/in/competitor2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Target Position / Goals
                    </label>
                    <textarea
                      value={formData.targetPosition}
                      onChange={(e) => setFormData({...formData, targetPosition: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors h-24 resize-none"
                      placeholder="Senior Product Manager in Tech, thought leader in AI/ML..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <BarChart3 className="w-5 h-5" />
                        Analyze Profile
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Features */}
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        AI-Powered Analysis
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Advanced algorithms analyze your profile against successful competitors
                        to identify gaps and opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Competitive Intelligence
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Learn from the best practices of leaders in your field
                        and adapt winning strategies.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Target className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Actionable Recommendations
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Get specific, copy-paste ready content optimized for
                        LinkedIn&apos;s algorithm and your target audience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {analysisHistory.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No analyses yet</h3>
                  <p className="text-gray-300">Start your first analysis to see results here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {analysisHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                      onClick={() => setSelectedResult(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {item.target_position.substring(0, 50)}...
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {item.competitor_urls.length} competitors
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400'
                            : item.status === 'processing'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {selectedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-8 max-w-4xl max-h-[80vh] overflow-y-auto border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Analysis Results</h2>
              {selectedResult.analysis_results?.[0]?.result_data ? (
                <pre className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(selectedResult.analysis_results[0].result_data, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-400">Analysis is still processing. Check back soon!</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-right" />
    </div>
  )
}