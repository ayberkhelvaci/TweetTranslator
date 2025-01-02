import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-config';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateUUID } from '@/lib/utils';

// Admin user IDs that are allowed to access the dashboard
const ADMIN_IDS = ['f265c610-3958-8a1a-3d27-d14967f27a0e']; // Your user ID

interface TweetStats {
  total: number;
  posted: number;
  failed: number;
  pending_auto: number;
  queued: number;
  [key: string]: number;
}

async function fetchDashboardStats() {
  // Get total users
  const { count: totalUsers } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Get total configurations
  const { count: totalConfigs } = await supabaseAdmin
    .from('config')
    .select('*', { count: 'exact', head: true });

  // Get tweet statistics
  const { data: tweetStats } = await supabaseAdmin
    .from('tweets')
    .select('status')
    .not('status', 'is', null);

  // Calculate tweet statistics
  const stats = tweetStats?.reduce((acc: TweetStats, tweet: { status: string }) => {
    acc.total++;
    acc[tweet.status] = (acc[tweet.status] || 0) + 1;
    return acc;
  }, { total: 0, posted: 0, failed: 0, pending_auto: 0, queued: 0 });

  return {
    totalUsers: totalUsers || 0,
    totalConfigs: totalConfigs || 0,
    tweetStats: stats || { total: 0, posted: 0, failed: 0, pending_auto: 0, queued: 0 }
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const userUUID = generateUUID(session.user.id);
  if (!ADMIN_IDS.includes(userUUID)) {
    redirect('/');
  }

  const stats = await fetchDashboardStats();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Total Users</h2>
          <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
        </div>

        {/* Configurations Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Active Configurations</h2>
          <p className="text-3xl font-bold mt-2">{stats.totalConfigs}</p>
        </div>

        {/* Tweets Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Total Tweets</h2>
          <p className="text-3xl font-bold mt-2">{stats.tweetStats.total}</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Posted:</span>
              <span className="font-medium">{stats.tweetStats.posted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Failed:</span>
              <span className="font-medium">{stats.tweetStats.failed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Queued:</span>
              <span className="font-medium">{stats.tweetStats.queued}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pending:</span>
              <span className="font-medium">{stats.tweetStats.pending_auto}</span>
            </div>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Success Rate</h2>
          <p className="text-3xl font-bold mt-2">
            {stats.tweetStats.total > 0
              ? Math.round((stats.tweetStats.posted / stats.tweetStats.total) * 100)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
} 