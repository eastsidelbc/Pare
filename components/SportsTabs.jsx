import React from 'react';

const SportsTabs = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex justify-center w-full mb-8">
            <div className="flex bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-blue-400/20 shadow-lg">
                <button
                    onClick={() => onTabChange('NBA')}
                    className={`relative px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-200 ${activeTab === 'NBA'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    {/* Active Tab Indicator */}
                    {activeTab === 'NBA' && (
                        <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/90 to-emerald-600/90 rounded-lg shadow-lg animate-fadeIn"></span>
                    )}
                    <span className="relative flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M17 20.5C15 19.5 12 19 12 19C12 19 9 19.5 7 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M17 3.5C15 4.5 12 5 12 5C12 5 9 4.5 7 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        NBA
                    </span>
                </button>
                <button
                    onClick={() => onTabChange('NFL')}
                    className={`relative px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-200 ${activeTab === 'NFL'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    {/* Active Tab Indicator */}
                    {activeTab === 'NFL' && (
                        <span className="absolute inset-0 bg-gradient-to-r from-purple-500/90 to-purple-600/90 rounded-lg shadow-lg animate-fadeIn"></span>
                    )}
                    <span className="relative flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.9498 20.5C16.9498 20.5 17.8998 15.5 11.9498 9.5C5.99976 3.5 0.999756 4.5 0.999756 4.5C0.999756 4.5 -0.000244141 9.5 5.94976 15.5C11.8998 21.5 16.9498 20.5 16.9498 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14.5 13C15.3284 13 16 12.3284 16 11.5C16 10.6716 15.3284 10 14.5 10C13.6716 10 13 10.6716 13 11.5C13 12.3284 13.6716 13 14.5 13Z" fill="currentColor" />
                            <path d="M19.5 7L15.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 15L21 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        NFL
                    </span>
                </button>
            </div>
        </div>
    );
};

export default SportsTabs;