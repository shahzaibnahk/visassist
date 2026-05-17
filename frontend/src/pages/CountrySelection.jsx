import { useState } from 'react';
import { Search, MapPin, ArrowRight, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Card, { CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { COUNTRIES, VISA_TYPES } from '../utils/constants';

export default function CountrySelection() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisaType, setSelectedVisaType] = useState('all');
  const [showPopularOnly, setShowPopularOnly] = useState(false);

  const filteredCountries = COUNTRIES.filter((country) => {
    const matchesSearch = country.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPopular = !showPopularOnly || country.popular;
    return matchesSearch && matchesPopular;
  });

  const popularCountries = COUNTRIES.filter((c) => c.popular);

  const handleStartApplication = (country) => {
    navigate('/application/new', {
      state: {
        country: country.name,
        countryCode: country.code,
        visaType: 'Tourist Visa', // Default, can be changed in form
      },
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Select Your Destination
          </h1>
          <p className="text-xl text-gray-600">
            Choose from over 100 countries and start your visa application journey
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                icon={Search}
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPopularOnly}
                  onChange={(e) => setShowPopularOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Popular only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Popular Countries */}
        {!searchQuery && !showPopularOnly && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Popular Destinations</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {popularCountries.map((country) => (
                <div
                  key={country.code}
                  onClick={() => handleStartApplication(country)}
                  className="group cursor-pointer"
                >
                  <Card hover className="text-center">
                    <CardBody className="py-6">
                      <div className="text-5xl mb-3">{country.flag}</div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {country.name}
                      </h3>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Countries */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            All Countries ({filteredCountries.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCountries.map((country) => (
              <Card key={country.code} hover>
                <CardBody>
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{country.flag}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{country.name}</h3>
                        {country.popular && (
                          <Badge variant="primary" className="ml-2">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <MapPin size={14} className="mr-1" />
                        {country.code}
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-700 font-medium">Available Visa Types:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(VISA_TYPES).slice(0, 3).map((type) => (
                            <Badge key={type} variant="default" className="text-xs">
                              {VISA_TYPES[type]}
                            </Badge>
                          ))}
                          <Badge variant="default" className="text-xs">
                            +3 more
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
                <CardFooter className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Processing: <span className="font-semibold text-gray-900">10-15 days</span>
                  </div>
                  <Button size="sm" onClick={() => handleStartApplication(country)}>
                    Apply Now <ArrowRight size={16} className="ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredCountries.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No countries found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help Choosing?</h3>
              <p className="text-gray-700 mb-4">
                Our AI assistant can help you find the best visa type based on your travel purpose,
                duration, and personal circumstances.
              </p>
              <Button size="sm" variant="primary">
                Chat with AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
