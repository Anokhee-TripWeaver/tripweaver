import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, MapPin, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnimatedHero = () => {
  const navigate = useNavigate();
  const [currentDestination, setCurrentDestination] = useState(0);

  // Version timestamp to force cache refresh
  const VERSION = '2026-03-01-v2';

  const destinations = [
    {
      name: 'Paris',
      country: 'France',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
      color: 'from-blue-400/40 to-purple-400/40',
      position: { x: '45%', y: '35%' }
    },
    {
      name: 'Tokyo',
      country: 'Japan',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80',
      color: 'from-pink-400/40 to-orange-400/40',
      position: { x: '75%', y: '40%' }
    },
    {
      name: 'New York',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=80',
      color: 'from-blue-500/50 to-purple-500/50',
      position: { x: '25%', y: '45%' }
    },
    {
      name: 'Bali',
      country: 'Indonesia',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=80',
      color: 'from-orange-400/40 to-pink-400/40',
      position: { x: '70%', y: '55%' }
    },
    {
      name: 'Bangalore',
      country: 'India',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1920&q=80',
      color: 'from-teal-400/40 to-green-400/40',
      position: { x: '60%', y: '50%' }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDestination((prev) => (prev + 1) % destinations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const current = destinations[currentDestination];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      {/* Animated Background Images */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentDestination}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={current.image}
            alt={current.name}
            className="w-full h-full object-cover brightness-100"
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${current.color} opacity-30`}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </motion.div>
      </AnimatePresence>

      {/* Rotating Globe Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="w-[800px] h-[800px] opacity-5"
        >
          <Globe className="w-full h-full text-white" strokeWidth={0.5} />
        </motion.div>
      </div>

      {/* Animated Location Pins */}
      <AnimatePresence>
        {destinations.map((dest, index) => (
          <motion.div
            key={dest.name}
            initial={{ opacity: 0, scale: 0, y: -20 }}
            animate={{
              opacity: index === currentDestination ? 1 : 0.3,
              scale: index === currentDestination ? 1.2 : 0.8,
              y: 0
            }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="absolute z-10 pointer-events-none"
            style={{ left: dest.position.x, top: dest.position.y }}
          >
            <motion.div
              animate={{
                y: [0, -10, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <MapPin
                className={`w-8 h-8 ${
                  index === currentDestination ? 'text-orange-400' : 'text-white/60'
                } drop-shadow-lg`}
                fill={index === currentDestination ? 'currentColor' : 'none'}
              />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Animated Airplane Path */}
      <motion.div
        animate={{
          x: ['0%', '100%'],
          y: ['60%', '40%']
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear'
        }}
        className="absolute top-0 left-0 z-10 pointer-events-none"
      >
        <motion.div
          animate={{ rotate: [0, 5, 0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Plane className="w-6 h-6 text-white/40 drop-shadow-lg" />
        </motion.div>
      </motion.div>

      {/* Hero Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/25 backdrop-blur-md border border-white/40 rounded-full mb-8 shadow-lg">
            <Globe className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-medium">Explore the World</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight drop-shadow-2xl"
        >
          Discover Your Next
          <br />
          <span className="bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200 bg-clip-text text-transparent drop-shadow-lg">
            Adventure
          </span>
        </motion.h1>

        {/* Animated Destination Name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDestination}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-full">
              <MapPin className="w-5 h-5 text-orange-300" />
              <span className="text-2xl font-bold text-white">
                {current.name}, {current.country}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl md:text-2xl text-white mb-14 max-w-3xl mx-auto leading-relaxed drop-shadow-lg font-medium"
        >
          Create unforgettable memories with personalized travel experiences.
          Explore the world's most beautiful destinations with ease.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex items-center justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/planner')}
            className="group px-12 py-5 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 cursor-pointer"
          >
            <Plane className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            Plan Your Trip
          </motion.button>
        </motion.div>

        {/* Destination Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-3 mt-12"
        >
          {destinations.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentDestination(index)}
              className="group relative"
            >
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentDestination
                    ? 'bg-white w-8'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-3 bg-white/60 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default AnimatedHero;
