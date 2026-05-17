import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  FileText,
  MessageSquare,
  CheckCircle,
  Users,
  Award,
  Shield,
  Zap,
  Star,
  Phone
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const features = [
    {
      icon: Globe,
      title: 'Multiple Countries',
      description: 'Access visa information for 100+ countries worldwide',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: FileText,
      title: 'Easy Applications',
      description: 'Streamlined process with step-by-step guidance',
      color: 'text-green-600 bg-green-50',
    },
    {
      icon: MessageSquare,
      title: 'AI Assistant',
      description: '24/7 AI-powered support for all your queries',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      icon: CheckCircle,
      title: 'Track Progress',
      description: 'Real-time updates on your application status',
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      icon: Shield,
      title: 'Secure & Safe',
      description: 'Your data is protected with enterprise-level security',
      color: 'text-red-600 bg-red-50',
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Get your visa application processed quickly',
      color: 'text-indigo-600 bg-indigo-50',
    },
  ];

  const stats = [
    { label: 'Countries Covered', value: '100+', icon: Globe },
    { label: 'Applications Processed', value: '50K+', icon: FileText },
    { label: 'Success Rate', value: '98%', icon: Award },
    { label: 'Happy Customers', value: '25K+', icon: Users },
  ];

  const steps = [
    {
      number: '01',
      title: 'Select Country',
      description: 'Choose your destination country and visa type',
    },
    {
      number: '02',
      title: 'Fill Application',
      description: 'Complete the form with our AI-powered assistance',
    },
    {
      number: '03',
      title: 'Submit Documents',
      description: 'Upload required documents securely',
    },
    {
      number: '04',
      title: 'Track Status',
      description: 'Monitor your application progress in real-time',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      country: 'USA',
      rating: 5,
      text: 'VissaAssist made my UK visa application incredibly easy. The AI assistant was super helpful!',
      avatar: '👩',
    },
    {
      name: 'Ahmed Khan',
      country: 'Pakistan',
      rating: 5,
      text: 'Best visa service I have used. Got my Canadian student visa approved in just 3 weeks!',
      avatar: '👨',
    },
    {
      name: 'Maria Garcia',
      country: 'Spain',
      rating: 5,
      text: 'Professional, fast, and reliable. Highly recommend for anyone applying for visas.',
      avatar: '👩',
    },
  ];

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in">
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Visa Journey
                <br />
                <span className="text-blue-200">Made Simple</span>
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Apply for visas to 100+ countries with AI-powered assistance. Fast, secure, and
                hassle-free visa applications at your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <>
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => navigate('/dashboard')}>
                      Go to Dashboard <ArrowRight className="ml-2" size={20} />
                    </Button>
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => navigate('/countries')}>
                      Browse Countries
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" className="border-white text-white hover:bg-white hover:text-blue-600" onClick={() => navigate('/signup')}>
                      Get Started Free <ArrowRight className="ml-2" size={20} />
                    </Button>
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600" onClick={() => navigate('/login')}>
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-white bg-opacity-10 rounded-3xl blur-xl"></div>
                <div className="relative bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
                  <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat, idx) => (
                      <div key={idx} className="text-center p-4 bg-white bg-opacity-10 rounded-xl">
                        <stat.icon className="mx-auto mb-2" size={32} />
                        <div className="text-3xl font-bold">{stat.value}</div>
                        <div className="text-sm text-blue-100">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose VissaAssist?
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for a successful visa application
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} hover className="text-center">
                <CardBody>
                  <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to your visa success
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-blue-200 -translate-x-1/4"></div>
                )}
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <span className="text-4xl font-bold text-white">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied customers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} hover>
                <CardBody>
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="text-yellow-400 fill-current" size={20} />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">&quot;{testimonial.text}&quot;</p>
                  <div className="flex items-center">
                    <div className="text-4xl mr-3">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.country}</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Voice Agent CTA */}
      {!isAuthenticated && (
        <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 border-y border-blue-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
            <div className="relative mb-8">
              <div className="absolute -inset-4 bg-blue-400 bg-opacity-20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl">
                <Phone size={36} fill="currentColor" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Talk to Our AI Voice Agent
            </h2>
            <p className="text-xl text-gray-700 mb-10 max-w-2xl">
              Don't want to chat? Just make a call! Speak directly to our incredibly smart AI Voice Expert for instant, human-like answers regarding any visa requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg" onClick={() => navigate('/signup')}>
                Sign Up to Call <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button size="lg" variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-100 shadow-sm bg-white" onClick={() => navigate('/login')}>
                Log In
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to Start Your Visa Journey?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of successful applicants and get your visa approved faster
          </p>
          {isAuthenticated ? (
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => navigate('/countries')}>
              Browse Countries <ArrowRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button size="lg" className="border-white text-white hover:bg-white hover:text-blue-600" onClick={() => navigate('/signup')}>
              Create Free Account <ArrowRight className="ml-2" size={20} />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
