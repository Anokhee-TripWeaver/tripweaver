import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, Circle, Package } from 'lucide-react';
import API_BASE from '../config';

const PackingChecklist = ({ bookingId, destination }) => {
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (bookingId) {
            fetchChecklist();
        }
    }, [bookingId]);

    const fetchChecklist = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/checklist/${bookingId}`, {
                withCredentials: true
            });
            setChecklist(response.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch checklist:', err);
            setError('Failed to load packing checklist');
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = async (itemId) => {
        try {
            const response = await axios.put(
                `${API_BASE}/checklist/${itemId}/toggle`,
                {},
                { withCredentials: true }
            );
            
            // Update local state
            setChecklist(prev => 
                prev.map(item => 
                    item.id === itemId ? response.data : item
                )
            );
        } catch (err) {
            console.error('Failed to toggle item:', err);
        }
    };

    const generateChecklist = async () => {
        if (!destination) {
            setError('Destination is required to generate checklist');
            return;
        }

        try {
            setGenerating(true);
            const response = await axios.post(
                `${API_BASE}/checklist/generate/${bookingId}?destination=${encodeURIComponent(destination)}`,
                {},
                { withCredentials: true }
            );
            setChecklist(response.data);
            setError('');
        } catch (err) {
            console.error('Failed to generate checklist:', err);
            setError('Failed to generate packing checklist');
        } finally {
            setGenerating(false);
        }
    };

    const getProgress = () => {
        if (checklist.length === 0) return 0;
        const checked = checklist.filter(item => item.isChecked).length;
        return Math.round((checked / checklist.length) * 100);
    };

    const getCheckedCount = () => {
        return checklist.filter(item => item.isChecked).length;
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
            </div>
        );
    }

    if (checklist.length === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">No Packing Checklist Yet</h3>
                <p className="text-gray-600 mb-4">
                    This booking was created before the packing checklist feature was added.
                </p>
                <button
                    onClick={generateChecklist}
                    disabled={generating || !destination}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? 'Generating...' : 'Generate Checklist Now'}
                </button>
                <p className="text-sm text-gray-500 mt-4">
                    💡 New bookings will automatically get a destination-specific packing checklist!
                </p>
            </div>
        );
    }

    const progress = getProgress();
    const checkedCount = getCheckedCount();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Packing Checklist</h3>
                        <p className="text-sm text-gray-500">
                            {checkedCount} of {checklist.length} items packed
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-bold text-purple-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {checklist.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            item.isChecked
                                ? 'bg-purple-50 border-purple-300 hover:bg-purple-100'
                                : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }`}
                    >
                        {item.isChecked ? (
                            <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0" />
                        ) : (
                            <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        )}
                        <span
                            className={`flex-1 ${
                                item.isChecked
                                    ? 'text-gray-500 line-through'
                                    : 'text-gray-800 font-medium'
                            }`}
                        >
                            {item.itemName}
                        </span>
                    </div>
                ))}
            </div>

            {/* Completion Message */}
            {progress === 100 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <p className="text-center text-green-700 font-semibold">
                        🎉 All packed! You're ready for your trip!
                    </p>
                </div>
            )}
        </div>
    );
};

export default PackingChecklist;
