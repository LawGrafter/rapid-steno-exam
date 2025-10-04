'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ArrowLeft, Trophy, Award, Star } from 'lucide-react'

type UserScore = {
  id: string
  user_id: string
  full_name: string
  best_score: number
  tests_completed: number
  average_score: number
  rank?: number
}

// Function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (num: number): string => {
  if (num > 3 && num < 21) return 'th';
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export default function LeaderboardPage() {
  const [userScores, setUserScores] = useState<UserScore[]>([])
  const [topUsers, setTopUsers] = useState<UserScore[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRank, setCurrentUserRank] = useState<UserScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
      // Always fetch fresh data on component mount
      fetchLeaderboardData()
    } else {
      router.push('/login')
    }
  }, [router])
  
  // Add a second useEffect to refresh data when the component is visible
  useEffect(() => {
    // Refresh data when the page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        fetchLeaderboardData()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Refresh data every 30 seconds while the page is open
    const refreshInterval = setInterval(() => {
      if (currentUser) {
        fetchLeaderboardData()
      }
    }, 30000)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(refreshInterval)
    }
  }, [currentUser])

  const fetchLeaderboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch all completed test attempts with test data
      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          id,
          user_id,
          test_id,
          total_score,
          status,
          test:tests(
            id,
            title
          ),
          user:users(
            id,
            full_name
          )
        `)
        .eq('status', 'submitted')
      
      if (attemptsError) throw attemptsError

      // Process attempts to get user scores
      const userScoresMap = new Map<string, UserScore>()
      
      // Process real attempts data if available
      if (attempts && attempts.length > 0) {
        attempts.forEach(attempt => {
          const userId = attempt.user_id
          // Use a fixed value for score calculation since we don't have answers or questions
          // Assuming total_score is already a percentage or a score out of 100
          const percentage = attempt.total_score || 0
          
          if (!userScoresMap.has(userId)) {
            userScoresMap.set(userId, {
              id: userId,
              user_id: userId,
              full_name: (attempt.user && typeof attempt.user === 'object' && !Array.isArray(attempt.user) && 'full_name' in attempt.user) ? (attempt.user as any).full_name || 'Unknown User' : 'Unknown User',
              best_score: percentage,
              tests_completed: 1,
              average_score: percentage
            })
          } else {
            const userScore = userScoresMap.get(userId)!
            userScore.tests_completed += 1
            userScore.average_score = ((userScore.average_score * (userScore.tests_completed - 1)) + percentage) / userScore.tests_completed
            if (percentage > userScore.best_score) {
              userScore.best_score = percentage
            }
          }
        })
      }
      
      // Always add dummy data to make the leaderboard look more populated
      // Add 35 fake Indian users with realistic scores
      const indianDummyUsers = [
        { id: 'dummy1', name: 'Raj Sharma', score: 95, tests: 15, avg: 85 },
        { id: 'dummy2', name: 'Priya Patel', score: 88, tests: 12, avg: 80 },
        { id: 'dummy3', name: 'Amit Kumar', score: 75, tests: 10, avg: 70 },
        { id: 'dummy4', name: 'Neha Singh', score: 55, tests: 6, avg: 50 },
        { id: 'dummy5', name: 'Vikram Malhotra', score: 92, tests: 14, avg: 82 },
        { id: 'dummy6', name: 'Ananya Desai', score: 87, tests: 11, avg: 79 },
        { id: 'dummy7', name: 'Rahul Verma', score: 83, tests: 13, avg: 76 },
        { id: 'dummy8', name: 'Meera Joshi', score: 78, tests: 9, avg: 72 },
        { id: 'dummy9', name: 'Arjun Reddy', score: 73, tests: 8, avg: 68 },
        { id: 'dummy10', name: 'Divya Gupta', score: 69, tests: 7, avg: 64 },
        { id: 'dummy11', name: 'Karan Kapoor', score: 67, tests: 9, avg: 62 },
        { id: 'dummy12', name: 'Pooja Mehta', score: 63, tests: 6, avg: 58 },
        { id: 'dummy13', name: 'Sanjay Trivedi', score: 59, tests: 5, avg: 54 },
        { id: 'dummy14', name: 'Anjali Nair', score: 57, tests: 7, avg: 52 },
        { id: 'dummy15', name: 'Vivek Choudhary', score: 93, tests: 16, avg: 84 },
        { id: 'dummy16', name: 'Ritu Agarwal', score: 89, tests: 13, avg: 81 },
        { id: 'dummy17', name: 'Deepak Sharma', score: 85, tests: 12, avg: 78 },
        { id: 'dummy18', name: 'Kavita Rao', score: 81, tests: 10, avg: 74 },
        { id: 'dummy19', name: 'Rajesh Khanna', score: 77, tests: 9, avg: 71 },
        { id: 'dummy20', name: 'Sunita Iyer', score: 71, tests: 8, avg: 66 },
        { id: 'dummy21', name: 'Manoj Tiwari', score: 68, tests: 7, avg: 63 },
        { id: 'dummy22', name: 'Geeta Bansal', score: 65, tests: 6, avg: 60 },
        { id: 'dummy23', name: 'Prakash Jha', score: 61, tests: 5, avg: 56 },
        { id: 'dummy24', name: 'Lata Menon', score: 58, tests: 4, avg: 53 },
        { id: 'dummy25', name: 'Suresh Patel', score: 94, tests: 17, avg: 86 },
        { id: 'dummy26', name: 'Nisha Sharma', score: 90, tests: 14, avg: 83 },
        { id: 'dummy27', name: 'Anil Kumar', score: 86, tests: 13, avg: 79 },
        { id: 'dummy28', name: 'Shweta Verma', score: 82, tests: 11, avg: 75 },
        { id: 'dummy29', name: 'Vijay Malhotra', score: 79, tests: 10, avg: 73 },
        { id: 'dummy30', name: 'Asha Desai', score: 74, tests: 9, avg: 69 },
        { id: 'dummy31', name: 'Rakesh Singh', score: 70, tests: 8, avg: 65 },
        { id: 'dummy32', name: 'Mala Gupta', score: 66, tests: 7, avg: 61 },
        { id: 'dummy33', name: 'Dinesh Reddy', score: 62, tests: 6, avg: 57 },
        { id: 'dummy34', name: 'Rekha Joshi', score: 60, tests: 5, avg: 55 },
        { id: 'dummy35', name: 'Harish Mehta', score: 56, tests: 4, avg: 51 }
      ];
        
      // Add all dummy users to the map
      indianDummyUsers.forEach(user => {
        // Only add dummy user if this user ID doesn't already exist
        if (!userScoresMap.has(user.id)) {
          userScoresMap.set(user.id, {
            id: user.id,
            user_id: user.id,
            full_name: user.name,
            best_score: user.score,
            tests_completed: user.tests,
            average_score: user.avg
          });
        }
      });

      // Convert map to array and sort by average score
      const sortedScores = Array.from(userScoresMap.values())
        .sort((a, b) => b.average_score - a.average_score)
        .map((score, index) => ({
          ...score,
          rank: index + 1
        }))

      setUserScores(sortedScores)
      
      // Set top 3 users
      setTopUsers(sortedScores.slice(0, 3))
      
      // Find current user's rank
      const currentUserScore = sortedScores.find(score => score.user_id === currentUser?.id) || null
      setCurrentUserRank(currentUserScore)
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Modern Header */}
      <header className="bg-gradient-to-r from-[#01342F] to-[#078F65] text-white p-4 md:p-6 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>
        <div className="container mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <Button
            onClick={() => fetchLeaderboardData()}
            variant="outline"
            size="sm"
            className="text-black border-white hover:bg-white/20 rounded-full px-2 md:px-4 text-xs md:text-sm"
          >
            Refresh Data
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-6 md:py-10 px-3 md:px-4 max-w-6xl">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Top 3 Users - Modern Podium Style */}
            <div className="mb-16">
              <h2 className="text-4xl font-bold mb-16 text-center text-gray-800 relative">
                <span className="inline-block relative">
                  Mock Test Top Performers
                  <div className="absolute -bottom-3 left-0 right-0 h-1.5 bg-gradient-to-r from-[#01342F] to-[#078F65] rounded-full"></div>
                </span>
              </h2>
              
              <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-8 h-auto md:h-80">
                {topUsers.map((user, index) => {
                  // Define position styles based on user rank
                  const rankStyles: Record<number, { order: number; height: string; bgGradient: string; icon: JSX.Element; width: string }> = {
                    1: { 
                      order: 1, 
                      height: 'h-80', 
                      bgGradient: 'from-blue-500 to-blue-600', 
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-24 w-24">
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#FFD700" stroke="#FFC000" strokeWidth="0.5" />
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#FFD700" stroke="#FFC000" strokeWidth="0.5" />
                          <circle cx="8" cy="10" r="1.8" fill="#FFC000" />
                          <circle cx="16" cy="10" r="1.8" fill="#FFC000" />
                          <path d="M12 14L9 18H15L12 14Z" fill="#FFC000" />
                          <path d="M7 7L9 6L12 1L15 6L17 7" stroke="#FFC000" strokeWidth="0.7" fill="none" />
                        </svg>
                      ), 
                      width: 'md:w-2/5' 
                    }, // 1st place - Gold Crown (middle)
                    2: { 
                      order: 0, 
                      height: 'h-64', 
                      bgGradient: 'from-amber-500 to-amber-600', 
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-24 w-24">
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="0.5" />
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="0.5" />
                          <circle cx="8" cy="10" r="1.8" fill="#A0A0A0" />
                          <circle cx="16" cy="10" r="1.8" fill="#A0A0A0" />
                          <path d="M12 14L9 18H15L12 14Z" fill="#A0A0A0" />
                          <path d="M7 7L9 6L12 1L15 6L17 7" stroke="#A0A0A0" strokeWidth="0.7" fill="none" />
                        </svg>
                      ), 
                      width: 'md:w-1/4' 
                    }, // 2nd place - Silver Crown (left)
                    3: { 
                      order: 2, 
                      height: 'h-56', 
                      bgGradient: 'from-orange-500 to-orange-600', 
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-24 w-24">
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#CD7F32" stroke="#B87333" strokeWidth="0.5" />
                          <path d="M12 1L16 6L21 7L21 12C21 12 19 14 19 16C19 18 21 20 21 20L21 22L12 20L3 22L3 20C3 20 5 18 5 16C5 14 3 12 3 12L3 7L8 6L12 1Z" fill="#CD7F32" stroke="#B87333" strokeWidth="0.5" />
                          <circle cx="8" cy="10" r="1.8" fill="#B87333" />
                          <circle cx="16" cy="10" r="1.8" fill="#B87333" />
                          <path d="M12 14L9 18H15L12 14Z" fill="#B87333" />
                          <path d="M7 7L9 6L12 1L15 6L17 7" stroke="#B87333" strokeWidth="0.7" fill="none" />
                        </svg>
                      ), 
                      width: 'md:w-1/4' 
                    }  // 3rd place - Bronze Crown (right)
                  }
                  
                  // Get position style based on user's actual rank
                  const userRank = user.rank || 1
                  const position = rankStyles[userRank] || rankStyles[1]
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`flex flex-col items-center w-full md:order-${position.order} ${position.width} transition-all duration-300 hover:transform hover:scale-105 relative mb-12 md:mb-0`}
                    >
                      {/* Medal/Trophy Badge */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
                        {position.icon}
                      </div>
                      
                      {/* User Card */}
                      <div className={`bg-gradient-to-b ${position.bgGradient} w-full rounded-xl overflow-hidden ${
                        user.rank === 1 ? 'ring-4 ring-yellow-400 ring-opacity-70 animate-pulse-slow shadow-[0_0_15px_5px_rgba(234,179,8,0.5)]' : 
                        user.rank === 2 ? 'ring-4 ring-gray-300 ring-opacity-70 animate-pulse-slow shadow-[0_0_15px_5px_rgba(209,213,219,0.5)]' : 
                        user.rank === 3 ? 'ring-4 ring-amber-700 ring-opacity-70 animate-pulse-slow shadow-[0_0_15px_5px_rgba(180,83,9,0.5)]' : 'shadow-xl'
                      }`}>
                        {/* User Avatar */}
                        <div className="pt-8 pb-4 px-4 text-center">
                          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-white shadow-inner mb-3">
                            <div className="w-full h-full flex items-center justify-center bg-white text-gray-700 text-2xl font-bold">
                              {user.full_name.charAt(0)}
                            </div>
                          </div>
                          <p className="font-bold text-white text-2xl mb-1 truncate">{user.full_name}</p>
                          <p className="text-white font-bold text-xl bg-white/20 py-1 px-3 rounded-full inline-block shadow-inner">{user.rank || 1}{getOrdinalSuffix(user.rank || 1)} Rank</p>
                        </div>
                        
                        {/* Stats */}
                        <div className="bg-white p-4 rounded-t-xl">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Best Score</p>
                              <p className="font-bold text-gray-800 text-lg">{user.best_score}</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Average Score</p>
                              <p className="font-bold text-gray-800 text-lg">{Math.round(user.average_score)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Your Ranking - Modern Card */}
            {currentUser ? (
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Ranking</h2>
                {currentUserRank ? (
                  <Card className="overflow-hidden border-none shadow-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 shadow-md">
                            <div className="w-full h-full flex items-center justify-center bg-[#078F65] text-white text-lg font-bold">
                              {currentUserRank.full_name.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-lg">{currentUserRank.full_name}</p>
                            <div className="bg-[#078F65]/20 text-[#01342F] rounded-full px-2 py-0.5 text-xs font-medium">
                              Rank #{currentUserRank.rank}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Best Score</p>
                            <p className="font-bold text-lg text-gray-800">{currentUserRank.best_score}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Tests</p>
                            <p className="font-bold text-lg text-gray-800">{currentUserRank.tests_completed}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Avg Score</p>
                            <p className="font-bold text-lg text-gray-800">{Math.round(currentUserRank.average_score)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                   <Card className="overflow-hidden border-none shadow-xl">
                     <CardContent className="p-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 shadow-md">
                             <div className="w-full h-full flex items-center justify-center bg-[#078F65] text-white text-lg font-bold">
                               {currentUser.full_name?.charAt(0) || currentUser.email?.charAt(0) || '?'}
                             </div>
                           </div>
                           <div>
                             <p className="font-bold text-lg">{currentUser.full_name || 'User'}</p>
                             <div className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs font-medium">
                               Not Ranked Yet
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <p className="text-gray-600 text-sm">Complete your first test to appear on the leaderboard!</p>
                           <Button 
                             onClick={() => router.push('/tests')}
                             className="bg-[#078F65] hover:bg-[#01342F] text-white text-sm px-3 py-1 h-auto"
                             size="sm"
                           >
                             Take a Test Now
                           </Button>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                )}
              </div>
            ) : null}
            
            {/* Your Ranking section removed as requested - ranking is already shown in the card above */}
            
            {/* Full Leaderboard - Modern Table */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Full Leaderboard</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-2 md:p-4 text-left text-gray-600 font-semibold text-xs md:text-base">RANKINGS</th>
                        <th className="p-2 md:p-4 text-left text-gray-600 font-semibold text-xs md:text-base">USER NAME</th>
                        <th className="p-2 md:p-4 text-left text-gray-600 font-semibold text-xs md:text-base">BEST SCORE</th>
                        <th className="p-2 md:p-4 text-left text-gray-600 font-semibold text-xs md:text-base">AVERAGE SCORE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userScores.filter(user => (user.rank || 1) >= 4).map((user) => (
                        <tr 
                          key={user.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${user.user_id === currentUser?.id ? 'bg-[#078F65]/20 font-bold border-l-4 border-l-[#078F65]' : ''}`}
                        >
                          <td className="p-2 md:p-4 font-medium text-xs md:text-base">{user.rank || 1}{getOrdinalSuffix(user.rank || 1)} Rank</td>
                          <td className="p-2 md:p-4">
                            <div className="flex items-center">
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-1 md:mr-3 text-xs md:text-base">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs md:text-base truncate max-w-[80px] md:max-w-full">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <div className="flex items-center">
                              <div className="w-10 md:w-16 h-2 bg-gray-200 rounded-full mr-1 md:mr-2 hidden sm:block">
                                <div
                                  className="h-full bg-gray-600 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (user.best_score / 100) * 100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs md:text-base">{user.best_score}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <div className="flex items-center">
                              <span className="font-medium mr-1 md:mr-2 text-xs md:text-base">{Math.round(user.average_score)}</span>
                              <div className="w-10 md:w-24 bg-gray-200 rounded-full h-1.5 hidden sm:block">
                                <div 
                                  className="bg-[#078F65] h-1.5 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.round(user.average_score))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}