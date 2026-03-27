import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Tag, Navigation } from 'lucide-react';
import API_BASE from '../config';

const LocalExperiences = ({ destination }) => {
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (destination) {
            fetchExperiences();
        }
    }, [destination]);

    const fetchExperiences = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE}/experiences/${destination}`,
                { withCredentials: true }
            );
            setExperiences(response.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch experiences:', err);
            setError('Failed to load local attractions');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            'SIGHTS': 'bg-blue-100 text-blue-700',
            'BEACH': 'bg-cyan-100 text-cyan-700',
            'RESTAURANT': 'bg-orange-100 text-orange-700',
            'NIGHTLIFE': 'bg-purple-100 text-purple-700',
            'SHOPPING': 'bg-pink-100 text-pink-700',
            'HISTORICAL': 'bg-amber-100 text-amber-700',
            'MUSEUM': 'bg-indigo-100 text-indigo-700',
            'TEMPLE': 'bg-red-100 text-red-700',
            'LANDMARK': 'bg-green-100 text-green-700',
            'BEACH_ACTIVITY': 'bg-teal-100 text-teal-700'
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'SIGHTS': '🏛️',
            'BEACH': '🏖️',
            'RESTAURANT': '🍽️',
            'NIGHTLIFE': '🌃',
            'SHOPPING': '🛍️',
            'HISTORICAL': '🏰',
            'MUSEUM': '🎨',
            'TEMPLE': '⛩️',
            'LANDMARK': '🗼',
            'BEACH_ACTIVITY': '🏄'
        };
        return icons[category] || '📍';
    };

    if (loading) {
        return (
            <div className="mt-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Local Attractions & Points of Interest</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-gray-200 h-40 rounded-2xl"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700">{error}</p>
            </div>
        );
    }

    if (experiences.length === 0) {
        return (
            <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Attractions Found</h3>
                <p className="text-gray-600">
                    We couldn't find attractions for {destination}. Try exploring nearby areas!
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    Local Attractions & Points of Interest
                </h3>
                <p className="text-gray-600">Discover the best places to visit in {destination}</p>
            </div>

            {/* Attractions Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experiences.map((experience, index) => (
                    <div
                        key={experience.id || index}
                        className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2 border border-gray-100"
                    >
                        <div className="p-6">
                            {/* Category Badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(experience.category)}`}>
                                    {getCategoryIcon(experience.category)} {experience.category || 'ATTRACTION'}
                                </span>
                                {experience.rank && (
                                    <span className="text-xs font-bold text-purple-600">
                                        #{experience.rank}
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h4 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors min-h-[3.5rem]">
                                {experience.title}
                            </h4>

                            {/* Location Info */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                    <span className="line-clamp-1">
                                        {experience.latitude?.toFixed(4)}, {experience.longitude?.toFixed(4)}
                                    </span>
                                </div>

                                {/* Tags */}
                                {experience.tags && experience.tags.length > 0 && (
                                    <div className="flex items-start gap-2">
                                        <Tag className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex flex-wrap gap-1">
                                            {experience.tags.slice(0, 3).map((tag, idx) => (
                                                <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${experience.latitude},${experience.longitude}`, '_blank')}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Navigation className="w-4 h-4" />
                                    View on Map
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Footer */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800 text-center">
                    ℹ️ Attractions powered by Amadeus Points of Interest API - Real-time data
                </p>
            </div>
        </div>
    );
};

export default LocalExperiences;
