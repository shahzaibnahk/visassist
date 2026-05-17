import { useState } from 'react';
import { Users, CheckCircle, Clock } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('month');

  const applicationTrends = [
    { month: 'Aug', applications: 120, approved: 95, rejected: 15 },
    { month: 'Sep', applications: 145, approved: 118, rejected: 18 },
    { month: 'Oct', applications: 168, approved: 142, rejected: 16 },
    { month: 'Nov', applications: 192, approved: 165, rejected: 19 },
    { month: 'Dec', applications: 234, approved: 198, rejected: 24 },
  ];

  const countryDistribution = [
    { country: 'USA', count: 567, percentage: 28 },
    { country: 'Canada', count: 432, percentage: 21 },
    { country: 'UK', count: 389, percentage: 19 },
    { country: 'Australia', count: 312, percentage: 15 },
    { country: 'Germany', count: 245, percentage: 12 },
    { country: 'Others', count: 133, percentage: 5 },
  ];

  const visaTypeDistribution = [
    { type: 'Tourist', count: 1234, percentage: 45 },
    { type: 'Student', count: 892, percentage: 32 },
    { type: 'Work', count: 456, percentage: 16 },
    { type: 'Business', count: 196, percentage: 7 },
  ];

  return (
    <div>
      {/* Time Range Filter */}
      <div className="mb-8 flex justify-end">
        <div className="flex gap-2">
            {['week', 'month', 'year'].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? 'primary' : 'outline'}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Application Trends Chart */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Application Trends</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {applicationTrends.map((trend, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-gray-600">{trend.month}</div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <div
                        className="bg-blue-500 h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                        style={{ width: `${(trend.applications / 250) * 100}%` }}
                      >
                        {trend.applications}
                      </div>
                      <div
                        className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                        style={{ width: `${(trend.approved / 250) * 100}%` }}
                      >
                        {trend.approved}
                      </div>
                      <div
                        className="bg-red-500 h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                        style={{ width: `${(trend.rejected / 250) * 100}%` }}
                      >
                        {trend.rejected}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Total Applications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Rejected</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Country Distribution */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Top Countries</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {countryDistribution.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.country}</span>
                      <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage * 3.5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Visa Type Distribution */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Visa Types</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {visaTypeDistribution.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.type}</span>
                      <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${item.percentage * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 mb-1">Average Processing Time</p>
                  <p className="text-3xl font-bold">12 days</p>
                </div>
                <Clock size={40} className="opacity-80" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 mb-1">Approval Rate</p>
                  <p className="text-3xl font-bold">86%</p>
                </div>
                <CheckCircle size={40} className="opacity-80" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 mb-1">Active Users</p>
                  <p className="text-3xl font-bold">892</p>
                </div>
                <Users size={40} className="opacity-80" />
              </div>
            </CardBody>
          </Card>
        </div>
    </div>
  );
}
