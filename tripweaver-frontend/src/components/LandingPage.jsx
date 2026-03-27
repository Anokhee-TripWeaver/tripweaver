import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, MapPin, Calendar, Users, Heart, Compass } from 'lucide-react';
import AnimatedHero from './AnimatedHero';
import axios from 'axios';
import API_BASE from '../config';

const LandingPage = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch popular destinations on mount
  useEffect(() => {
    fetchPopularDestinations();
  }, []);

  const fetchPopularDestinations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/destination/popular`);
      const popularDests = response.data;

      // Map to include color gradients
      const colors = [
        'from-orange-400 to-pink-500',
        'from-blue-400 to-cyan-500',
        'from-purple-400 to-pink-500',
        'from-indigo-400 to-purple-500'
      ];

      const mappedDestinations = popularDests.map((dest, index) => ({
        name: dest.destinationName,
        image: dest.imageUrl,
        bookingCount: dest.bookingCount,
        color: colors[index % colors.length]
      }));

      setDestinations(mappedDestinations);
    } catch (error) {
      console.error('Failed to fetch popular destinations:', error);
      // Fallback to default destinations
      setDestinations([
        { name: 'Bali, Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', color: 'from-orange-400 to-pink-500', bookingCount: 0 },
        { name: 'Santorini, Greece', image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80', color: 'from-blue-400 to-cyan-500', bookingCount: 0 },
        { name: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', color: 'from-purple-400 to-pink-500', bookingCount: 0 },
        { name: 'Paris, France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', color: 'from-indigo-400 to-purple-500', bookingCount: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Animated Hero Section */}
      <AnimatedHero />

      {/* Popular Destinations Section */}
      <section id="destinations" className="py-24 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-5 py-2 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full mb-4">
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                EXPLORE THE WORLD
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-teal-500 to-purple-600 bg-clip-text text-transparent mb-4">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Handpicked locations that will take your breath away
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeleton
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-3xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
              ))
            ) : (
              destinations.map((dest, index) => (
                <div 
                  key={index}
                  onClick={() => navigate('/search')}
                  className="group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 cursor-pointer"
                >
                  <div className="aspect-[3/4] relative">
                    <img 
                      src={dest.image} 
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-105 saturate-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${dest.color} opacity-40 group-hover:opacity-50 transition-opacity duration-300`}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 transform group-hover:translate-y-0 transition-transform">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-white" />
                        <span className="text-white/90 text-sm font-medium">Trending</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{dest.name}</h3>
                      {dest.bookingCount > 0 && (
                        <p className="text-white/80 text-xs mb-2">{dest.bookingCount} bookings</p>
                      )}
                      <button className="text-white text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                        Explore Now
                        <span className="text-lg">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Why Choose TripWeaver Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-5 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4">
              <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                WHY CHOOSE US
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-4">
              Travel Made Simple
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for the perfect journey, all in one place
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div 
              onClick={() => navigate('/planner')}
              className="group p-10 rounded-3xl bg-gradient-to-br from-blue-500 to-teal-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Smart Planning</h3>
              <p className="text-white/90 leading-relaxed">
                Intelligent itineraries that adapt to your schedule and preferences
              </p>
            </div>

            <div 
              onClick={() => navigate('/wishlist')}
              className="group p-10 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Personalized</h3>
              <p className="text-white/90 leading-relaxed">
                Recommendations tailored to your unique travel style and interests
              </p>
            </div>

            <div 
              onClick={() => navigate('/search')}
              className="group p-10 rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Local Insights</h3>
              <p className="text-white/90 leading-relaxed">
                Discover hidden gems and authentic experiences off the beaten path
              </p>
            </div>

            <div 
              onClick={() => navigate('/open-trips')}
              className="group p-10 rounded-3xl bg-gradient-to-br from-teal-500 to-blue-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Community</h3>
              <p className="text-white/90 leading-relaxed">
                Join thousands of travelers sharing tips and experiences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-5 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-4 shadow-sm">
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SIMPLE PROCESS
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start your journey in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Lines */}
            <div className="hidden md:block absolute top-28 left-[25%] w-[20%] h-0.5 bg-gradient-to-r from-blue-300 to-purple-300"></div>
            <div className="hidden md:block absolute top-28 right-[25%] w-[20%] h-0.5 bg-gradient-to-r from-purple-300 to-pink-300"></div>
            
            <div className="relative">
              <div className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg mx-auto relative">
                  <span className="text-3xl font-bold text-white">1</span>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-teal-500 rounded-3xl blur opacity-30"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Choose Destination</h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  Pick your dream location from our curated list of amazing destinations worldwide
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg mx-auto relative">
                  <span className="text-3xl font-bold text-white">2</span>
                  <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur opacity-30"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Set Preferences</h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  Tell us your travel dates, budget, and interests to personalize your experience
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg mx-auto relative">
                  <span className="text-3xl font-bold text-white">3</span>
                  <div className="absolute -inset-1 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl blur opacity-30"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Start Exploring</h3>
                <p className="text-gray-600 leading-relaxed text-center">
                  Get your custom itinerary and embark on an unforgettable adventure
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to Explore
            <br />
            the World?
          </h2>
          <p className="text-xl md:text-2xl text-white/95 mb-12 leading-relaxed">
            Start planning your dream vacation today. Create your personalized itinerary in minutes.
          </p>
          
          <button 
            onClick={() => navigate('/signup')}
            className="group px-14 py-6 bg-white text-purple-600 rounded-full font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
          >
            <Plane className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            Plan Your First Trip
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* FAQ Section */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="bg-gray-800/50 rounded-2xl p-6 hover:bg-gray-800 transition">
                <h4 className="text-lg font-bold text-white mb-3">What is TripWeaver?</h4>
                <p className="text-gray-400 leading-relaxed">
                  TripWeaver is a smart travel planning platform that helps you discover destinations and create personalized travel experiences in minutes.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 hover:bg-gray-800 transition">
                <h4 className="text-lg font-bold text-white mb-3">How does TripWeaver help me plan my trip?</h4>
                <p className="text-gray-400 leading-relaxed">
                  You can explore destinations, organize your itinerary, manage trips, and plan your journey step-by-step through a simple interface.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 hover:bg-gray-800 transition">
                <h4 className="text-lg font-bold text-white mb-3">Do I need an account to start planning?</h4>
                <p className="text-gray-400 leading-relaxed">
                  You can explore destinations freely. However, creating an account allows you to save trips and access personalized features.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 hover:bg-gray-800 transition">
                <h4 className="text-lg font-bold text-white mb-3">Is TripWeaver free to use?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Yes, TripWeaver is free to explore and plan trips. Some advanced features may be introduced in future updates.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TripWeaver</span>
              </div>
              <div className="flex gap-8 text-sm mb-4 md:mb-0">
                <a href="#" className="hover:text-orange-400 transition">Privacy Policy</a>
                <a href="#" className="hover:text-orange-400 transition">Terms of Service</a>
                <a href="#" className="hover:text-orange-400 transition">Contact</a>
              </div>
            </div>
            <div className="text-center mt-6 text-sm text-gray-500">
              © 2026 TripWeaver. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
