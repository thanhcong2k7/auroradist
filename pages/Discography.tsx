import React from 'react';
import { MOCK_RELEASES } from '../constants';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Discography: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black uppercase mb-1">Discography</h1>
          <p className="text-gray-400 font-mono text-sm">Manage your releases and metadata.</p>
        </div>
        <Link to="/discography/new" className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm">
          <Plus size={16} /> New Release
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
                type="text" 
                placeholder="SEARCH ARCHIVES..." 
                className="w-full bg-surface border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition font-mono placeholder-gray-700"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MOCK_RELEASES.map((release) => (
            <div key={release.id} className="group bg-surface border border-white/10 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-300">
                <div className="aspect-square relative overflow-hidden bg-black">
                    {release.coverArt ? (
                        <img src={release.coverArt} alt={release.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 font-mono text-xs border border-white/5 m-4 rounded">NO_SIGNAL</div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {release.status !== 'CHECKING' && (
                            <Link 
                                to={`/discography/edit/${release.id}`}
                                className="p-1.5 bg-black/80 text-white hover:text-blue-400 rounded backdrop-blur-sm border border-white/10"
                            >
                                <Edit2 size={14} />
                            </Link>
                        )}
                        <button className="p-1.5 bg-black/80 text-white hover:text-red-400 rounded backdrop-blur-sm border border-white/10">
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="absolute top-2 left-2">
                         <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border backdrop-blur-md ${
                            release.status === 'ACCEPTED' ? 'border-green-500/30 text-green-400 bg-green-900/50' :
                            release.status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-900/50' :
                            'border-gray-500/30 text-gray-300 bg-gray-900/50'
                        }`}>
                            {release.status}
                        </span>
                    </div>
                </div>
                
                <div className="p-4">
                    <h3 className="font-bold text-lg leading-tight truncate mb-1">{release.title}</h3>
                    <div className="flex justify-between items-end">
                        <div>
                             <p className="text-gray-400 text-xs font-mono">{release.artist}</p>
                             <p className="text-gray-600 text-[10px] font-mono mt-1">UPC: {release.upc || 'PENDING'}</p>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            {release.releaseDate || 'TBA'}
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Discography;